"use client"

import type { UseFormRegister } from "react-hook-form"

import type { RecordFormValues } from "@/lib/record-schema"
import { Input } from "@/components/ui/input"

export interface InputFieldDef {
  name: string
  label: string
  type: string
  isNullable: boolean
  options?: unknown
}

export interface RelationOption {
  id: string
  label: string
}

// Native <select> styled to match the Input, so react-hook-form's register()
// (which works on native selects) drives SELECT/BOOLEAN/RELATION without a Radix
// Controller. Keeps every form value a string for uniform server-side coercion.
const selectClass =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"

function choicesOf(field: InputFieldDef): string[] {
  const opts = field.options as { choices?: string[] } | null | undefined
  return opts?.choices ?? []
}

export function FieldInput({
  field,
  register,
  disabled,
  options,
}: {
  field: InputFieldDef
  register: UseFormRegister<RecordFormValues>
  disabled?: boolean
  options?: RelationOption[]
}) {
  const reg = register(field.name)

  switch (field.type) {
    case "SELECT":
      return (
        <select className={selectClass} disabled={disabled} {...reg}>
          <option value="">—</option>
          {choicesOf(field).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )
    case "BOOLEAN":
      return (
        <select className={selectClass} disabled={disabled} {...reg}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    case "RELATION":
      return (
        <select className={selectClass} disabled={disabled} {...reg}>
          <option value="">—</option>
          {(options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case "NUMBER":
    case "CURRENCY":
    case "RATING":
      return <Input type="number" step="any" disabled={disabled} {...reg} />
    case "DATE":
      return <Input type="date" disabled={disabled} {...reg} />
    case "DATETIME":
      return <Input type="datetime-local" disabled={disabled} {...reg} />
    case "EMAIL":
      return <Input type="email" disabled={disabled} {...reg} />
    case "URL":
      return <Input type="url" disabled={disabled} {...reg} />
    case "PHONE":
      return <Input type="tel" disabled={disabled} {...reg} />
    default:
      return <Input type="text" disabled={disabled} {...reg} />
  }
}
