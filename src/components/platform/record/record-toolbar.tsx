"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { toast } from "sonner"

import { exportRecords } from "@/components/platform/record/io-actions"
import { ImportDialog } from "@/components/platform/record/import-dialog"
import {
  colsToList,
  recordUrlOptions,
  recordUrlParsers,
} from "@/components/platform/record/record-url"
import {
  deleteView,
  saveView,
  type ViewConfig,
} from "@/components/platform/record/view-actions"
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

interface SavedView {
  id: string
  name: string
  config: ViewConfig
}

export function RecordToolbar({
  objectName,
  views,
  fields,
}: {
  objectName: string
  views: SavedView[]
  fields: { name: string; label: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [saveOpen, setSaveOpen] = useState(false)
  const [viewName, setViewName] = useState("")
  const [{ q, sort, dir, filters, cols }, setQuery] = useQueryStates(
    recordUrlParsers,
    recordUrlOptions,
  )

  const applyView = (cfg: ViewConfig) =>
    setQuery({
      q: cfg.search || null,
      sort: cfg.sort || null,
      dir: cfg.dir || "asc",
      filters: cfg.filters ?? null,
      cols: cfg.cols?.length ? cfg.cols.join(",") : null,
      page: 1,
    })

  const onSave = () =>
    start(async () => {
      const colList = colsToList(cols)
      const res = await saveView(objectName, viewName, {
        search: q || undefined,
        sort: sort || undefined,
        dir: sort ? dir : undefined,
        filters: filters ?? undefined,
        cols: colList.length ? colList : undefined,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("View saved")
      setViewName("")
      setSaveOpen(false)
      router.refresh()
    })

  const onDeleteView = (id: string) =>
    start(async () => {
      await deleteView(id)
      router.refresh()
    })

  const onExport = () =>
    start(async () => {
      const res = await exportRecords(objectName, {
        search: q || undefined,
        filters: filters ?? undefined,
      })
      if (res.error || !res.csv) {
        toast.error(res.error ?? "Export failed")
        return
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename ?? "export.csv"
      a.click()
      URL.revokeObjectURL(url)
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
        >
          <button
            type="button"
            className="hover:underline"
            onClick={() => applyView(v.config)}
          >
            {v.name}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Delete view ${v.name}`}
            onClick={() => onDeleteView(v.id)}
          >
            ×
          </button>
        </span>
      ))}

      <div className="ms-auto flex items-center gap-2">
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Save view
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save current view</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="High value"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Saves the current search, filters, sort, and visible columns.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={pending || !viewName.trim()}
                onClick={onSave}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ImportDialog objectName={objectName} fields={fields} />

        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onExport}
        >
          Export
        </Button>
      </div>
    </div>
  )
}
