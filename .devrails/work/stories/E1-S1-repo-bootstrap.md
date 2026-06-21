---
id: E1-S1
epic: E1
title: Repo bootstrap & Railway pipeline
status: done
constrained_by: [bfe61279-839d-48b5-802a-de0b17536512, 2dfab60b-ccf5-46d2-bcb4-5fa916f8f79f, 01d42543-7d57-4966-9c6b-51d026978786, 144ee9e1-5a86-445d-88b2-13f8f804a44b]
depends_on: []
---

Initial git commit of the scaffold (repo currently has zero commits), GitHub remote, Railway service + Postgres provisioned, auto-deploy from main, env var scaffolding (.env.example), package renamed happily (done). Done when main deploys to a Railway URL.

## Done

- Git: scaffold committed; `origin` = git@github.com:raghurajah/happily.git, `main` pushed & in sync.
- `.env.example`: DATABASE_URL, AUTH_SECRET, AUTH_URL, E*TRADE placeholders.
- `railway.json`: NIXPACKS builder, pnpm build/start, restart policy. Migrate-on-deploy step to be appended to `startCommand` in E1-S2 once drizzle migrations exist.
- Package already renamed `happily`.

### Manual hand-off (external — your Railway account; no CLI installed)
One-time: create a Railway project, add a **Postgres** plugin, create a **service** from the GitHub repo (auto-deploy from `main`), set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (the Railway public domain). This produces the live URL. Does **not** block local build of downstream stories.
