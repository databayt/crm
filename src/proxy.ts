import { NextResponse, type NextRequest } from "next/server"

import { i18n, type Locale } from "@/components/internationalization/config"
import { authRoutes } from "@/routes"

// Base domain (no port). Dev: "localhost". Prod: "crm.databayt.org".
const ROOT_DOMAIN = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"
).split(":")[0]

function getLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value
  if (cookie && i18n.locales.includes(cookie as Locale)) return cookie as Locale

  const accept = req.headers.get("accept-language")
  if (accept) {
    const lang = accept.split(",")[0].split("-")[0].trim().toLowerCase()
    if (i18n.locales.includes(lang as Locale)) return lang as Locale
  }
  return i18n.defaultLocale
}

// Extract the workspace subdomain from the host, or null on the main domain.
function getSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]
  let sub: string | null = null

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    sub = hostname.slice(0, -(ROOT_DOMAIN.length + 1)).split(".")[0]
  } else if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    sub = hostname.split("---")[0]
  }

  if (!sub || sub === "www") return null
  return sub
}

function isAuthenticated(req: NextRequest): boolean {
  return !!(
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value
  )
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()
  const { pathname } = url
  const host = req.headers.get("host") ?? ""

  // Locale already in the path?
  const hasLocale = i18n.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )
  const locale: Locale = hasLocale
    ? (pathname.split("/")[1] as Locale)
    : getLocale(req)
  const pathNoLocale = hasLocale
    ? pathname.replace(`/${locale}`, "") || "/"
    : pathname

  const subdomain = getSubdomain(host)
  const isAuth = authRoutes.includes(pathNoLocale)
  const authed = isAuthenticated(req)

  const setLocaleCookie = (res: NextResponse) => {
    res.cookies.set("NEXT_LOCALE", locale, {
      maxAge: 31_536_000,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    return res
  }

  // ── Main domain ────────────────────────────────────────────────────────
  if (!subdomain) {
    if (!hasLocale) {
      url.pathname = `/${locale}${pathname}`
      return setLocaleCookie(NextResponse.redirect(url))
    }
    const headers = new Headers(req.headers)
    headers.set("x-locale", locale)
    return setLocaleCookie(NextResponse.next({ request: { headers } }))
  }

  // ── Workspace subdomain ────────────────────────────────────────────────
  if (!hasLocale) {
    url.pathname = `/${locale}${pathname}`
    return setLocaleCookie(NextResponse.redirect(url))
  }

  // Auth routes exist globally — serve them without the subdomain rewrite.
  if (isAuth) {
    const headers = new Headers(req.headers)
    headers.set("x-locale", locale)
    return setLocaleCookie(NextResponse.next({ request: { headers } }))
  }

  // Gate the platform: unauthenticated → global login (carry callbackUrl + subdomain).
  if (!authed) {
    const loginUrl = new URL(`/${locale}/login`, req.url)
    loginUrl.searchParams.set("callbackUrl", pathname + url.search)
    loginUrl.searchParams.set("subdomain", subdomain)
    return NextResponse.redirect(loginUrl)
  }

  // Rewrite the clean URL to the physical route:
  //   acme.host/ar/companies → /ar/s/acme/companies
  if (
    pathNoLocale === `/s/${subdomain}` ||
    pathNoLocale.startsWith(`/s/${subdomain}/`)
  ) {
    url.pathname = `/${locale}${pathNoLocale}`
  } else {
    url.pathname = `/${locale}/s/${subdomain}${pathNoLocale}`
  }

  const headers = new Headers(req.headers)
  headers.set("x-locale", locale)
  const res = NextResponse.rewrite(url, { request: { headers } })
  res.headers.set("x-subdomain", subdomain)
  return setLocaleCookie(res)
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
}
