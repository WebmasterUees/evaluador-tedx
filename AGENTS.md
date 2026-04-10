# AGENTS.md — evaluador-tedx

## Stack

- **Next.js 15** (App Router, standalone output) — React 19, TypeScript 6
- **Auth**: NextAuth v5 beta (Credentials provider, JWT strategy). Config at `src/auth.ts`, type augmentation at `src/types/next-auth.d.ts`
- **DB**: PostgreSQL + Prisma 6 ORM. Schema at `prisma/schema.prisma`
- **Styling**: Tailwind CSS 3 + PostCSS + autoprefixer (no component library)
- **Charts**: Recharts
- **Deploy**: standalone build → PM2 (`ecosystem.config.cjs`), port 3005

## Commands

```bash
npm run dev            # dev server on :3005
npm run build          # production build (standalone)
npm run lint           # next lint (ESLint)
npm run prisma:generate   # regenerate Prisma client (run after schema changes)
npm run prisma:migrate    # prisma migrate deploy (production migrations)
npm run prisma:seed       # seed DB via tsx (prisma/seed.ts)
```

No test runner is configured. No CI workflows exist.

## Path alias

`@/*` maps to `./src/*` (tsconfig paths). Use `@/lib/prisma`, `@/components/...`, etc.

## Architecture

### Roles & route protection

Three roles: `ADMIN`, `OPERATOR`, `EVALUATOR`. Middleware at root `middleware.ts` handles redirects. Server-side guard helpers in `src/lib/auth-server.ts`:
- `requireUser()` — redirects unauthenticated to `/login`
- `requireRoles(["ADMIN", "OPERATOR"])` — role gate used in layouts

### Route structure

| Path prefix | Access | Purpose |
|---|---|---|
| `/admin/*` | ADMIN, OPERATOR | Manage participants, evaluations, dashboards |
| `/operador/*` | ADMIN, OPERATOR | Operator view |
| `/evaluator/*` | EVALUATOR | Evaluate participants |
| `/dashboard/*` | Any authenticated | View results |
| `/dashboards/*` | Any authenticated | Dashboard listings |
| `/login` | Public | Credentials login |

### Data-fetching patterns

- **Server Components** with direct Prisma calls are the primary pattern (no API layer for reads in most pages)
- **Server Actions** (`"use server"`) are used inline in page files (e.g., `src/app/evaluator/page.tsx`)
- Minimal API routes — only `api/auth/[...nextauth]` and `api/dashboard/[id]`
- No client-side data fetching hooks currently in use (the `PROJECT_STRUCTURE.md` mentions hooks/services/repositories that don't exist in the codebase)

### Prisma singleton

`src/lib/prisma.ts` exports a global singleton. Import from `@/lib/prisma`, never instantiate `PrismaClient` directly.

### Auth details

- Passwords hashed with SHA-256 (`src/lib/auth.ts` — `hashPassword`). No bcrypt/argon.
- Session user extended with `id: string` and `role: Role` (Prisma enum)
- Auth config exports `{ handlers, auth, signIn, signOut }` from `src/auth.ts`

## Gotchas

- `PROJECT_STRUCTURE.md` is **stale** — it references `server/services/`, `server/repositories/`, `hooks/`, `types/evaluator.ts`, `types/api.ts` that don't exist. Don't trust it for navigation.
- `@tailwindcss/postcss` is installed as devDep but `postcss.config.js` uses plain `tailwindcss` plugin. Both v3 and v4 packages coexist — stick with the v3 config pattern.
- `allowJs: false` in tsconfig — all source must be TypeScript.
- The evaluator page (`src/app/evaluator/page.tsx`) is a large file (~375 lines) mixing server actions, data fetching, and UI. Expect it to be the most complex page.

## Conventions

- Prisma fields use `snake_case`; TypeScript variables use `camelCase`
- No barrel exports (`index.ts` re-exports) anywhere
- Components are colocated by role: `src/components/admin/`, `src/components/evaluator/`, etc.
- Layouts handle auth gating per role section (not individual pages)
