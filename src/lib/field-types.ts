// The closed set of CRM field types and how each maps to a Postgres column type.
// This is the contract between FieldMetadata and the physical data-plane table.
// Pure + dependency-free so it can be unit-tested and imported anywhere.

export const FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "DATETIME",
  "SELECT",
  "MULTI_SELECT",
  "RELATION",
  "CURRENCY",
  "EMAIL",
  "PHONE",
  "URL",
  "RATING",
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

// FieldType → Postgres column type. Identifiers in DDL can't be parameterized,
// so the type string MUST come from this fixed map — never from user input.
const PG_TYPE: Record<FieldType, string> = {
  TEXT: "text",
  EMAIL: "text",
  PHONE: "text",
  URL: "text",
  SELECT: "text",
  RELATION: "text", // stores the related record id
  NUMBER: "double precision",
  CURRENCY: "numeric(14,2)",
  RATING: "integer",
  BOOLEAN: "boolean",
  DATE: "date",
  DATETIME: "timestamptz",
  MULTI_SELECT: "jsonb",
}

export function isFieldType(value: string): value is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(value)
}

export function pgTypeFor(type: string): string {
  if (!isFieldType(type)) throw new Error(`Unknown field type: ${type}`)
  return PG_TYPE[type]
}

// Coerce a JS value into a form node-postgres can bind for the given field type.
// Returns null for empty/missing values (all business columns are nullable).
export function coerceValue(type: string, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null
  switch (type as FieldType) {
    case "NUMBER":
    case "CURRENCY": {
      const n = typeof value === "number" ? value : Number(value)
      return Number.isFinite(n) ? n : null
    }
    case "RATING": {
      const n = Math.trunc(Number(value))
      return Number.isFinite(n) ? n : null
    }
    case "BOOLEAN":
      return value === true || value === "true" || value === "on"
    case "DATE":
    case "DATETIME":
      return value instanceof Date ? value : new Date(String(value))
    case "MULTI_SELECT":
      // jsonb param — pg serializes objects/arrays to JSON automatically.
      return Array.isArray(value)
        ? JSON.stringify(value)
        : JSON.stringify([value])
    default:
      return String(value)
  }
}
