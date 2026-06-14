import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: no DB, no bcrypt — just session shape and route gating.
 * The middleware builds a NextAuth instance from THIS (so it runs on the edge);
 * the full instance in `auth.ts` adds the Credentials provider (which needs the DB).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Closed membership (decision c1c6e5f9): no public signup, no SSO. Providers are
  // attached in auth.ts; here it's empty so this config stays edge-safe.
  providers: [],
  callbacks: {
    // Gate every route except /login. Returning false sends unauthenticated users
    // to the signIn page; logged-in users hitting /login bounce to the dashboard.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const onLogin = nextUrl.pathname.startsWith("/login");
      if (onLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    // Carry user id + householdId on the token and expose them on the session.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.householdId = (user as { householdId?: string | null }).householdId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.householdId = (token.householdId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
