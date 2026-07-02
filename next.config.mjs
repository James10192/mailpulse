import { createMDX } from "fumadocs-mdx/next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    viewTransition: true,
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
