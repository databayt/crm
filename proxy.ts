import { proxy } from "./src/proxy"

// Next.js 16 middleware entry (renamed from middleware.ts). Re-export the impl
// from src/proxy.ts. The config must be declared inline here.
export { proxy }

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
}
