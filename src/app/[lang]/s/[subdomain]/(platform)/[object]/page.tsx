import { RecordContent } from "@/components/platform/record/content"

export default async function ObjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; object: string }>
  searchParams: Promise<{
    q?: string
    page?: string
    sort?: string
    dir?: string
    filters?: string
    view?: string
    group?: string
  }>
}) {
  const { lang, object } = await params
  const sp = await searchParams
  return <RecordContent lang={lang} objectPlural={object} searchParams={sp} />
}
