"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { slugifyIdent } from "@/lib/slug"
import { createObject } from "@/components/platform/settings/actions"
import {
  NewObjectSchema,
  type NewObjectInput,
} from "@/components/platform/settings/validation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function NewObjectForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NewObjectInput>({
    resolver: zodResolver(NewObjectSchema),
    defaultValues: { labelSingular: "", labelPlural: "", icon: "" },
  })
  const singular = watch("labelSingular")
  const plural = watch("labelPlural")

  const onSubmit = (values: NewObjectInput) => {
    start(async () => {
      const res = await createObject(values)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Object created")
      reset()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New object</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New object</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="labelSingular">Singular label</Label>
            <Input
              id="labelSingular"
              placeholder="Project"
              disabled={pending}
              {...register("labelSingular")}
            />
            {errors.labelSingular ? (
              <p className="text-xs text-destructive">
                {errors.labelSingular.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="labelPlural">Plural label</Label>
            <Input
              id="labelPlural"
              placeholder="Projects"
              disabled={pending}
              {...register("labelPlural")}
            />
            {errors.labelPlural ? (
              <p className="text-xs text-destructive">
                {errors.labelPlural.message}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Table: {slugifyIdent(singular || "object")} · URL: /
            {slugifyIdent(plural || `${slugifyIdent(singular || "object")}s`)}
          </p>
          <DialogFooter>
            <Button
              type="button"
              disabled={pending}
              onClick={handleSubmit(onSubmit)}
            >
              {pending ? "Creating…" : "Create object"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
