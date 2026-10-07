# ZoopFleet Backend – Component Documentation

## Stack

| Technology | Role |
|---|---|
| **Node.js 18+** | JavaScript runtime |
| **Express 4** | HTTP framework — routing, middleware, error handling |
| **TypeScript 5** | Type safety, compiled via `tsc`, run in dev via `tsx watch` |
| **PostgreSQL 14+** | Primary persistent database |
| **Redis 6+** | In-memory cache layer |
| **ioredis** | Redis client library |
| **pg (node-postgres)** | PostgreSQL client library |
| **express-validator** | Input validation and sanitization |
| **dotenv** | Environment variable loading |

---

## Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts          ← PostgreSQL connection pool
│   │   ├── redis.ts       ← Redis client + cache utilities
│   │   └── migrate.ts     ← One-shot DB migration script
│   │
│   ├── types/
│   │   └── agent.ts       ← Shared TypeScript interfaces
│   │
│   ├── models/
│   │   └── agent.ts       ← All DB queries + cache logic
│   │
│   ├── middleware/
│   │   └── validate.ts    ← Request validation rule-sets
│   │
│   ├── controllers/
│   │   └── agent.controller.ts  ← HTTP request handlers
│   │
│   ├── routes/
│   │   └── agents.ts      ← URL-to-controller mapping
│   │
│   ├── tests/
│   │   └── api.test.ts    ← Integration test suite
│   │
│   └── index.ts           ← App entry point
│
├── tsconfig.json
├── package.json
├── .env
└── .env.example
```

---

## Component Breakdown

### `src/index.ts` — App Entry Point

**Job:** Bootstraps the Express app and starts the HTTP server.

**Responsibilities:**
- Loads environment variables via `dotenv/config`
- Registers global middleware in order:
  1. **CORS** — restricts origins to `FRONTEND_URL` (default: `http://localhost:3000`)
  2. **express.json** — parses JSON bodies, capped at 10kb to prevent abuse
  3. **express.urlencoded** — parses form-encoded bodies
  4. **Request Logger** — logs every request with method, path, status code, and duration in ms
- Mounts the `/health` endpoint (used for uptime checks)
- Mounts all agent routes under `/api/agents`
- Registers a **404 handler** for unknown routes
- Registers a global **error handler** for unhandled exceptions
- Calls `app.listen()` on `PORT` (default: 5000)

**Does NOT:** Talk to the database or Redis directly.

---

### `src/config/db.ts` — PostgreSQL Pool

**Job:** Creates and exports a singleton PostgreSQL connection pool.

