import Link from "next/link"
import { notFound } from "next/navigation"

import { getObject, listObjects } from "@/lib/metadata"
import { requireTenant } from "@/lib/tenant-context"
import { AddFieldForm } from "@/components/platform/settings/add-field-form"
import {
  DeleteFieldButton,
  DeleteObjectButton,
} from "@/components/platform/settings/field-actions"

export async function ObjectFields({
  lang,
  nameSingular,
}: {
  lang: string
  nameSingular: string
}) {
  const { workspaceId } = await requireTenant()
  const object = await getObject(workspaceId, nameSingular)
  if (!object) notFound()

  const objects = await listObjects(workspaceId)

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/${lang}/settings`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Settings
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {object.labelSingular}
            {object.isCustom ? (
              <span className="text-sm font-normal text-muted-foreground">
                (custom)
              </span>
            ) : null}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {object.isCustom ? (
            <DeleteObjectButton
              nameSingular={object.nameSingular}
              lang={lang}
            />
          ) : null}
          <AddFieldForm
            nameSingular={object.nameSingular}
            objects={objects.map((o) => ({
              nameSingular: o.nameSingular,
              labelSingular: o.labelSingular,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-start font-medium">Label</th>
              <th className="px-4 py-2 text-start font-medium">Name</th>
              <th className="px-4 py-2 text-start font-medium">Type</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {object.fields.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-4 py-2 font-medium">{f.label}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {f.name}
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs">{f.type}</span>
                  {f.isCustom ? (
                    <span className="ms-2 text-xs text-muted-foreground">
                      custom
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-end">
                  {f.isCustom ? <DeleteFieldButton fieldId={f.id} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
