// Arabic-first, RTL by default. English (LTR) is the secondary locale.
// Locale-scoped routes live under app/[lang]/...; the bare root redirects to /ar.
export const i18n = {
  defaultLocale: "ar",
  locales: ["ar", "en"],
} as const

export type Locale = (typeof i18n.locales)[number]

export const localeConfig: Record<
  Locale,
  { name: string; dir: "ltr" | "rtl" }
> = {
  ar: { name: "العربية", dir: "rtl" },
  en: { name: "English", dir: "ltr" },
}

export function isLocale(value: string): value is Locale {
  return (i18n.locales as readonly string[]).includes(value)
}

export function dirFor(lang: string): "ltr" | "rtl" {
  return localeConfig[lang as Locale]?.dir ?? "rtl"
}
