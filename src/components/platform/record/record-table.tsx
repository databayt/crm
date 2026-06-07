"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useQueryStates } from "nuqs"
import { toast } from "sonner"

import {
  bulkDeleteRecords,
  deleteRecord,
} from "@/components/platform/record/actions"
import { ColumnOptions } from "@/components/platform/record/column-options"
import { FieldCell } from "@/components/platform/record/field-cell"
import { FilterBar } from "@/components/platform/record/filter-bar"
import { exportRecords } from "@/components/platform/record/io-actions"
import {
  colsToList,
  recordUrlOptions,
  recordUrlParsers,
} from "@/components/platform/record/record-url"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TableField {
  name: string
  label: string
  type: string
  choices?: string[]
}

type Row = Record<string, unknown>

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function RowActions({ objectName, id }: { objectName: string; id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteRecord(objectName, id)
          if (res.error) {
            toast.error(res.error)
            return
          }
          toast.success("Deleted")
          router.refresh()
        })
      }
    >
      Delete
    </Button>
  )
}

export function RecordTable({
  objectName,
  basePath,
  fields,
  rows,
  total,
  pageSize,
  relationLabels,
  displayField,
}: {
  objectName: string
  basePath: string
  fields: TableField[]
  rows: Row[]
  total: number
  pageSize: number
  relationLabels: Record<string, Record<string, string>>
  displayField: string
}) {
  const [query, setQuery] = useQueryStates(recordUrlParsers, recordUrlOptions)
  const { q, page, sort, dir, filters, cols } = query
  const [searchInput, setSearchInput] = useState(q)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const router = useRouter()
  const [bulkPending, startBulk] = useTransition()

  // Visible columns: an explicit `cols` subset (original order) or all fields.
  const visibleFields = useMemo(() => {
    const want = colsToList(cols)
    if (want.length === 0) return fields
    const set = new Set(want)
    return fields.filter((f) => set.has(f.name))
  }, [fields, cols])

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const fieldCols: ColumnDef<Row>[] = visibleFields.map((f) => ({
      accessorKey: f.name,
      header: f.label,
      cell: ({ row }) => {
        const value = row.original[f.name]
        const node = (
          <FieldCell
            field={f}
            value={value}
            relationLabel={relationLabels[f.name]?.[String(value)]}
          />
        )
        if (f.name === displayField) {
          return (
            <Link
              href={`${basePath}/${String(row.original.id)}`}
              className="font-medium hover:underline"
            >
              {node}
            </Link>
          )
        }
        return node
      },
    }))
    return [
      ...fieldCols,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <RowActions objectName={objectName} id={String(row.original.id)} />
        ),
      },
    ]
  }, [visibleFields, relationLabels, displayField, basePath, objectName])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const pageIds = rows.map((r) => String(r.id))
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  const toggleAll = () =>
    setSelected((prev) => {
      if (pageIds.every((id) => prev.has(id))) return new Set()
      return new Set(pageIds)
    })

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onBulkDelete = () =>
    startBulk(async () => {
      const ids = [...selected]
      const res = await bulkDeleteRecords(objectName, ids)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(`Deleted ${res.count ?? ids.length}`)
      setSelected(new Set())
      router.refresh()
    })

  const onExportSelected = () =>
    startBulk(async () => {
      const res = await exportRecords(objectName, {
        ids: [...selected],
        filters: filters ?? undefined,
        search: q || undefined,
      })
      if (res.error || !res.csv) {
        toast.error(res.error ?? "Export failed")
        return
      }
      downloadCsv(res.csv, res.filename ?? "export.csv")
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQuery({ q: searchInput || null, page: 1 })
          }}
        >
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            className="max-w-xs"
          />
        </form>
        <FilterBar fields={fields} />
        <div className="ms-auto">
          <ColumnOptions fields={fields} />
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            disabled={bulkPending}
            onClick={onExportSelected}
          >
            Export selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkPending}
            onClick={onBulkDelete}
          >
            Delete ({selected.size})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                <th className="w-10 px-4 py-2 text-start">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                {hg.headers.map((h) => {
                  const colId = h.column.id
                  const sortable = fields.some((f) => f.name === colId)
                  return (
                    <th
                      key={h.id}
                      className="px-4 py-2 text-start font-medium whitespace-nowrap"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            setQuery({
                              sort: colId,
                              dir:
                                sort === colId && dir === "asc"
                                  ? "desc"
                                  : "asc",
                              page: 1,
                            })
                          }
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          {sort === colId ? (dir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No records.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const id = String(row.original.id)
                const isSel = selected.has(id)
                return (
                  <tr
                    key={row.id}
                    className={`border-t hover:bg-muted/30 ${
                      isSel ? "bg-muted/50" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        aria-label="Select row"
                        checked={isSel}
                        onChange={() => toggleOne(id)}
                      />
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setQuery({ page: page - 1 })}
          >
            Previous
          </Button>
          <span>
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setQuery({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
