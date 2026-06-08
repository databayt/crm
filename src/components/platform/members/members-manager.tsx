"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ASSIGNABLE_ROLES } from "@/lib/permissions"
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  resendInvite,
  revokeInvite,
} from "@/components/platform/members/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MemberRow {
  id: string
  name: string | null
  email: string
  role: string
  isSelf: boolean
  isOwner: boolean
}
interface InviteRow {
  id: string
  email: string
  role: string
}

const selectClass =
  "border-input dark:bg-input/30 h-8 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

export function MembersManager({
  lang,
  members,
  invites,
}: {
  lang: string
  members: MemberRow[]
  invites: InviteRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("MEMBER")
  const [link, setLink] = useState<string | null>(null)

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text)
    toast.success("Invite link copied")
  }

  const onInvite = () =>
    start(async () => {
      const res = await inviteMember({ email, role }, lang)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setLink(res.inviteLink ?? null)
      setEmail("")
      toast.success("Invite created — copy the link below")
      router.refresh()
    })

  const onChangeRole = (id: string, next: string) =>
    start(async () => {
      const res = await changeMemberRole(id, next)
      if (res.error) {
        toast.error(res.error)
        return
      }
      router.refresh()
    })

  const onRemove = (id: string) =>
    start(async () => {
      const res = await removeMember(id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Member removed")
      router.refresh()
    })

  const onResend = (id: string) =>
    start(async () => {
      const res = await resendInvite(id, lang)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setLink(res.inviteLink ?? null)
      toast.success("Fresh invite link ready below")
    })

  const onRevoke = (id: string) =>
    start(async () => {
      const res = await revokeInvite(id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("Invite revoked")
      router.refresh()
    })

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Invite a teammate</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="max-w-xs"
          />
          <select
            aria-label="Role"
            className={selectClass}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button disabled={pending || !email.trim()} onClick={onInvite}>
            Invite
          </Button>
        </div>
        {link ? (
          <div className="flex max-w-xl items-center gap-2">
            <Input readOnly value={link} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={() => copy(link)}>
              Copy
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No email is sent — share the generated link with the invitee.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Team ({members.length})</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">Name</th>
                <th className="px-4 py-2 text-start font-medium">Email</th>
                <th className="px-4 py-2 text-start font-medium">Role</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-2">
                    {m.isOwner || m.isSelf ? (
                      <span>{m.role}</span>
                    ) : (
                      <select
                        aria-label={`Role for ${m.email}`}
                        className={selectClass}
                        value={m.role}
                        disabled={pending}
                        onChange={(e) => onChangeRole(m.id, e.target.value)}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 text-end">
                    {!m.isOwner && !m.isSelf ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => onRemove(m.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Pending invites ({invites.length})
          </h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">Email</th>
                  <th className="px-4 py-2 text-start font-medium">Role</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-2">{i.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {i.role}
                    </td>
                    <td className="px-4 py-2 text-end">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => onResend(i.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground"
                        disabled={pending}
                        onClick={() => onRevoke(i.id)}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
