"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/lib/actions/auth";
import { navItems } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function Wordmark() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-semibold tracking-tight text-ink">Happily</span>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null } | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5">
          <Wordmark />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent-dim text-ink"
                    : "text-muted hover:bg-elevated hover:text-ink"
                }`}
              >
                <span
                  className={`text-base ${active ? "text-accent-strong" : "text-faint"}`}
                  aria-hidden
                >
                  {item.glyph}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="border-t border-line px-5 py-4">
            <div className="truncate text-sm text-ink">{user.name ?? user.email}</div>
            <div className="truncate text-xs text-faint">{user.email}</div>
            <form action={signOutAction}>
              <button type="submit" className="mt-2 text-xs text-faint hover:text-accent-strong">
                Sign out
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <Wordmark />
        {user && <span className="truncate text-xs text-faint">{user.email}</span>}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                active ? "text-accent-strong" : "text-faint"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
