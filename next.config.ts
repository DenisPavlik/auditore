import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Browser logs written into .next/dev/logs set off a rebuild and a reload, which logs again.
  logging: { browserToTerminal: false },
  // Lets a phone on the same Wi-Fi open the dev server by the Mac's address.
  allowedDevOrigins: ["192.168.*.*"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
