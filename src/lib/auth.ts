import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "node:crypto";
import { authenticate } from "@/lib/users";

/**
 * AUTH_SECRET should be set in Vercel. If it is forgotten, derive a stable
 * secret from the database URL instead of failing with "server configuration".
 */
function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  const seed = process.env.DATABASE_URL || process.env.POSTGRES_URL || "certificate-studio-dev";
  return createHash("sha256").update("cs-auth:" + seed).digest("hex");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: secret(),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const r = await authenticate(email, password);
        if (r.state !== "ok") return null;
        return { id: r.user.id, name: r.user.name, email: r.user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id as string;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
