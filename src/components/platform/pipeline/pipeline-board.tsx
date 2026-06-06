"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"

import { moveOpportunity } from "@/components/platform/pipeline/actions"

export interface Opp {
  id: string
  name: string
  amount: string | null
  company: string | null
  stage: string
}

function fmtAmount(v: string | null): string | null {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n)
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n)
    : v
}

function Card({ opp, lang }: { opp: Opp; lang: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opp.id,
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-md border bg-card p-3 shadow-xs active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <Link
        href={`/${lang}/opportunities/${opp.id}`}
        className="text-sm font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {opp.name}
      </Link>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{opp.company ?? "—"}</span>
        <span>{fmtAmount(opp.amount) ?? ""}</span>
      </div>
    </div>
  )
}

function Column({
  stage,
  cards,
  lang,
}: {
  stage: string
  cards: Opp[]
  lang: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium">{stage}</span>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-primary/40 bg-muted/50" : ""
        }`}
      >
        {cards.map((c) => (
          <Card key={c.id} opp={c} lang={lang} />
        ))}
      </div>
    </div>
  )
}

export function PipelineBoard({
  lang,
  stages,
  oppsByStage,
}: {
  lang: string
  stages: string[]
  oppsByStage: Record<string, Opp[]>
}) {
  const router = useRouter()
  const [columns, setColumns] = useState(oppsByStage)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const findCard = (id: string) => {
    for (const s of stages) {
      const card = columns[s]?.find((o) => o.id === id)
      if (card) return { card, from: s }
    }
    return null
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const cardId = String(active.id)
    const toStage = String(over.id)
    const found = findCard(cardId)
    if (!found || found.from === toStage || !stages.includes(toStage)) return

    // optimistic move
    setColumns((prev) => {
      const next = { ...prev }
      next[found.from] = (next[found.from] ?? []).filter((o) => o.id !== cardId)
      next[toStage] = [
        { ...found.card, stage: toStage },
        ...(next[toStage] ?? []),
      ]
      return next
    })

    moveOpportunity(cardId, toStage).then((res) => {
      if (res.error) {
        toast.error(res.error)
        router.refresh()
      }
    })
  }

  const activeCard = activeId ? findCard(activeId)?.card : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            cards={columns[stage] ?? []}
            lang={lang}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="rounded-md border bg-card p-3 shadow-lg">
            <div className="text-sm font-medium">{activeCard.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {activeCard.company ?? "—"}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
