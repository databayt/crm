import Link from "next/link"

import { getDictionary } from "@/components/internationalization/dictionaries"
import type { Locale } from "@/components/internationalization/config"
import { Button } from "@/components/ui/button"

export default async function Landing({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)

  return (
    <main className="container-wrapper flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
        {dict.app.name} · databayt
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {dict.landing.title}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        {dict.landing.subtitle}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="https://github.com/databayt">{dict.landing.cta}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="https://github.com/twentyhq/twenty">
            {dict.landing.source}
          </Link>
        </Button>
      </div>
    </main>
  )
}
