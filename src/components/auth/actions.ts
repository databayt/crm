"use server"

import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

import { auth, signIn, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  LoginSchema,
  RegisterSchema,
  type LoginInput,
  type RegisterInput,
} from "@/components/auth/validation"
import { getUserByEmail } from "@/components/auth/user"

export type AuthResult = { error?: string; success?: boolean }

export async function login(
  values: LoginInput,
  callbackUrl?: string | null,
): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse(values)
  if (!parsed.success) return { error: "Invalid fields" }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl || "/join",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Invalid email or password"
            : "Something went wrong",
      }
    }
    throw error // re-throw the NEXT_REDIRECT signal from signIn
  }
  return { success: true }
}

export async function register(values: RegisterInput): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse(values)
  if (!parsed.success) return { error: "Invalid fields" }

  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  if (await getUserByEmail(normalizedEmail)) {
    return { error: "Email already in use" }
  }

  const hashed = await bcrypt.hash(password, 10)
  await db.user.create({
    data: { name, email: normalizedEmail, password: hashed },
  })

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/join",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — please sign in." }
    }
    throw error
  }
  return { success: true }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" })
}

export async function currentUser() {
  const session = await auth()
  return session?.user ?? null
}
