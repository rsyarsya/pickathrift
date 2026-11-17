const { createClient } = require("@supabase/supabase-js");
const { ApiError } = require("../lib/errors");
const { AbortSignal } = globalThis;
const clients = new WeakMap();
const unavailable = () =>
  new ApiError(503, "STORAGE_UNAVAILABLE", "Penyimpanan gambar tidak tersedia. Coba lagi.");
const missing = () => new ApiError(404, "FILE_UNAVAILABLE", "Gambar tidak dapat dibaca.");

function client(settings) {
  if (!clients.has(settings))
    clients.set(
      settings,
      createClient(settings.url, settings.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          fetch: (url, init) =>
            fetch(url, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
                : AbortSignal.timeout(15000),
            }),
        },
      }),
    );
  return clients.get(settings);
}

async function assertReady(settings) {
  const { data, error } = await client(settings).storage.getBucket(settings.bucket);
  if (error || !data || data.public !== false) throw unavailable();
}

async function save(settings, key, buffer, mime) {
  const { error } = await client(settings)
    .storage.from(settings.bucket)
    .upload(key, buffer, { contentType: mime, upsert: false });
  if (error) throw unavailable();
}

async function read(settings, key) {
  const { data, error } = await client(settings).storage.from(settings.bucket).download(key);
  if (error) {
    if (String(error.statusCode) === "404" || error.message === "Object not found") throw missing();
    throw unavailable();
  }
  return Buffer.from(await data.arrayBuffer());
}

async function remove(settings, key) {
  const { error } = await client(settings).storage.from(settings.bucket).remove([key]);
  if (error) throw unavailable();
}

module.exports = { assertReady, save, read, remove };
