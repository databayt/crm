"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createWorkspace } from "@/components/onboarding/actions"
import {
  CreateWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@/components/auth/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"

export function CreateWorkspaceForm({ lang }: { lang: string }) {
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(CreateWorkspaceSchema),
    defaultValues: { name: "", subdomain: "" },
  })
  const subdomain = watch("subdomain")

  const onSubmit = (values: CreateWorkspaceInput) => {
    start(async () => {
      const res = await createWorkspace(values, lang)
      if (res?.error) toast.error(res.error)
      // On success the action redirects to the new workspace subdomain.
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          placeholder="Acme Inc."
          disabled={pending}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="subdomain">Subdomain</Label>
        <Input
          id="subdomain"
          placeholder="acme"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          {...register("subdomain")}
        />
        <p className="text-xs text-muted-foreground">
          {(subdomain || "your-workspace").toLowerCase()}.{ROOT_DOMAIN}
        </p>
        {errors.subdomain ? (
          <p className="text-xs text-destructive">{errors.subdomain.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  )
}
