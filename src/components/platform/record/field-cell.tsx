// Read renderer: turns a stored value into a display node based on field type.
// No "use client" — usable from both the (client) table and (server) detail view.

function fmtCurrency(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n)
    : String(v)
}

function fmtDate(v: unknown, withTime = false): string {
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return withTime ? d.toLocaleString() : d.toLocaleDateString()
}

export function FieldCell({
  field,
  value,
  relationLabel,
}: {
  field: { type: string; name: string }
  value: unknown
  relationLabel?: string
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>
  }

  switch (field.type) {
    case "URL":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {String(value)}
        </a>
      )
    case "EMAIL":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {String(value)}
        </a>
      )
    case "CURRENCY":
      return <span>{fmtCurrency(value)}</span>
    case "BOOLEAN":
      return <span>{value === true || value === "true" ? "Yes" : "No"}</span>
    case "DATE":
      return <span>{fmtDate(value)}</span>
    case "DATETIME":
      return <span>{fmtDate(value, true)}</span>
    case "RELATION":
      return relationLabel ? (
        <span>{relationLabel}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    default:
      return <span>{String(value)}</span>
  }
}
