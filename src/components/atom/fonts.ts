import { Inter, Tajawal } from "next/font/google"

// Latin (LTR) — Inter. Exposed as --font-inter.
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Arabic (RTL) — Tajawal. Exposed as --font-tajawal. globals.css switches
// --app-font-sans to this under [dir="rtl"].
export const fontArabic = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
})
