import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Dev runs on a wildcard loopback domain (lvh.me) for multi-tenant subdomain
  // cookies; allow its origins so HMR + server actions aren't blocked cross-origin.
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
  images: {
    remotePatterns: [
      // Avatars / company logos pulled from remote sources. Tighten per-host later.
      { protocol: "https", hostname: "**" },
    ],
  },
}

export default nextConfig
