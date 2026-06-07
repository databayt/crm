"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { toInputString } from "@/lib/field-types"
import { updateField } from "@/components/platform/record/actions"
import { FieldCell } from "@/components/platform/record/field-cell"

export interface InlineField {
  name: string
  label: string
  type: string
  // Required-ness is validated server-side in updateField; optional on the client.
  isNullable?: boolean
  choices?: string[]
}

interface RelationOption {
  id: string
  label: string
}

const SELECT_LIKE = new Set(["SELECT", "BOOLEAN", "RELATION"])

const controlClass =
  "border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

function inputTypeFor(type: string): string {
  switch (type) {
    case "NUMBER":
    case "CURRENCY":
    case "RATING":
      return "number"
    case "DATE":
      return "date"
    case "DATETIME":
      return "datetime-local"
    case "EMAIL":
      return "email"
    case "URL":
      return "url"
    case "PHONE":
      return "tel"
    default:
      return "text"
  }
}

// One inline-editable field. Reads as a normal FieldCell; click turns it into a
// type-appropriate editor that PATCHes a single column via updateField. Enter or
// blur commits, Escape cancels. The server coerces the submitted string per type.
export function InlineEdit({
  objectName,
  recordId,
  field,
  value,
  relationLabel,
  relationOptions,
}: {
  objectName: string
  recordId: string
  field: InlineField
  value: unknown
  relationLabel?: string
  relationOptions?: RelationOption[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState("")
  const cancelRef = useRef(false)

  const beginEdit = () => {
    setDraft(toInputString(field.type, value))
    setEditing(true)
  }

  const commit = (next: string) => {
    if (next === toInputString(field.type, value)) {
      setEditing(false)
      return
    }
    start(async () => {
      const res = await updateField(objectName, recordId, field.name, next)
      if (res.error) {
        toast.error(res.error)
        return // stay in edit mode so the user can fix it
      }
      toast.success("Saved")
      setEditing(false)
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={beginEdit}
        title="Click to edit"
        aria-label={`Edit ${field.label}`}
        className="group/inline -mx-1 flex w-full items-center gap-1 rounded px-1 text-start hover:bg-muted"
      >
        <span className="min-w-0">
          {/* interactive={false}: never nest FieldCell's <a> (URL/EMAIL) in this button */}
          <FieldCell
            field={field}
            value={value}
            relationLabel={relationLabel}
            interactive={false}
          />
        </span>
        <PencilIcon className="ms-auto size-3 shrink-0 opacity-0 transition-opacity group-hover/inline:opacity-50" />
      </button>
    )
  }

  if (SELECT_LIKE.has(field.type)) {
    const opts =
      field.type === "BOOLEAN"
        ? [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]
        : field.type === "RELATION"
          ? (relationOptions ?? []).map((o) => ({
              value: o.id,
              label: o.label,
            }))
          : (field.choices ?? []).map((c) => ({ value: c, label: c }))
    return (
      <select
        autoFocus
        disabled={pending}
        className={controlClass}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => {
          if (!pending) setEditing(false)
        }}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  const inputType = inputTypeFor(field.type)
  return (
    <input
      autoFocus
      disabled={pending}
      type={inputType}
      step={inputType === "number" ? "any" : undefined}
      className={controlClass}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === "Escape") {
          cancelRef.current = true
          e.currentTarget.blur()
        }
      }}
      onBlur={() => {
        if (pending) return
        if (cancelRef.current) {
          cancelRef.current = false
          setEditing(false)
          return
        }
        commit(draft)
      }}
    />
  )
}
