# Personal Finance Tracker

## Architecture Diagram

```mermaid
graph TD
    User([User])
    
    subgraph "Docker Compose Environment"
        Web["Web Frontend\n(Next.js)"]
        API["API Backend\n(Nest.js)"]
        DB[("PostgreSQL\n(Database)")]
        Studio["Prisma Studio\n(DB GUI)"]
    end
    
    User -->|HTTP (Port 3000)| Web
    User -->|HTTP (Port 3001)| API
    User -->|HTTP (Port 5555)| Studio
    
    Web -->|HTTP Requests| API
    API -->|Prisma ORM| DB
    Studio -->|Prisma ORM| DB
```

## Folder Structure

```
finance-tracker/
├── apps/
│   ├── api/          ← Nest.js Backend
│   └── web/          ← Next.js Frontend
├── docker-compose.yml
├── .env.example
└── README.md
```

## Setup Instructions

### Initial Setup

1. **Environment Variables**
   Create a `.env` file in the root directory by copying the provided example template:
   ```bash
   cp .env.example .env
   ```
   *(Update the `.env` values if necessary, especially secrets).*

2. **Start the Infrastructure**
   Build the Docker images and start the containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

3. **Database Initialization**
   Apply the existing Prisma migrations to initialize the PostgreSQL database schema. Run this command inside the `api` container:
   ```bash
   docker compose exec api npx prisma migrate dev
   ```

4. **Seed the Database**
   Populate the database with initial categories and data. Run this command inside the `api` container:
   ```bash
   docker compose exec api npx prisma db seed
   ```

5. **Access the Application**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
   - **Prisma Studio (DB Admin):** To start Prisma studio, start docker compose with the tools profile (`docker compose --profile tools up -d`) and visit [http://localhost:5555](http://localhost:5555).

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

## Design Decisions

- **Monorepo-style structure:** The project is divided into an `api` (backend) and `web` (frontend) directory to keep the full stack co-located while separating concerns and allowing shared typings/configurations if needed.
- **Dockerized Development:** We rely heavily on Docker Compose to guarantee environment parity and isolate dependencies. This simplifies onboarding but necessitates strict dependency management workflows.
- **Modular Architecture vs. DDD:** The API follows a modular layered architecture (Controller → Service → Repository), organized by feature slice rather than by layer. Domain-Driven Design was considered and deliberately set aside: DDD's full apparatus — aggregates, domain events, and bounded contexts — exists to manage domains where the business logic itself is the hard problem. A personal finance tracker doesn't have that problem. Its complexity lies in the plumbing, not the domain rules. Applying DDD here would have introduced significant ceremony with no corresponding reduction in complexity, a pattern sometimes called "architecture astronomy." The design borrows selectively from DDD's tactical patterns — the repository abstraction, strict DTO boundaries, and domain-aligned naming — while keeping the overall structure simple, readable, and proportionate to the problem. Each feature module is fully self-contained, making it easy to locate, modify, and test in isolation.
- **Next.js App Router:** The frontend utilizes the Next.js App Router for optimized server-side rendering and streamlined layouts, paired with Tailwind CSS and accessible UI primitives for rapid component development.

## Testing

The project includes comprehensive test coverage, divided into unit tests and integration (e2e) tests.

### Unit Testing

Unit tests are co-located with their respective modules (often inside `__tests__` directories or ending in `.spec.ts`). They focus on testing individual services, controllers, and utilities in isolation, typically mocking external dependencies such as the database.

To run the unit tests:

```bash
cd apps/api
npm run test
```

To run unit tests in watch mode during development:

```bash
npm run test:watch
```

To run unit tests with coverage reporting:

```bash
npm run test:cov
```

### Integration (e2e) Testing

End-to-end (e2e) integration tests validate the full request-response lifecycle of the API, including database interactions. They are located in the `apps/api/test/` directory.

These tests hit a real PostgreSQL database to ensure that queries, module wiring, validation, and serialization all work correctly together.

**Note:** The e2e tests require access to the environment variables and the database network. You must run them directly inside the `api` container while the Docker Compose environment is running. Be aware that the tests will clear the database before each suite to ensure a clean state.

To run the e2e tests:

```bash
docker compose exec api npm run test:e2e
```