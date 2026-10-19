import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
