import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Recipe-Website",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
