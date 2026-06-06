import Link from "next/link"

import { listObjects } from "@/lib/metadata"
import { requireTenant } from "@/lib/tenant-context"
import { NewObjectForm } from "@/components/platform/settings/new-object-form"

export async function SettingsContent({ lang }: { lang: string }) {
  const { workspaceId } = await requireTenant()
  const objects = await listObjects(workspaceId)

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Objects &amp; fields</p>
        </div>
        <NewObjectForm />
      </div>

      <div className="divide-y overflow-hidden rounded-lg border">
        {objects.map((o) => (
          <Link
            key={o.id}
            href={`/${lang}/settings/${o.nameSingular}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{o.labelPlural}</span>
              <span className="font-mono text-xs text-muted-foreground">
                /{o.namePlural}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {o.isCustom ? (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                  custom
                </span>
              ) : null}
              <span>{o.fields.length} fields</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
