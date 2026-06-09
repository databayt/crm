"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
  Building2,
  User,
  Target,
  Activity,
  Database,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Folder,
} from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const AVAILABLE_ICONS = [
  { value: "building-2", label: "Company", icon: Building2 },
  { value: "user", label: "Person", icon: User },
  { value: "target", label: "Opportunity", icon: Target },
  { value: "activity", label: "Activity", icon: Activity },
  { value: "database", label: "Database", icon: Database },
  { value: "briefcase", label: "Briefcase", icon: Briefcase },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "mail", label: "Mail", icon: Mail },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "folder", label: "Folder", icon: Folder },
]

export function NewObjectForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NewObjectInput>({
    resolver: zodResolver(NewObjectSchema),
    defaultValues: { labelSingular: "", labelPlural: "", icon: "database" },
  })
  const singular = watch("labelSingular")
  const plural = watch("labelPlural")
  const watchIcon = watch("icon")

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
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select
              disabled={pending}
              value={watchIcon || "database"}
              onValueChange={(val) => setValue("icon", val)}
            >
              <SelectTrigger id="icon" className="w-full">
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ICONS.map((item) => {
                  const Icon = item.icon
                  return (
                    <SelectItem key={item.value} value={item.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
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
