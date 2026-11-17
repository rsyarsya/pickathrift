const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const { ApiError } = require("../lib/errors");
const root = (config) => path.resolve(config.uploadDir ?? path.join(__dirname, "../uploads"));
const filePath = (config, kind, name) => path.join(root(config), kind, name);
const cloud = (config) => config.storage?.provider === "supabase";
function imageKey(kind, name) {
  if (!["products", "proofs"].includes(kind) || !/^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png)$/i.test(name))
    throw new ApiError(404, "FILE_UNAVAILABLE", "Gambar tidak dapat dibaca.");
  return `${kind}/${name}`;
}
async function assertStorageReady(config) {
  if (cloud(config)) await require("./supabase-storage").assertReady(config.storage);
}
async function readImage(config, kind, name) {
  const key = imageKey(kind, name);
  if (cloud(config)) return require("./supabase-storage").read(config.storage, key);
  try {
    return await fs.readFile(filePath(config, kind, name));
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code))
      throw new ApiError(404, "FILE_UNAVAILABLE", "Gambar tidak dapat dibaca.");
    throw error;
  }
}
async function saveImage(config, kind, file) {
  if (!file || !file.size || file.size > 2 * 1024 * 1024)
    throw new ApiError(422, "INVALID_FILE", "Gunakan JPG/PNG maksimal 2 MB.");
  let buffer, format;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 20000000, failOn: "warning" });
    const metadata = await image.metadata();
    format = metadata.format;
    if (
      !["jpeg", "png"].includes(format) ||
      (metadata.pages ?? 1) !== 1 ||
      file.mimetype !== "image/" + format
    )
      throw Error("Format gambar salah");
    buffer = await image.rotate().toFormat(format).toBuffer();
  } catch {
    throw new ApiError(422, "INVALID_FILE", "Isi gambar JPG/PNG tidak valid.");
  }
  const filename = randomUUID() + (format === "jpeg" ? ".jpg" : ".png");
  if (cloud(config)) {
    await require("./supabase-storage").save(
      config.storage,
      imageKey(kind, filename),
      buffer,
      "image/" + format,
    );
  } else {
    await fs.mkdir(path.join(root(config), kind), { recursive: true });
    try {
      await fs.writeFile(filePath(config, kind, filename), buffer, { flag: "wx" });
    } catch (error) {
      await fs.unlink(filePath(config, kind, filename)).catch(() => {});
      throw error;
    }
  }
  return {
    filename,
    mime: "image/" + format,
    size: file.size,
    name: path.basename(file.originalname.replaceAll("\\", "/")).slice(0, 255),
  };
}
async function removeImage(config, kind, filename) {
  if (filename && cloud(config))
    return require("./supabase-storage").remove(config.storage, imageKey(kind, filename));
  if (filename) await fs.unlink(filePath(config, kind, filename)).catch(() => {});
}
async function proofAvailable(config, filename) {
  if (cloud(config)) {
    try {
      return (await readImage(config, "proofs", filename)).length > 0;
    } catch (error) {
      if (error.status === 404) return false;
      throw error;
    }
  }
  try {
    const target = filePath(config, "proofs", filename);
    const handle = await fs.open(target, "r");
    try {
      const stat = await handle.stat();
      return stat.isFile() && stat.size > 0;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}
module.exports = {
  root,
  filePath,
  saveImage,
  removeImage,
  proofAvailable,
  readImage,
  cloud,
  assertStorageReady,
};
