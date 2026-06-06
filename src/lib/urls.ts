// Build an absolute URL to a workspace subdomain. Dev: http + *.localhost:3000.
// Prod: https + *.crm.databayt.org (driven by NEXT_PUBLIC_ROOT_DOMAIN).
export function workspaceUrl(
  subdomain: string,
  locale: string,
  path = "",
): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  return `${protocol}://${subdomain}.${root}/${locale}${path}`
}

// Reserved subdomains that cannot be claimed as a workspace.
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "login",
  "register",
  "join",
  "dashboard",
  "static",
  "assets",
  "cdn",
  "mail",
  "ftp",
  "crm",
  "help",
  "support",
  "status",
  "blog",
  "docs",
  "billing",
  "settings",
])
