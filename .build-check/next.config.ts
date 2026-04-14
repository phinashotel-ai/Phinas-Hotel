import type { NextConfig } from "next";
import path from "path";

const backendUrl = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
        hostname: backendUrl.hostname,
        port: backendUrl.port,
        pathname: "/media/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: `${backendUrl.origin}/api/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl.origin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
