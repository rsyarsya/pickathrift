import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000");
const localApi = ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname);
if (
  process.env.VERCEL &&
  (!process.env.NEXT_PUBLIC_API_URL || localApi || apiUrl.protocol !== "https:")
)
  throw new Error("Set NEXT_PUBLIC_API_URL to the HTTPS backend URL before building on Vercel.");

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
