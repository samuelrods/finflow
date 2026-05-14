# FinFlow Project Instructions

This document provides essential context and instructions for AI agents and developers working on the FinFlow codebase.

## Project Overview

FinFlow is a full-stack personal finance tracker designed for self-hosting. It features a Next.js frontend, a NestJS API backend, and a PostgreSQL database.

### Core Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide React, React Hook Form, TanStack Query.
- **Backend:** NestJS, Prisma ORM, Passport.js (JWT & Refresh Token strategy), Swagger/OpenAPI.
- **Infrastructure:** Docker Compose (Development & Production), Nginx (Reverse Proxy), PostgreSQL.

### Architecture
- **Monorepo Structure:** Managed with simple directory separation (`apps/api`, `apps/web`).
- **Database:** Prisma ORM with PostgreSQL. Migrations are handled automatically in production via the `api` container startup command.
- **Proxy/SSL:** Nginx handles SSL termination and routing in the production stack (`docker-compose.prod.yml`). For Coolify deployments, the proxy is typically handled by Coolify's internal Traefik.

---

## Building and Running

### Local Development
1.  **Environment:** Copy `.env.example` to `.env`.
2.  **Start:** `docker compose up -d --build`
3.  **Migrations:** `docker compose exec api npx prisma migrate dev`
4.  **Seed:** `docker compose exec api npx prisma db seed`
5.  **Access:**
    - Web: http://localhost:3000
    - API: http://localhost:3001/api/v1
    - Docs: http://localhost:3001/api/v1/docs

### Testing
- **Unit Tests (API):** `npm run test` (inside `apps/api`)
- **E2E Tests (API):** `docker compose exec api npm run test:e2e`

---

## Development Conventions

### Code Style
- **NestJS:** Follow standard modular architecture (Controller -> Service -> Repository).
- **Type Safety:** Use explicit types. Avoid `any`. Cast to `NestExpressApplication` in `main.ts` for Express-specific settings.
- **Imports:** Prefer default imports for `cookie-parser`.
- **Swagger:** All API endpoints must be documented with `@ApiOperation`, `@ApiResponse`, and proper DTOs.

### Deployment (Coolify)
The project is optimized for Coolify deployment:
- **Main Compose:** `docker-compose.yml` is the primary deployment manifest.
- **Database:** Can be managed within the compose (current setup) or externally.
- **Next.js:** Uses `standalone` mode for lean production images.
- **Build Args:** `NEXT_PUBLIC_API_URL` must be passed as a build argument to the `web` service.

### Prisma
- **Client Generation:** The Prisma client is generated to `./src/generated/prisma`.
- **Migrations:** Production migrations run automatically on container start: `npx prisma migrate deploy`.

---

## Critical Workflows

### Adding Dependencies
Always install dependencies inside the container to ensure binary compatibility and volume sync:
`docker compose exec api npm install <package>`

### Infrastructure Changes
If modifying `docker-compose.yml`, always verify with a local build before pushing:
`docker compose up -d --build`
