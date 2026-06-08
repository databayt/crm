import { MembersContent } from "@/components/platform/members/content"

export default async function MembersPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  return <MembersContent lang={lang} />
}
