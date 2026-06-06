import { notFound } from "next/navigation"

import { dirFor, isLocale } from "@/components/internationalization/config"

export function generateStaticParams() {
  return [{ lang: "ar" }, { lang: "en" }]
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  return (
    <div dir={dirFor(lang)} className="flex min-h-svh flex-col">
      {children}
    </div>
  )
}
