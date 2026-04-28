import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
