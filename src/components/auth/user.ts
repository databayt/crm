import "server-only"

import { db } from "@/lib/db"

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
}

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } })
}
