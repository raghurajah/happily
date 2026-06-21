import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Next 16 proxy convention (formerly middleware). Edge-safe instance — authConfig
// has no DB-backed providers. The `authorized` callback gates every matched route.
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Gate everything except Next internals, the auth API, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
