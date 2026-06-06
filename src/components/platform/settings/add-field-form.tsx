"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { FIELD_TYPES } from "@/lib/field-types"
import { addField } from "@/components/platform/settings/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const selectClass =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"

export function AddFieldForm({
  nameSingular,
  objects,
}: {
  nameSingular: string
  objects: { nameSingular: string; labelSingular: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [label, setLabel] = useState("")
  const [type, setType] = useState<string>("TEXT")
  const [choices, setChoices] = useState("")
  const [target, setTarget] = useState("")

  const needsChoices = type === "SELECT" || type === "MULTI_SELECT"
  const needsTarget = type === "RELATION"

  const submit = () =>
    start(async () => {
      const res = await addField(nameSingular, {
        label,
        type: type as (typeof FIELD_TYPES)[number],
        choices,
        targetObject: target,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Field added")
      setLabel("")
      setChoices("")
      setTarget("")
      setType("TEXT")
      setOpen(false)
      router.refresh()
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add field</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              placeholder="Priority"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <select
              id="field-type"
              className={selectClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={pending}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {needsChoices ? (
            <div className="space-y-2">
              <Label htmlFor="field-choices">Choices (comma-separated)</Label>
              <Input
                id="field-choices"
                placeholder="LOW, MEDIUM, HIGH"
                value={choices}
                onChange={(e) => setChoices(e.target.value)}
                disabled={pending}
              />
            </div>
          ) : null}
          {needsTarget ? (
            <div className="space-y-2">
              <Label htmlFor="field-target">Related object</Label>
              <select
                id="field-target"
                className={selectClass}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={pending}
              >
                <option value="">—</option>
                {objects.map((o) => (
                  <option key={o.nameSingular} value={o.nameSingular}>
                    {o.labelSingular}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={submit} disabled={pending || !label.trim()}>
              {pending ? "Adding…" : "Add field"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
