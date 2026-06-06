import { PrismaAdapter } from "@auth/prisma-adapter"
import type { GlobalRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

import { db } from "@/lib/db"
import { LoginSchema } from "@/components/auth/validation"

// Cross-subdomain cookie domain. The session must be readable on the main domain
// (login) AND every workspace subdomain. Browsers REJECT a Domain attribute on
// `localhost`, so on plain localhost we fall back to host-only cookies (login
// then works per-host). For seamless cross-subdomain dev use a real wildcard
// loopback domain (e.g. NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000 → `.lvh.me`).
// Prod (`.crm.databayt.org`) shares across all subdomains natively.
const rootHost = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000"
).split(":")[0]
const useSecureCookies = process.env.NODE_ENV === "production"
const cookieDomain =
  rootHost === "localhost" || rootHost === "127.0.0.1"
    ? undefined
    : `.${rootHost}`

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: cookieDomain,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      authorize: async (credentials) => {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        })
        if (!user?.password || user.isSuspended) return null
        const valid = await bcrypt.compare(password, user.password)
        return valid ? user : null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role ?? "USER"
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = (token.role as GlobalRole | undefined) ?? "USER"
      }
      return session
    },
  },
})
