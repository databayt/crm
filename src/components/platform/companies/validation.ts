import { z } from "zod"

// Minimal create schema for the Phase 2 slice. The metadata-driven generic form
// (Phase 3) derives its schema from FieldMetadata; this hand-written one proves
// the engine end-to-end for the first object. Keys map to company column names.
export const CompanyCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  domain_name: z.string().max(200).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
})

export type CompanyCreateInput = z.infer<typeof CompanyCreateSchema>