**Responsibilities:**
- Reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` from env
- Configures the pool with `max: 20` connections, idle timeout, and connect timeout
- Listens for `error` events on idle clients — logs and exits on fatal DB errors
- Exports the `pool` object as the default export

**Why a pool?** Creating a new DB connection per request is expensive (~50–100ms). A pool keeps connections warm and reuses them, dropping query overhead to 1–5ms.

**Used by:** `src/models/agent.ts`, `src/config/migrate.ts`

---

### `src/config/redis.ts` — Redis Client + Cache Utilities

**Job:** Creates the Redis connection and exposes typed cache helper functions.

**Responsibilities:**
- Reads `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` from env
- Sets `lazyConnect: true` — connection is not attempted until the first command
- Implements a **retry strategy** — retries up to 3 times with exponential backoff, then gives up gracefully (app continues without caching)
- Defines the **cache key schema** in `CACHE_KEYS`:

| Key | Content |
|---|---|
| `agents:all` | Full unfiltered agent list |
| `agents:list:{status}:{area}:{page}:{limit}` | Filtered/paginated list |
| `agents:{id}` | Single agent by UUID |
| `agents:stats` | Aggregate stats (total, active, avg rating, etc.) |

- Exports 4 helper functions:

| Function | Purpose |
|---|---|
| `getCache<T>(key)` | Returns parsed object from Redis, or `null` on miss/error |
| `setCache<T>(key, value, ttl?)` | Serializes and stores value with TTL (default: `CACHE_TTL` env var, 300s) |
| `deleteCache(...keys)` | Deletes one or more specific keys |
| `deleteCacheByPattern(pattern)` | Finds all keys matching a glob pattern and deletes them (used for `agents:list:*`) |

**Graceful degradation:** All helper functions swallow Redis errors with `console.warn` — a Redis outage never crashes the API; it simply becomes uncached.

**Used by:** `src/models/agent.ts`

---

### `src/config/migrate.ts` — Database Migration

**Job:** One-shot script to set up the database schema. Run manually via `npm run migrate`.

**Responsibilities:**
- Enables the `uuid-ossp` PostgreSQL extension (for `uuid_generate_v4()`)
- Creates the `agents` table with all columns, constraints, and defaults
- Creates a PL/pgSQL trigger function `update_updated_at_column` that automatically sets `updated_at = NOW()` on every `UPDATE`
- Attaches that trigger to the `agents` table
- Creates 3 indexes: `status`, `service_area`, `email`
- Exits the process after completion (or on failure with code 1)

**NOT** a migration framework — it uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it's safe to re-run but does not support rollbacks or versioned migrations.

---

### `src/types/agent.ts` — Shared TypeScript Interfaces

**Job:** Single source of truth for all data shapes used across the backend.

**Exports:**

| Type | Description |
|---|---|
| `AgentStatus` | `'active' \| 'inactive' \| 'on_leave'` |
| `VehicleType` | `'bike' \| 'scooter' \| 'car' \| 'van' \| 'cycle'` |
| `Agent` | Full DB row shape — all columns including timestamps |
| `AgentCreateInput` | Fields required/allowed when creating an agent |
| `AgentUpdateInput` | `Partial<AgentCreateInput>` — all fields optional for PATCH |
| `Pagination` | `{ total, page, limit, pages }` |
| `AgentListResult` | `{ agents[], pagination, fromCache? }` |
| `AgentResult` | `{ agent, fromCache }` — single agent response |
| `AgentStats` | Aggregate counts and averages |
| `ListFilters` | Query params for the list endpoint |

**Used by:** `model`, `controller` — ensures the data contract is consistent end-to-end.

---

### `src/models/agent.ts` — Data Access Layer

**Job:** All database queries and all cache read/write/invalidation logic live here. No HTTP awareness.

**Exports 6 functions:**

#### `getAllAgents(filters)`
- Accepts `status`, `service_area`, `page`, `limit`
- Builds a dynamic `WHERE` clause based on provided filters
- Checks cache first (keyed by filter combination)
- On cache miss: runs `COUNT(*)` + paginated `SELECT` in parallel with `Promise.all`
- Returns `{ agents[], pagination }` and writes result to cache
- Cache key: `agents:all` (no filters) or `agents:list:{status}:{area}:{page}:{limit}`

#### `getAgentById(id)`
- Checks `agents:{id}` in Redis
- On miss: queries `SELECT * FROM agents WHERE id = $1`
- Returns `{ agent, fromCache: boolean }` or `null` if not found

#### `createAgent(data)`
- Inserts a new row with all provided fields (defaults fill in the rest)
- Uses parameterized queries — no SQL injection risk
- On success: **invalidates** `agents:all`, `agents:list:*` (pattern), `agents:stats`
- Returns the newly created `Agent` row

#### `updateAgent(id, data)`
- Dynamically builds `SET col = $N` only for fields present in `data`
- Guards against arbitrary field injection via `ALLOWED_UPDATE_FIELDS` whitelist
- On success: **invalidates** `agents:{id}`, `agents:all`, `agents:list:*`, `agents:stats`
- Returns updated `Agent` or `null` if ID not found

#### `deleteAgent(id)`
- `DELETE FROM agents WHERE id = $1 RETURNING *`
- On success: **invalidates** `agents:{id}`, `agents:all`, `agents:list:*`, `agents:stats`
- Returns deleted `Agent` or `null` if not found

#### `getStats()`
- Single aggregate query (`COUNT`, `AVG`, `SUM`, `COUNT DISTINCT`)
- Cached under `agents:stats` with a short **60-second TTL** (stats change frequently)
- Returns `AgentStats`

---

### `src/middleware/validate.ts` — Input Validation

**Job:** Defines reusable validation rule-sets for each route using `express-validator`. Acts as a gatekeeper before the controller runs.

**Exports 5 things:**

| Export | Applied to | Validates |
|---|---|---|
| `handleValidationErrors` | All rule-sets | Reads `validationResult`, returns 422 with field-level errors if invalid |
| `createAgentRules` | `POST /api/agents` | full_name (required, 2–100 chars), phone (regex), email (required, valid format), service_area (required), optional fields with type/range checks |
| `updateAgentRules` | `PATCH /api/agents/:id` | UUID format for `:id` + same field rules but all optional |
| `agentIdRule` | `GET /:id`, `DELETE /:id` | UUID format for `:id` only |
| `listQueryRules` | `GET /api/agents` | status in allowed enum, page ≥ 1, limit 1–100 |

**Validation error response shape:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

### `src/controllers/agent.controller.ts` — HTTP Handlers

**Job:** Translates HTTP requests into model calls and HTTP responses. Contains no business logic or SQL — purely glue.

**Exports 5 async functions** (one per route):

| Function | Method | What it does |
|---|---|---|
| `getAgents` | GET | Extracts query params, calls `getAllAgents`, responds 200 |
| `getAgentById` | GET | Calls `getAgentById`, responds 200 or 404 |
| `createAgent` | POST | Calls `createAgent`, responds 201 or 409 (duplicate) |
| `updateAgent` | PATCH | Calls `updateAgent`, responds 200, 404, or 409 |
| `deleteAgent` | DELETE | Calls `deleteAgent`, responds 200 or 404 |
| `getStats` | GET | Calls `getStats`, responds 200 |

**PostgreSQL error handling:** Catches pg error code `23505` (unique_violation) and maps it to a `409 Conflict` with a human-readable message identifying the conflicting field (`email` or `phone`).

All handlers return `Promise<void>` and call `res.status(...).json(...)` — never `return res.json(...)` (aligns with Express 5 typing).

---

### `src/routes/agents.ts` — Route Definitions

**Job:** Registers URL paths, attaches validation middleware arrays, and wires to controller functions.

**Route table:**

| Method | Path | Middleware | Controller |
|---|---|---|---|
| GET | `/stats` | — | `getStats` |
| GET | `/` | `listQueryRules` | `getAgents` |
| GET | `/:id` | `agentIdRule` | `getAgentById` |
| POST | `/` | `createAgentRules` | `createAgent` |
| PATCH | `/:id` | `updateAgentRules` | `updateAgent` |
| DELETE | `/:id` | `agentIdRule` | `deleteAgent` |

> **Note:** `/stats` is registered before `/:id` to prevent Express from interpreting the literal string `"stats"` as a UUID parameter.

---

### `src/tests/api.test.ts` — Integration Test Suite

**Job:** End-to-end HTTP tests that hit the running server (not mocked).

**Run with:** `npm test` (uses `tsx` to execute directly — no compile step needed)

**Coverage:**
- `GET /health` — server is alive
- `POST /api/agents` — create (valid, duplicate email, missing fields → 422)
- `GET /api/agents` — list, filter by status
- `GET /api/agents/:id` — found, not found (404), invalid UUID (422)
- `PATCH /api/agents/:id` — update, not found
- `GET /api/agents/stats` — stats object present
- `DELETE /api/agents/:id` — delete, then 404 on re-delete

Uses Node.js built-in `fetch` (available since Node 18) — no test framework dependency.

---

## Request Lifecycle (end-to-end)

```
Client HTTP Request
        │
        ▼
