import { redirect } from "next/navigation"

// Bare root → default locale (Arabic). Replaced by locale negotiation in the
// subdomain proxy (Phase 1).
export default function RootPage() {
  redirect("/ar")
}
