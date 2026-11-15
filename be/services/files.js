const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const { ApiError } = require("../lib/errors");
const root = (config) => path.resolve(config.uploadDir ?? path.join(__dirname, "../uploads"));
const filePath = (config, kind, name) => path.join(root(config), kind, name);
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
  await fs.mkdir(path.join(root(config), kind), { recursive: true });
  try {
    await fs.writeFile(filePath(config, kind, filename), buffer, { flag: "wx" });
  } catch (error) {
    await fs.unlink(filePath(config, kind, filename)).catch(() => {});
    throw error;
  }
  return {
    filename,
    mime: "image/" + format,
    size: file.size,
    name: path.basename(file.originalname.replaceAll("\\", "/")).slice(0, 255),
  };
}
async function removeImage(config, kind, filename) {
  if (filename) await fs.unlink(filePath(config, kind, filename)).catch(() => {});
}
module.exports = { root, filePath, saveImage, removeImage };
