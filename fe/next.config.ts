import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000");
const localApi = ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname);

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: localApi,
    maximumRedirects: 0,
    remotePatterns: [new URL("/uploads/products/**", apiUrl)],
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
