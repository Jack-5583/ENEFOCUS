import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      '@zoom/download-manager': path.resolve('./src/lib/zoom-stubs/download-manager.js'),
    };
    return config;
  },
  // Next.js 15.3+ top-level turbopack config
  turbopack: {
    resolveAlias: {
      '@zoom/download-manager': './src/lib/zoom-stubs/download-manager.js',
    },
  },
};

export default nextConfig;
