"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { parseCSV } from "@/lib/csv"
import { slugifyIdent } from "@/lib/slug"
import { importRecords } from "@/components/platform/record/io-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ImportDialog({
  objectName,
  fields,
}: {
  objectName: string
  fields: { name: string; label: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [mapped, setMapped] = useState<string[]>([])
  const [fileName, setFileName] = useState("")

  const onFile = async (file: File) => {
    const rows = parseCSV(await file.text())
    if (rows.length < 2) {
      toast.error("CSV needs a header row plus at least one record")
      return
    }
    const headers = rows[0]
    // Map each column to a field by name, slugified header, or label.
    const colToField = headers.map((h) => {
      const slug = slugifyIdent(h)
      return (
        fields.find(
          (f) =>
            f.name === h ||
            f.name === slug ||
            f.label.toLowerCase() === h.toLowerCase(),
        )?.name ?? null
      )
    })
    const recs = rows.slice(1).map((r) => {
      const obj: Record<string, unknown> = {}
      colToField.forEach((fieldName, i) => {
        if (fieldName) obj[fieldName] = r[i]
      })
      return obj
    })
    setRecords(recs)
    setMapped([...new Set(colToField.filter((f): f is string => !!f))])
    setFileName(file.name)
  }

  const onImport = () =>
    start(async () => {
      const res = await importRecords(objectName, records)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(
        `Imported ${res.count ?? 0}${res.failed ? `, ${res.failed} skipped` : ""}`,
      )
      setRecords([])
      setMapped([])
      setFileName("")
      setOpen(false)
      router.refresh()
    })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
            className="block w-full text-sm file:me-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1 file:text-sm file:text-foreground"
          />
          {records.length > 0 ? (
            <div className="text-sm">
              <p>
                {fileName}: <b>{records.length}</b> rows
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mapped columns: {mapped.join(", ") || "none"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              The header row should match field names or labels.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={pending || records.length === 0}
            onClick={onImport}
          >
            {pending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
