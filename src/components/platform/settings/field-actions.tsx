"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  deleteField,
  deleteObject,
} from "@/components/platform/settings/actions"
import { Button } from "@/components/ui/button"

export function DeleteFieldButton({ fieldId }: { fieldId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteField(fieldId)
          if (res.error) {
            toast.error(res.error)
            return
          }
          toast.success("Field removed")
          router.refresh()
        })
      }
    >
      Remove
    </Button>
  )
}

export function DeleteObjectButton({
  nameSingular,
  lang,
}: {
  nameSingular: string
  lang: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteObject(nameSingular)
          if (res.error) {
            toast.error(res.error)
            return
          }
          toast.success("Object deleted")
          router.push(`/${lang}/settings`)
        })
      }
    >
      Delete object
    </Button>
  )
}
