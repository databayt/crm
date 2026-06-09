"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"

import { moveRecord } from "@/components/platform/record/board-actions"
import { computeDropPosition } from "@/components/platform/record/position"
import { createRecord } from "@/components/platform/record/actions"
import { Plus, Loader2 } from "lucide-react"

export interface BoardCard {
  id: string
  title: string
  subtitle: string | null
  meta: string | null // formatted secondary value, e.g. an amount
  position: number
}

export interface BoardColumn {
  value: string // the group (SELECT) value; "" = the No-value bucket
  label: string
  count: number // TRUE total in the bucket (may exceed the loaded cards)
  metric: string | null // formatted aggregate footer, e.g. "Σ $12,400"
}

const COL = "col:" // droppable id prefix, so a column can't collide with a card id

function Card({
  card,
  basePath,
  overlay = false,
}: {
  card: BoardCard
  basePath: string
  overlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-md border bg-card p-3 shadow-xs active:cursor-grabbing ${
        isDragging && !overlay ? "opacity-40" : ""
      } ${overlay ? "shadow-lg" : ""}`}
    >
      <Link
        href={`${basePath}/${card.id}`}
        className="text-sm font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {card.title}
      </Link>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{card.subtitle ?? "—"}</span>
        <span className="shrink-0 ps-2">{card.meta ?? ""}</span>
      </div>
    </div>
  )
}

function Column({
  column,
  cards,
  basePath,
  objectName,
  groupField,
  displayField,
}: {
  column: BoardColumn
  cards: BoardCard[]
  basePath: string
  objectName: string
  groupField: string
  displayField: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COL}${column.value}` })
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState("")
  const [pending, start] = useTransition()
  const router = useRouter()

  const handleAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    start(async () => {
      const res = await createRecord(objectName, {
        [displayField]: trimmed,
        [groupField]: column.value === "" ? null : column.value,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Card created")
        setValue("")
        setAdding(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between px-1.5">
        <span className="text-sm font-semibold text-foreground/80">
          {column.label}
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {column.count}
        </span>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex min-h-[300px] flex-1 flex-col gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-2.5 transition-colors ${
            isOver ? "border-primary/40 bg-muted/60" : ""
          }`}
        >
          {cards.map((c) => (
            <Card key={c.id} card={c} basePath={basePath} />
          ))}

          {adding && (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-card p-3 shadow-xs">
              <input
                type="text"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                  if (e.key === "Escape") {
                    setAdding(false)
                    setValue("")
                  }
                }}
                disabled={pending}
                placeholder="Enter title..."
                className="w-full bg-transparent text-sm font-medium text-foreground outline-hidden placeholder:text-muted-foreground/60"
              />
              <div className="mt-1 flex items-center justify-between">
                <Button
                  size="xs"
                  onClick={handleAdd}
                  disabled={pending || !value.trim()}
                  className="h-6.5 px-2.5 text-xs font-semibold shadow-xs"
                >
                  {pending ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : null}
                  Add
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setValue("")
                  }}
                  disabled={pending}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
      <div className="mt-2.5 flex items-center justify-between px-1.5">
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:cursor-pointer hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add card
          </button>
        ) : (
          <span />
        )}
        {column.metric ? (
          <div className="rounded-md border border-border/30 bg-muted/50 px-2 py-0.5 text-end text-xs font-semibold text-muted-foreground/95">
            {column.metric}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function RecordBoard({
  basePath,
  objectName,
  groupField,
  columns,
  cardsByGroup,
  displayField,
}: {
  basePath: string
  objectName: string
  groupField: string
  columns: BoardColumn[]
  cardsByGroup: Record<string, BoardCard[]>
  displayField: string
}) {
  const router = useRouter()
  const [board, setBoard] = useState(cardsByGroup)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Did onDragOver already relocate the card this drag? If so its slot is final
  // and onDragEnd must NOT arrayMove again (that double-applies the move). Only a
  // pure within-column reorder — where onDragOver never fires — needs arrayMove.
  const movedByOverRef = useRef(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  // Which column (group value) holds a given id — or, for a column droppable id,
  // the column itself.
  const columnOf = (id: string): string | null => {
    if (id.startsWith(COL)) return id.slice(COL.length)
    for (const col of columns) {
      if ((board[col.value] ?? []).some((c) => c.id === id)) return col.value
    }
    return null
  }

  const activeCard = activeId
    ? (Object.values(board)
        .flat()
        .find((c) => c.id === activeId) ?? null)
    : null

  const onDragStart = (e: DragStartEvent) => {
    movedByOverRef.current = false
    setActiveId(String(e.active.id))
  }

  // Relocate the dragged card into the hovered column as the pointer moves, so
  // the move is visible mid-drag (the classic dnd-kit multi-container pattern).
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const from = columnOf(String(active.id))
    const to = columnOf(String(over.id))
    if (!from || !to || from === to) return

    setBoard((prev) => {
      const fromCards = prev[from] ?? []
      const toCards = prev[to] ?? []
      const moving = fromCards.find((c) => c.id === active.id)
      if (!moving) return prev
      movedByOverRef.current = true
      let overIndex = toCards.findIndex((c) => c.id === over.id)
      if (overIndex === -1) overIndex = toCards.length
      return {
        ...prev,
        [from]: fromCards.filter((c) => c.id !== active.id),
        [to]: [
          ...toCards.slice(0, overIndex),
          moving,
          ...toCards.slice(overIndex),
        ],
      }
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const id = String(active.id)
    const movedByOver = movedByOverRef.current
    setActiveId(null)
    movedByOverRef.current = false
    if (!over) return
    const overId = String(over.id)

    let newPosition: number | null = null
    let committedDest: string | null = null
    setBoard((prev) => {
      // Where the card actually sits now — onDragOver has already relocated it
      // for cross-column moves, so read the destination from fresh state rather
      // than from `over` (which may even be the active card itself).
      let dest: string | null = null
      for (const col of columns) {
        if ((prev[col.value] ?? []).some((c) => c.id === id)) {
          dest = col.value
          break
        }
      }
      if (dest === null) return prev

      const items = prev[dest]
      const oldIndex = items.findIndex((c) => c.id === id)

      // Pure within-column reorder (onDragOver never fired) → arrayMove here.
      // If onDragOver already placed the card, its slot is final — don't re-move.
      let finalItems = items
      if (!movedByOver) {
        let newIndex = items.findIndex((c) => c.id === overId)
        if (newIndex === -1) newIndex = items.length - 1
        if (newIndex === oldIndex) return prev // no actual reorder → no write
        finalItems = arrayMove(items, oldIndex, newIndex)
      }

      const idx = finalItems.findIndex((c) => c.id === id)
      const others = finalItems.filter((c) => c.id !== id)
      newPosition = computeDropPosition(others, idx)
      committedDest = dest
      // Reflect the new position locally so a follow-up drag uses fresh neighbors.
      return {
        ...prev,
        [dest]: finalItems.map((c) =>
          c.id === id ? { ...c, position: newPosition as number } : c,
        ),
      }
    })

    if (newPosition === null || committedDest === null) return
    moveRecord(objectName, id, groupField, committedDest, newPosition).then(
      (res) => {
        if (res.error) {
          toast.error(res.error)
          router.refresh()
        }
      },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.value}
            column={col}
            cards={board[col.value] ?? []}
            basePath={basePath}
            objectName={objectName}
            groupField={groupField}
            displayField={displayField}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <Card card={activeCard} basePath={basePath} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
