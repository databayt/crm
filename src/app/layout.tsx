import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { NuqsAdapter } from "nuqs/adapters/next/app"

import "./globals.css"
import { fontArabic, fontSans } from "@/components/atom/fonts"
import { dirFor } from "@/components/internationalization/config"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: {
    default: "CRM",
    template: "%s · CRM",
  },
  description:
    "Arabic-first, multi-tenant, open-source CRM — built on databayt.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.databayt.org",
  ),
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolve direction up-front: the proxy sets x-locale (Phase 1); until then
  // fall back to the NEXT_LOCALE cookie, then to Arabic. The inline <script>
  // corrects <html lang/dir> from the URL before paint to avoid an RTL flash.
  const headersList = await headers()
  const cookieStore = await cookies()
  const locale =
    headersList.get("x-locale") || cookieStore.get("NEXT_LOCALE")?.value || "ar"
  const dir = dirFor(locale)

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontArabic.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=window.location.pathname.match(/^\\/(en|ar)/);var l=m?m[1]:'ar';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr'})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
