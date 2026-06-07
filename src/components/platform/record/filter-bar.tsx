"use client"

import { useState } from "react"
import { useQueryStates } from "nuqs"

import type { FilterOp, RecordFilter } from "@/lib/query-sql"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  recordUrlOptions,
  recordUrlParsers,
} from "@/components/platform/record/record-url"

export interface FilterField {
  name: string
  label: string
  type: string
  choices?: string[]
}

const TEXTY = new Set(["TEXT", "EMAIL", "URL", "PHONE", "SELECT", "RELATION"])
const ORDERED = new Set(["NUMBER", "CURRENCY", "RATING", "DATE", "DATETIME"])

const OP_LABELS: Record<FilterOp, string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
  starts_with: "starts with",
  gt: "greater than",
  gte: "≥",
  lt: "less than",
  lte: "≤",
  is_empty: "is empty",
  is_not_empty: "is not empty",
}

// Operators offered for a field type — mirrors opAllowedFor() on the server so
// the UI never builds a filter the query builder would silently drop.
function opsForType(type: string): FilterOp[] {
  const base: FilterOp[] = ["eq", "neq", "is_empty", "is_not_empty"]
  if (TEXTY.has(type))
    return ["eq", "neq", "contains", "starts_with", "is_empty", "is_not_empty"]
  if (ORDERED.has(type))
    return ["eq", "neq", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"]
  return base
}

function needsValue(op: FilterOp): boolean {
  return op !== "is_empty" && op !== "is_not_empty"
}

const selectClass =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

function ValueInput({
  field,
  op,
  value,
  onChange,
}: {
  field: FilterField
  op: FilterOp
  value: string
  onChange: (v: string) => void
}) {
  if (!needsValue(op)) return null
  // contains/starts_with always operate on text regardless of column type.
  if (op === "contains" || op === "starts_with") {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value"
      />
    )
  }
  if (field.type === "BOOLEAN") {
    return (
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }
  if (field.type === "SELECT" && field.choices?.length) {
    return (
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {field.choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    )
  }
  if (
    ORDERED.has(field.type) &&
    field.type !== "DATE" &&
    field.type !== "DATETIME"
  ) {
    return (
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value"
      />
    )
  }
  if (field.type === "DATE") {
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (field.type === "DATETIME") {
    return (
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
    />
  )
}

export function FilterBar({ fields }: { fields: FilterField[] }) {
  const [{ filters }, setQuery] = useQueryStates(
    recordUrlParsers,
    recordUrlOptions,
  )
  const [open, setOpen] = useState(false)
  const [fieldName, setFieldName] = useState(fields[0]?.name ?? "")
  const [op, setOp] = useState<FilterOp>("eq")
  const [value, setValue] = useState("")

  const active = filters?.filters ?? []
  const fieldByName = (n: string) => fields.find((f) => f.name === n)
  const labelFor = (n: string) => fieldByName(n)?.label ?? n
  const selectedField = fieldByName(fieldName)
  const ops = selectedField
    ? opsForType(selectedField.type)
    : ["eq" as FilterOp]

  const writeFilters = (list: RecordFilter[]) =>
    setQuery({
      filters: list.length ? { logic: "AND", filters: list } : null,
      page: 1,
    })

  const addFilter = () => {
    if (!selectedField) return
    if (needsValue(op) && !value.trim()) return
    const next: RecordFilter = needsValue(op)
      ? { column: fieldName, op, value: value.trim() }
      : { column: fieldName, op }
    writeFilters([...active, next])
    setValue("")
    setOpen(false)
  }

  const removeAt = (i: number) =>
    writeFilters(active.filter((_, idx) => idx !== i))

  const onPickField = (name: string) => {
    setFieldName(name)
    const f = fieldByName(name)
    const allowed = f ? opsForType(f.type) : ["eq" as FilterOp]
    if (!allowed.includes(op)) setOp(allowed[0])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((f, i) => (
        <span
          key={`${f.column}-${f.op}-${i}`}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
        >
          <span className="font-medium">{labelFor(f.column)}</span>
          <span className="text-muted-foreground">{OP_LABELS[f.op]}</span>
          {f.value !== undefined && f.value !== "" ? (
            <span>{String(f.value)}</span>
          ) : null}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove filter"
            onClick={() => removeAt(i)}
          >
            ×
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            + Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <select
              className={selectClass}
              value={fieldName}
              onChange={(e) => onPickField(e.target.value)}
            >
              {fields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition</Label>
            <select
              className={selectClass}
              value={op}
              onChange={(e) => setOp(e.target.value as FilterOp)}
            >
              {ops.map((o) => (
                <option key={o} value={o}>
                  {OP_LABELS[o]}
                </option>
              ))}
            </select>
          </div>
          {selectedField && needsValue(op) ? (
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <ValueInput
                field={selectedField}
                op={op}
                value={value}
                onChange={setValue}
              />
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={addFilter}
            disabled={needsValue(op) && !value.trim()}
          >
            Add filter
          </Button>
        </PopoverContent>
      </Popover>

      {active.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => writeFilters([])}
          className="text-muted-foreground"
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}
