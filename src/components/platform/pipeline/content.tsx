import { BoardContent } from "@/components/platform/record/board-content"

// The pipeline is now just the generic record board, fixed to opportunities
// grouped by their stage SELECT field. Any object with a SELECT field gets the
// same board via BoardContent (see the [object] route's ?view=board).
export async function PipelineContent({ lang }: { lang: string }) {
  return (
    <BoardContent lang={lang} objectPlural="opportunities" groupBy="stage" />
  )
}
