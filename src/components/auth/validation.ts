import { z } from "zod"

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
})

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.email(),
  password: z.string().min(8, "At least 8 characters"),
})

// Subdomain: lowercase letters, numbers, hyphens; not starting/ending with a hyphen.
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  subdomain: z
    .string()
    .min(3, "At least 3 characters")
    .max(40)
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Lowercase letters, numbers, and hyphens only",
    ),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>
