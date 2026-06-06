import { RecordDetail } from "@/components/platform/record/record-detail"

export default async function RecordPage({
  params,
}: {
  params: Promise<{ lang: string; object: string; recordId: string }>
}) {
  const { lang, object, recordId } = await params
  return <RecordDetail lang={lang} objectPlural={object} recordId={recordId} />
}
