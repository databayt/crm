import { z } from "zod"

import { FIELD_TYPES } from "@/lib/field-types"

export const NewObjectSchema = z.object({
  labelSingular: z.string().min(1, "Required").max(60),
  labelPlural: z.string().min(1, "Required").max(60),
  icon: z.string().max(40).optional().or(z.literal("")),
})

export const AddFieldSchema = z.object({
  label: z.string().min(1, "Required").max(60),
  type: z.enum(FIELD_TYPES),
  // SELECT / MULTI_SELECT: comma-separated choices. RELATION: target object name.
  choices: z.string().max(500).optional().or(z.literal("")),
  targetObject: z.string().max(60).optional().or(z.literal("")),
})

export type NewObjectInput = z.infer<typeof NewObjectSchema>
export type AddFieldInput = z.infer<typeof AddFieldSchema>
