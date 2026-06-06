import { listCompanies } from "@/components/platform/companies/actions"
import { CompanyForm } from "@/components/platform/companies/company-form"

function cell(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value)
}

export async function CompaniesContent() {
  const companies = await listCompanies()

  return (
    <div className="container-wrapper py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} total
          </p>
        </div>
        <CompanyForm />
      </div>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No companies yet. Add your first one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">Name</th>
                <th className="px-4 py-2 text-start font-medium">Industry</th>
                <th className="px-4 py-2 text-start font-medium">City</th>
                <th className="px-4 py-2 text-start font-medium">Country</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{cell(c.name)}</td>
                  <td className="px-4 py-2">{cell(c.industry)}</td>
                  <td className="px-4 py-2">{cell(c.city)}</td>
                  <td className="px-4 py-2">{cell(c.country)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
