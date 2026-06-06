import { PipelineContent } from "@/components/platform/pipeline/content"

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <PipelineContent lang={lang} />
}