[ CORS middleware ]      ← checks origin header
        │
        ▼
[ express.json() ]       ← parses body
        │
        ▼
[ Request Logger ]       ← records start time
        │
        ▼
[ Router: agents.ts ]    ← matches method + path
        │
        ▼
[ Validation Middleware ] ← express-validator rules
  ├── Invalid → 422 response (stops here)
  └── Valid   → next()
        │
        ▼
[ Controller ]           ← reads req, calls model
        │
        ▼
[ Model ]
  ├── READ: check Redis → hit? return cached
  │                    → miss? query PostgreSQL → cache → return
  └── WRITE: query PostgreSQL → invalidate Redis keys → return
        │
        ▼
[ Controller ]           ← builds JSON response
        │
        ▼
[ Response Logger ]      ← logs status + ms on 'finish'
        │
        ▼
HTTP Response to Client
```

---

## Environment Variable Reference

| Variable | Default | Used In |
|---|---|---|
| `PORT` | `5000` | `index.ts` |
| `FRONTEND_URL` | `http://localhost:3000` | `index.ts` (CORS) |
| `DB_HOST` | `localhost` | `config/db.ts` |
| `DB_PORT` | `5432` | `config/db.ts` |
| `DB_NAME` | `zoop_agents` | `config/db.ts` |
| `DB_USER` | `postgres` | `config/db.ts` |
| `DB_PASSWORD` | *(required)* | `config/db.ts` |
| `REDIS_HOST` | `localhost` | `config/redis.ts` |
| `REDIS_PORT` | `6379` | `config/redis.ts` |
| `REDIS_PASSWORD` | *(optional)* | `config/redis.ts` |
| `CACHE_TTL` | `300` | `config/redis.ts` |
