"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { acceptInvite } from "@/components/platform/members/accept-actions"
import { Button } from "@/components/ui/button"

export function AcceptInviteButton({
  token,
  lang,
}: {
  token: string
  lang: string
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInvite(token)
          if (res.error) {
            toast.error(res.error)
            return
          }
          // Full navigation so the member-gated platform layout re-runs and the
          // freshly-created membership is picked up server-side.
          window.location.href = `/${lang}`
        })
      }
    >
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  )
}
