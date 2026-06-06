import { SettingsContent } from "@/components/platform/settings/content"

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <SettingsContent lang={lang} />
}
