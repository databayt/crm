"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createRecord } from "@/components/platform/record/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const selectClass =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"

export function ActivityComposer({
  recordId,
  relationField,
  typeChoices,
}: {
  recordId: string
  relationField: string
  typeChoices: string[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [type, setType] = useState(typeChoices[0] ?? "NOTE")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  const submit = () =>
    start(async () => {
      if (!body.trim() && !title.trim()) {
        toast.error("Write something first")
        return
      }
      const res = await createRecord("activity", {
        type,
        title,
        body,
        [relationField]: recordId,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      setTitle("")
      setBody("")
      toast.success("Added")
      router.refresh()
    })

  return (
    <div className="space-y-2">
      {typeChoices.length > 0 ? (
        <select
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={pending}
        >
          {typeChoices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : null}
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={pending}
      />
      <Textarea
        placeholder="Add a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        rows={3}
      />
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
    </div>
  )
}
