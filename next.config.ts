import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Avatars / company logos pulled from remote sources. Tighten per-host later.
      { protocol: "https", hostname: "**" },
    ],
  },
}

export default nextConfig
