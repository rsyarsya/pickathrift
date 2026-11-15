import js from "@eslint/js";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: Object.fromEntries(
        ["process", "console", "Buffer", "__dirname", "fetch", "setTimeout", "clearTimeout"].map(
          (key) => [key, "readonly"],
        ),
      ),
    },
  },
];
