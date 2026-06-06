// Route constants — kept dependency-free so the Edge proxy can import them.

// Where to send a user after login when no callbackUrl is present.
export const DEFAULT_LOGIN_REDIRECT = "/dashboard"

// Auth.js mounts its handlers here; the proxy never rewrites these.
export const apiAuthPrefix = "/api/auth"

// Locale-stripped paths that never require auth (main domain).
export const publicRoutes = ["/", "/features", "/pricing"]

// Global auth routes — exist at /[lang]/(auth)/*, never under a subdomain.
export const authRoutes = ["/login", "/register", "/join", "/error", "/reset"]
