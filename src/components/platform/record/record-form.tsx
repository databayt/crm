"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { type Resolver, useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  buildRecordSchema,
  type RecordFormValues,
  toFormValues,
} from "@/lib/record-schema"
import {
  createRecord,
  updateRecord,
} from "@/components/platform/record/actions"
import {
  FieldInput,
  type InputFieldDef,
  type RelationOption,
} from "@/components/platform/record/field-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function RecordForm({
  objectName,
  objectLabel,
  fields,
  relationOptions,
  record,
  trigger,
}: {
  objectName: string
  objectLabel: string
  fields: InputFieldDef[]
  relationOptions: Record<string, RelationOption[]>
  record?: Record<string, unknown> | null
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const editing = !!record?.id

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(
      buildRecordSchema(fields),
    ) as Resolver<RecordFormValues>,
    defaultValues: toFormValues(fields, record),
  })

  const onSubmit = (values: RecordFormValues) => {
    start(async () => {
      const res = editing
        ? await updateRecord(objectName, String(record?.id), values)
        : await createRecord(objectName, values)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? "Saved" : `${objectLabel} created`)
      if (!editing) reset(toFormValues(fields))
      setOpen(false)
      router.refresh()
    })
  }

  const lower = objectLabel.toLowerCase()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">New {lower}</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${lower}` : `New ${lower}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={f.name}>
                {f.label}
                {f.isNullable === false ? " *" : ""}
              </Label>
              <FieldInput
                field={f}
                register={register}
                disabled={pending}
                options={relationOptions[f.name]}
              />
              {errors[f.name] ? (
                <p className="text-xs text-destructive">
                  {String(errors[f.name]?.message)}
                </p>
              ) : null}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
