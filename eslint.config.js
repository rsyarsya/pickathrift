// ESLint for every TypeScript package in the workspace.
// apps/frontend and apps/backend can add their own rules in their own config later.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/out/**", ".claude/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
