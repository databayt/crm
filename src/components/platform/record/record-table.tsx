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
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import { toast } from "sonner"

import { deleteRecord } from "@/components/platform/record/actions"
import { FieldCell } from "@/components/platform/record/field-cell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TableField {
  name: string
  label: string
  type: string
}

type Row = Record<string, unknown>

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
  const [query, setQuery] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      sort: parseAsString.withDefault(""),
      dir: parseAsString.withDefault("asc"),
    },
    { shallow: false },
  )
  const { q, page, sort, dir } = query
  const [searchInput, setSearchInput] = useState(q)

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const fieldCols: ColumnDef<Row>[] = fields.map((f) => ({
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
  }, [fields, relationLabels, displayField, basePath, objectName])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
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
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No records.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
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
