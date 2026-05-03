# AfriLance Workspace

## Overview

Full-stack freelance marketplace for African freelancers and clients — built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui + Wouter routing
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **Auth**: Clerk (Replit-managed, proxy at `/api/__clerk`)
- **API**: OpenAPI spec → Orval codegen → React Query hooks
- **Validation**: Zod + drizzle-zod

## Artifacts

| Artifact | Dir | Preview Path | Port |
|---|---|---|---|
| AfriLance (web) | `artifacts/afrilance` | `/` | env PORT |
| API Server | `artifacts/api-server` | `/api` | env PORT |

## Architecture

```
artifacts/
  afrilance/         # React+Vite frontend
    src/
      App.tsx        # Clerk provider + full Wouter routing
      pages/         # All page components
      components/    # Layout, StarRating, SkillBadge, StatusBadge, UserAvatar
      lib/           # queryClient.ts, format.ts, utils.ts
  api-server/
    src/
      routes/        # All API route handlers
      db/            # Drizzle schema + migrations
      middlewares/   # Clerk proxy middleware, requireAuth

lib/
  api-zod/           # OpenAPI spec (openapi.yaml)
  api-client-react/  # Orval-generated React Query hooks + custom-fetch
  db/                # Shared Drizzle schema
```

## Features Built

- **Auth**: Clerk sign-in/sign-up with branded appearance (African forest green + warm gold), proxy routing
- **Roles**: Freelancer, Client, Admin — onboarding flow sets role
- **Jobs**: Post jobs, browse with filters (search/category/remote/budget), job detail + proposals
- **Proposals**: Freelancers submit proposals; clients accept/reject/review
- **Freelancers**: Browse directory with filters, profile pages with reviews
- **Dashboard**: Role-aware dashboards (freelancer stats vs client stats)
- **Messages**: Real-time conversation threads
- **Notifications**: Per-user notifications with mark-read
- **Payments**: Mock escrow system — escrowed → released
- **Settings**: Edit profile, skills, hourly rate
- **Admin**: Stats overview, user management (block/unblock), job moderation (flag/unflag)

## Design

- Theme: African forest green (`#0B3B24`) + warm gold (`#D4AF37`)
- Font: Plus Jakarta Sans
- Components: shadcn/ui with custom Tailwind v4 theme
- Clerk: `@clerk/themes` shadcn theme with custom branded appearance

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `echo 'export * from "./generated/api";' > lib/api-zod/src/index.ts` — fix Orval barrel after codegen

## Seed Data

- 7 profiles: 2 clients, 4 freelancers, 1 admin
- 5 jobs across various categories
- Admin credentials: sign in with Clerk, profile role = "admin"
