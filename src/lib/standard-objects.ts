import type { FieldType } from "@/lib/field-types"

// Twenty's standard objects, expressed as seed metadata. On workspace creation
// these become ObjectMetadata + FieldMetadata rows (control plane) and are then
// materialized as real tables in the workspace's data-plane schema — the SAME
// path custom objects take. Labels are single-language (primary locale) per the
// databayt i18n rule; the UI localizes on demand.

export interface StandardFieldDef {
  name: string // snake_case column name
  label: string
  type: FieldType
  isNullable?: boolean
  options?: Record<string, unknown> // SELECT choices, RELATION target, etc.
}

export interface StandardObjectDef {
  nameSingular: string
  namePlural: string
  labelSingular: string
  labelPlural: string
  icon: string
  tableName: string
  position: number
  fields: StandardFieldDef[]
}

export const STANDARD_OBJECTS: StandardObjectDef[] = [
  {
    nameSingular: "company",
    namePlural: "companies",
    labelSingular: "Company",
    labelPlural: "Companies",
    icon: "building-2",
    tableName: "company",
    position: 0,
    fields: [
      { name: "name", label: "Name", type: "TEXT", isNullable: false },
      { name: "domain_name", label: "Domain", type: "URL" },
      { name: "industry", label: "Industry", type: "TEXT" },
      { name: "employees", label: "Employees", type: "NUMBER" },
      { name: "annual_revenue", label: "Annual revenue", type: "CURRENCY" },
      { name: "city", label: "City", type: "TEXT" },
      { name: "country", label: "Country", type: "TEXT" },
      { name: "linkedin_url", label: "LinkedIn", type: "URL" },
    ],
  },
  {
    nameSingular: "person",
    namePlural: "people",
    labelSingular: "Person",
    labelPlural: "People",
    icon: "user",
    tableName: "person",
    position: 1,
    fields: [
      {
        name: "first_name",
        label: "First name",
        type: "TEXT",
        isNullable: false,
      },
      { name: "last_name", label: "Last name", type: "TEXT" },
      { name: "email", label: "Email", type: "EMAIL" },
      { name: "phone", label: "Phone", type: "PHONE" },
      { name: "job_title", label: "Job title", type: "TEXT" },
      {
        name: "company_id",
        label: "Company",
        type: "RELATION",
        options: { targetObject: "company" },
      },
      { name: "linkedin_url", label: "LinkedIn", type: "URL" },
    ],
  },
  {
    nameSingular: "opportunity",
    namePlural: "opportunities",
    labelSingular: "Opportunity",
    labelPlural: "Opportunities",
    icon: "target",
    tableName: "opportunity",
    position: 2,
    fields: [
      { name: "name", label: "Name", type: "TEXT", isNullable: false },
      { name: "amount", label: "Amount", type: "CURRENCY" },
      { name: "currency", label: "Currency", type: "TEXT" },
      {
        name: "stage",
        label: "Stage",
        type: "SELECT",
        options: {
          choices: ["NEW", "QUALIFIED", "PROPOSAL", "WON", "LOST"],
        },
      },
      { name: "close_date", label: "Close date", type: "DATE" },
      { name: "probability", label: "Probability", type: "NUMBER" },
      {
        name: "company_id",
        label: "Company",
        type: "RELATION",
        options: { targetObject: "company" },
      },
    ],
  },
  {
    nameSingular: "activity",
    namePlural: "activities",
    labelSingular: "Activity",
    labelPlural: "Activities",
    icon: "activity",
    tableName: "activity",
    position: 3,
    fields: [
      {
        name: "type",
        label: "Type",
        type: "SELECT",
        options: { choices: ["NOTE", "TASK", "EMAIL", "CALL", "MEETING"] },
      },
      { name: "title", label: "Title", type: "TEXT" },
      { name: "body", label: "Body", type: "TEXT" },
      { name: "due_date", label: "Due date", type: "DATETIME" },
      {
        name: "status",
        label: "Status",
        type: "SELECT",
        options: { choices: ["TODO", "IN_PROGRESS", "DONE"] },
      },
      {
        name: "company_id",
        label: "Company",
        type: "RELATION",
        options: { targetObject: "company" },
      },
      {
        name: "person_id",
        label: "Person",
        type: "RELATION",
        options: { targetObject: "person" },
      },
      {
        name: "opportunity_id",
        label: "Opportunity",
        type: "RELATION",
        options: { targetObject: "opportunity" },
      },
    ],
  },
]
