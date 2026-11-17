const express = require("express");
const { attachRuntime } = require("./services/serverless");
const { getConfig } = require("./config");
// Export a real Express app; connect lazily, not when the build imports this file.
const app = express();
app.disable("x-powered-by");
attachRuntime(app, () => {
  const config = getConfig();
  if (process.env.VERCEL && config.storage.provider !== "supabase")
    throw new Error("Vercel requires STORAGE_DRIVER=supabase.");
  return config;
});
module.exports = app;
module.exports.createApp = require("./application").createApp;
