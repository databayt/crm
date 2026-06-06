"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createCompany } from "@/components/platform/companies/actions"
import {
  CompanyCreateSchema,
  type CompanyCreateInput,
} from "@/components/platform/companies/validation"
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

const FIELDS: { name: keyof CompanyCreateInput; label: string }[] = [
  { name: "name", label: "Name" },
  { name: "domain_name", label: "Domain" },
  { name: "industry", label: "Industry" },
  { name: "city", label: "City" },
  { name: "country", label: "Country" },
]

export function CompanyForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyCreateInput>({
    resolver: zodResolver(CompanyCreateSchema),
    defaultValues: {
      name: "",
      domain_name: "",
      industry: "",
      city: "",
      country: "",
    },
  })

  const onSubmit = (values: CompanyCreateInput) => {
    start(async () => {
      const res = await createCompany(values)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Company created")
      reset()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add company</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input id={f.name} disabled={pending} {...register(f.name)} />
              {errors[f.name] ? (
                <p className="text-xs text-destructive">
                  {errors[f.name]?.message}
                </p>
              ) : null}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
