import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  turbopack: {
    root: "C:\\Users\\yabla\\Downloads\\dev\\mailpulse",
  },
};

export default nextConfig;
