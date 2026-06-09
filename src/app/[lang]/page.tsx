import Link from "next/link"
import {
  ShieldCheck,
  Database,
  Layers,
  ChevronRight,
  Sparkles,
  KanbanSquare,
  ExternalLink,
} from "lucide-react"

import { getDictionary } from "@/components/internationalization/dictionaries"
import type { Locale } from "@/components/internationalization/config"
import { Button } from "@/components/ui/button"

function GithubIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

export default async function Landing({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale)

  const isRTL = lang === "ar"

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
      <div className="pointer-events-none absolute top-0 right-1/4 size-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/4 size-[400px] rounded-full bg-purple-500/5 blur-[100px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-md">
        <div className="container-wrapper flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 font-semibold text-white shadow-md shadow-indigo-500/20">
              C
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              {dict.app.name}
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href={`/${lang}/login`}
              className="text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              {dict.landing.signin}
            </Link>
            <Button
              asChild
              size="sm"
              className="shadow-md shadow-indigo-500/10"
            >
              <Link href={`/${lang}/register`}>{dict.landing.cta}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col">
        <section className="container-wrapper flex max-w-5xl flex-col items-center px-4 pt-20 pb-12 text-center sm:px-6">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 shadow-xs backdrop-blur-xs">
            <Sparkles className="size-3.5" />
            <span>{dict.app.name} · databayt stack</span>
          </div>

          {/* Heading */}
          <h1 className="max-w-4xl bg-linear-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-4xl leading-[1.15] font-extrabold tracking-tight text-transparent text-white sm:text-6xl">
            {dict.landing.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            {dict.landing.subtitle}
          </p>

          {/* Actions */}
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full px-8 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:shadow-indigo-500/30 sm:w-auto"
            >
              <Link
                href={`/${lang}/register`}
                className="flex items-center gap-2"
              >
                <span>{dict.landing.cta}</span>
                {isRTL ? (
                  <ChevronRight className="size-4 rotate-180" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full border-zinc-800 px-8 text-sm font-semibold text-zinc-300 hover:bg-zinc-900/40 hover:text-white sm:w-auto"
            >
              <a
                href="https://github.com/databayt/crm"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <GithubIcon className="size-4 shrink-0 fill-current" />
                <span>{dict.landing.source}</span>
                <span className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  Star 24k+
                </span>
              </a>
            </Button>
          </div>
        </section>

        {/* CSS Interactive Layout Mockup (Twenty Signature style) */}
        <section className="container-wrapper px-4 pb-24 sm:px-6">
          <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-1.5 shadow-2xl shadow-indigo-500/5 backdrop-blur-md">
            {/* Glossy inner glow border */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-linear-to-b from-indigo-500/10 via-transparent to-transparent" />

            {/* Simulated Desktop window header */}
            <div className="flex items-center justify-between rounded-t-xl border-b border-zinc-900 bg-zinc-900/30 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full border border-red-500/40 bg-red-500/30" />
                <div className="size-3 rounded-full border border-yellow-500/40 bg-yellow-500/30" />
                <div className="size-3 rounded-full border border-green-500/40 bg-green-500/30" />
              </div>
              <div className="text-[11px] font-medium text-zinc-500 select-none">
                acme.crm.databayt.org
              </div>
              <div className="w-12" />
            </div>

            {/* Simulated app interface */}
            <div className="grid h-[400px] grid-cols-1 overflow-hidden rounded-b-xl bg-zinc-950/60 text-zinc-500 md:grid-cols-[180px_1fr]">
              {/* Sidebar mockup */}
              <aside className="flex hidden flex-col gap-3.5 border-e border-zinc-900 bg-zinc-950/80 p-3 select-none md:flex">
                <div className="flex items-center gap-2 px-1">
                  <div className="size-5 rounded-md bg-linear-to-br from-indigo-500 to-purple-600" />
                  <div className="h-3 w-16 rounded-xs bg-zinc-800" />
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-10 rounded-xs bg-zinc-900 px-1" />
                  <div className="flex items-center gap-2 rounded-md bg-zinc-900/60 px-1 py-1">
                    <div className="size-3 rounded-xs bg-indigo-500/20 text-indigo-400" />
                    <div className="h-2 w-14 rounded-xs bg-indigo-400/80" />
                  </div>
                  <div className="flex items-center gap-2 px-1 py-1">
                    <div className="size-3 rounded-xs bg-zinc-900" />
                    <div className="h-2 w-16 rounded-xs bg-zinc-800" />
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="h-2.5 w-10 rounded-xs bg-zinc-900 px-1" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-1 py-1">
                      <div className="size-3 rounded-xs bg-zinc-900" />
                      <div className="h-2 w-16 rounded-xs bg-zinc-800" />
                    </div>
                  ))}
                </div>
              </aside>

              {/* Main content pane mockup - Kanban view */}
              <div className="flex flex-col gap-4 overflow-hidden bg-zinc-950/20 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KanbanSquare className="size-4.5 text-zinc-400" />
                    <div className="h-3.5 w-24 rounded-xs bg-zinc-800" />
                  </div>
                  <div className="h-7 w-20 rounded-md border border-zinc-800 bg-zinc-900" />
                </div>

                {/* Kanban grid columns */}
                <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden select-none lg:grid-cols-4">
                  {/* Column 1 */}
                  <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-900/60 bg-zinc-900/20 p-3">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="h-2.5 w-10 rounded-xs bg-zinc-800" />
                      <div className="size-3.5 rounded-sm bg-zinc-900" />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-2.5">
                      <div className="h-2.5 w-16 rounded-xs bg-zinc-700" />
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-10 rounded-xs bg-indigo-500/30" />
                        <div className="h-1.5 w-8 rounded-xs bg-zinc-800" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-2.5">
                      <div className="h-2.5 w-20 rounded-xs bg-zinc-700" />
                      <div className="h-1.5 w-12 rounded-xs bg-zinc-800" />
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-900/60 bg-zinc-900/20 p-3">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="h-2.5 w-14 rounded-xs bg-zinc-800" />
                      <div className="size-3.5 rounded-sm bg-zinc-900" />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-2.5 shadow-lg ring-1 shadow-indigo-500/5 ring-indigo-500/20">
                      <div className="h-2.5 w-24 rounded-xs bg-zinc-600" />
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-12 rounded-xs bg-indigo-500/30" />
                        <div className="h-1.5 w-6 rounded-xs bg-zinc-800" />
                      </div>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="flex hidden flex-col gap-2.5 rounded-xl border border-zinc-900/60 bg-zinc-900/20 p-3 lg:flex">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="h-2.5 w-12 rounded-xs bg-zinc-800" />
                      <div className="size-3.5 rounded-sm bg-zinc-900" />
                    </div>
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800/40 bg-zinc-900/40 p-2.5">
                      <div className="h-2.5 w-20 rounded-xs bg-zinc-700" />
                      <div className="h-1.5 w-14 rounded-xs bg-zinc-800" />
                    </div>
                  </div>

                  {/* Column 4 */}
                  <div className="flex hidden flex-col gap-2.5 rounded-xl border border-zinc-900/60 bg-zinc-900/20 p-3 lg:flex">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div className="h-2.5 w-10 rounded-xs bg-zinc-800" />
                      <div className="size-3.5 rounded-sm bg-zinc-900" />
                    </div>
                    <div className="flex h-8 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-[10px]">
                      + Add Stage
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="relative border-t border-zinc-900 bg-zinc-950/40 py-24">
          <div className="container-wrapper px-4 sm:px-6">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Engineered for Customization & Scale
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Everything you need to manage relationships, fully tailored to
                your team&apos;s pipeline.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900 text-indigo-400">
                  <Database className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Dynamic Metadata Engine
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Provision custom CRM objects and append new fields dynamically
                  at runtime. Your schema alters safely with whitelisted SQL
                  transactions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900 text-indigo-400">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Schema-Level Tenancy
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Strong workspace isolation with dedicated PostgreSQL schemas.
                  Subdomain resolution securely locks data plane boundaries.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-zinc-800/80 bg-zinc-900 text-indigo-400">
                  <Layers className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  Arabic-First Localization
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  RTL structure built into our core styling system. Switches
                  automatically between Tajawal (RTL Arabic) and Inter (LTR
                  English).
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950 py-10 text-zinc-600">
        <div className="container-wrapper flex flex-col items-center justify-between gap-4 px-4 text-xs sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">{dict.app.name}</span>
            <span>·</span>
            <span>© 2026 databayt org. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/twentyhq/twenty"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-zinc-400"
            >
              <span>Twenty Reference</span>
              <ExternalLink className="size-3" />
            </a>
            <span>•</span>
            <a
              href="https://github.com/databayt/crm"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-zinc-400"
            >
              GitHub Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
