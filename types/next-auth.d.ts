import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    householdId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      householdId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    householdId: string | null;
  }
}
