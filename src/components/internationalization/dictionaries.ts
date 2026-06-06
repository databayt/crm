import "server-only"

import type { Locale } from "./config"

// Per-feature dictionaries live in src/dictionaries/<locale>/<feature>.json.
// Phase 0 ships a single "common" namespace; each feature block adds its own
// dictionary file and a loader here as modules land.
const dictionaries = {
  ar: () => import("@/dictionaries/ar/common.json").then((m) => m.default),
  en: () => import("@/dictionaries/en/common.json").then((m) => m.default),
} as const

export async function getDictionary(locale: Locale) {
  const load = dictionaries[locale] ?? dictionaries.ar
  return load()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
