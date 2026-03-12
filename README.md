# Personal Finance Tracker

## Folder Structure

```
finance-tracker/
├── apps/
│   ├── api/          ← Nest.js
│   └── web/          ← Next.js
├── shared/           ← shared TS types/DTOs
├── docker-compose.yml
├── .env.example
└── README.md
```

## Local Development Environment

This project utilizes Docker Compose to manage an isolated development environment. Because we use anonymous volumes to isolate Node.js dependencies from the host machine's operating system, standard dependency management requires specific operational workflows to maintain state and avoid unexpected data loss.

### Initial Setup

To start the application for the first time, or after a complete environment teardown, build the images and start the containers in detached mode:

```bash
docker compose up -d --build
```

### Dependency Management and State

Our Docker architecture intentionally uses a bind mount for live code reloading alongside an anonymous volume (`/app/node_modules`). This anonymous volume protects the container's internal dependencies from being overwritten by the host machine's local environment. 

While this prevents OS-level binary conflicts, it creates a persistent state cache. If you modify `package.json`, the container will not automatically adopt the new dependencies upon a standard restart. It will continue to use the stale anonymous volume.

To safely introduce new packages without tearing down the infrastructure, use real-time injection. Execute the installation directly inside the running container. This updates the internal volume and immediately syncs the updated `package.json` back to your host machine without requiring a restart:

```bash
# Example: Installing a package in the API container
docker compose exec api npm install <package-name>
```

If you pull upstream changes where multiple dependencies have been altered, a targeted rebuild is the most robust approach. This forces Docker to recreate the specific container and explicitly discard its isolated dependency volume, while preserving all other system state:

```bash
# Rebuilds the API container and recreates its anonymous volumes
docker compose up -d --build -V api
```

### Destructive Operations and Hidden Fragilities

When spinning down the environment, exercise extreme caution regarding volume destruction.

```bash
# Safely stops and removes containers
docker compose down
```

**Critical Warning:** Executing `docker compose down -v` is a nuclear option. The `-v` flag destroys all volumes declared in the Docker configuration, including the persistent `postgres_data` volume. Running this command will permanently wipe your local development database. 

Always rely on the targeted `-V` rebuild method detailed above to manage stale dependency state, rather than destroying the entire environment infrastructure to fix a local package issue.

## Architecture Decisions

The API follows a modular layered architecture (Controller → Service → Repository), organized by feature slice rather than by layer. Domain-Driven Design was considered and deliberately set aside: DDD's full apparatus — aggregates, domain events, and bounded contexts — exists to manage domains where the business logic itself is the hard problem. A personal finance tracker doesn't have that problem. Its complexity lies in the plumbing, not the domain rules. Applying DDD here would have introduced significant ceremony with no corresponding reduction in complexity, a pattern sometimes called "architecture astronomy." The design borrows selectively from DDD's tactical patterns — the repository abstraction, strict DTO boundaries, and domain-aligned naming — while keeping the overall structure simple, readable, and proportionate to the problem. Each feature module is fully self-contained, making it easy to locate, modify, and test in isolation.
