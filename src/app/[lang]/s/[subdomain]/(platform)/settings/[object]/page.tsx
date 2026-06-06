import { ObjectFields } from "@/components/platform/settings/object-fields"

export default async function SettingsObjectPage({
  params,
}: {
  params: Promise<{ lang: string; object: string }>
}) {
  const { lang, object } = await params
  return <ObjectFields lang={lang} nameSingular={object} />
}
