"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { toast } from "sonner"

import { toggleFavorite } from "@/components/platform/favorites/actions"
import { Button } from "@/components/ui/button"

// Star toggle for a record (or a list, when recordId is omitted). Optimistic;
// router.refresh() re-runs the layout so the sidebar Favorites section updates.
export function FavoriteButton({
  objectName,
  recordId,
  label,
  initialFavorite,
}: {
  objectName: string
  recordId?: string
  label: string
  initialFavorite: boolean
}) {
  const router = useRouter()
  const [fav, setFav] = useState(initialFavorite)
  const [pending, start] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={fav}
      onClick={() =>
        start(async () => {
          const res = await toggleFavorite({ objectName, recordId, label })
          if (res.error) {
            toast.error(res.error)
            return
          }
          setFav(Boolean(res.isFavorite))
          router.refresh()
        })
      }
    >
      <Star
        className={`size-4 ${fav ? "fill-yellow-400 text-yellow-400" : ""}`}
      />
    </Button>
  )
}
