import { z } from "zod"

// Build a Zod schema + form defaults from field metadata. Pure (no server-only),
// so the generic client form can use it as its resolver. Form values are kept as
// strings; the server action coerces them per FieldType via coerceValue, so this
// is the single client-side validation surface (required-ness only).

export interface FormField {
  name: string
  label: string
  type: string
  isNullable: boolean
}

export type RecordFormValues = Record<string, string>

export function buildRecordSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodType<string>> = {}
  for (const f of fields) {
    shape[f.name] =
      f.isNullable === false
        ? z.string().min(1, `${f.label} is required`)
        : z.string()
  }
  return z.object(shape)
}

// Convert a data-plane row (or nothing) into string form defaults.
export function toFormValues(
  fields: FormField[],
  record?: Record<string, unknown> | null,
): RecordFormValues {
  const out: RecordFormValues = {}
  for (const f of fields) {
    const raw = record?.[f.name]
    if (raw === null || raw === undefined) {
      out[f.name] = ""
    } else if (raw instanceof Date) {
      // date → YYYY-MM-DD ; datetime → YYYY-MM-DDTHH:mm (for <input type=date/datetime-local>)
      out[f.name] =
        f.type === "DATE"
          ? raw.toISOString().slice(0, 10)
          : raw.toISOString().slice(0, 16)
    } else {
      out[f.name] = String(raw)
    }
  }
  return out
}
