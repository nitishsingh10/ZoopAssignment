# ZoopFleet – Delivery Agent Management

A full-stack web application for managing delivery agents. Built with **Node.js + Express** (backend), **Next.js** (frontend), **PostgreSQL** (database), and **Redis** (caching).

---

## Tech Stack

| Layer      | Technology          | Reason                                                        |
|------------|---------------------|---------------------------------------------------------------|
| Backend    | Node.js + Express   | Lightweight, fast, great ecosystem for REST APIs              |
| Frontend   | Next.js (App Router) | React-based, SSR-capable, TypeScript support                 |
| Database   | **PostgreSQL**      | Relational, ACID-compliant, UUID support, great for structured records |
| Cache      | Redis (ioredis)     | In-memory, sub-millisecond reads, TTL-based invalidation      |

### Why PostgreSQL?
PostgreSQL was chosen over MongoDB or SQLite because:
- Agent records are structured and relational
- ACID compliance ensures data consistency on updates/deletes
- UUID primary keys work natively with the `uuid-ossp` extension
- Excellent support for indexing on `status`, `service_area`, and `email`

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14 running locally
- Redis ≥ 6 running locally
- npm ≥ 9

---

## Setup & Run Instructions

### 1. Clone the repository

```bash
git clone https://github.com/nitishsingh10/ZoopAssignment.git
cd ZoopAssignment
```

### 2. Backend Setup

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Install dependencies
npm install

# Run database migration (creates the agents table)
npm run migrate

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env.local
# Default value: NEXT_PUBLIC_API_URL=http://localhost:5000

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Default       | Description                        |
|------------------|---------------|------------------------------------|
| `PORT`           | `5000`        | Server port                        |
| `NODE_ENV`       | `development` | Environment                        |
| `DB_HOST`        | `localhost`   | PostgreSQL host                    |
| `DB_PORT`        | `5432`        | PostgreSQL port                    |
| `DB_NAME`        | `zoop_agents` | Database name                      |
| `DB_USER`        | `postgres`    | Database user                      |
| `DB_PASSWORD`    | *(required)*  | Database password                  |
| `REDIS_HOST`     | `localhost`   | Redis host                         |
| `REDIS_PORT`     | `6379`        | Redis port                         |
| `REDIS_PASSWORD` | *(optional)*  | Redis password (if auth enabled)   |
| `CACHE_TTL`      | `300`         | Cache TTL in seconds (default 5min)|

### Frontend (`frontend/.env.local`)

| Variable               | Default                  | Description        |
|------------------------|--------------------------|--------------------|
| `NEXT_PUBLIC_API_URL`  | `http://localhost:5000`  | Backend API URL    |

---

## Database Migration

The migration creates the `agents` table with:
- UUID primary key (via `uuid-ossp` extension)
- Unique constraints on `email` and `phone`
- Status CHECK constraint: `active | inactive | on_leave`
- Vehicle type CHECK constraint: `bike | scooter | car | van | cycle`
- Auto-updating `updated_at` trigger
- Indexes on `status`, `service_area`, and `email`

```bash
cd backend && npm run migrate
```

---

## Redis Caching Strategy

### What is Cached

| Cache Key                            | Content                          | TTL      |
|--------------------------------------|----------------------------------|----------|
| `agents:all`                         | Full agent list (no filters)     | 5 min    |
| `agents:list:{status}:{area}:{page}:{limit}` | Filtered/paginated lists | 5 min    |
| `agents:{id}`                        | Individual agent by UUID         | 5 min    |
| `agents:stats`                       | Aggregate stats for dashboard    | 60 sec   |

### Cache Invalidation

All write operations (create, update, delete) immediately invalidate:
1. The individual agent key (`agents:{id}`)
2. All list caches via pattern delete (`agents:list:*`)
3. The main list key (`agents:all`)

Stats cache has a short 60-second TTL as it's cheap to recompute.

### Graceful Degradation

If Redis is unavailable, the app continues to function — all reads fall through to PostgreSQL. Cache errors are logged as warnings, not fatal errors.

---

## API Reference

Base URL: `http://localhost:5000/api/agents`

| Method   | Endpoint          | Description                        |
|----------|-------------------|------------------------------------|
| `GET`    | `/`               | List all agents (with filters)     |
| `GET`    | `/stats`          | Get aggregate stats                |
| `GET`    | `/:id`            | Get a single agent by UUID         |
| `POST`   | `/`               | Create a new agent                 |
| `PATCH`  | `/:id`            | Update an agent (partial update)   |
| `DELETE` | `/:id`            | Delete an agent                    |

### Query Parameters (GET /)

| Parameter      | Type   | Description                          |
|----------------|--------|--------------------------------------|
| `status`       | string | Filter by `active|inactive|on_leave` |
| `service_area` | string | Search by service area (partial)     |
| `page`         | int    | Page number (default: 1)             |
| `limit`        | int    | Results per page (default: 10, max: 100) |

### Example: Create Agent

```bash
curl -X POST http://localhost:5000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Rahul Sharma",
    "phone": "+91-9876543210",
    "email": "rahul@example.com",
    "service_area": "Bangalore North",
    "status": "active",
    "vehicle_type": "bike"
  }'
```

---

## Testing

### Run API Tests

Make sure the backend server is running, then:

```bash
cd backend && npm test
```

The test suite covers:
- ✅ Health check
- ✅ Create agent (valid data, duplicate email/phone, missing fields)
- ✅ List agents (with and without filters)
- ✅ Get agent by ID (found, not found, invalid UUID)
- ✅ Update agent (valid, not found)
- ✅ Delete agent (success, then 404)
- ✅ Stats endpoint

### Manual CRUD Testing

1. **Open** `http://localhost:3000`
2. **Create** an agent using the "Add Agent" button
3. **View** agent details by clicking any row
4. **Edit** via the pencil icon or "Edit Agent" in detail view
5. **Delete** via the trash icon or "Delete" in detail view
6. **Filter** by status using the dropdown or sidebar
7. **Search** by service area using the search bar
8. **Refresh** — second load should show "⚡ Cached" indicator

---

## Project Structure

```
ZoopAssignment/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          # PostgreSQL pool
│   │   │   ├── redis.js       # Redis client + cache helpers
│   │   │   └── migrate.js     # DB migration script
│   │   ├── models/
│   │   │   └── agent.js       # CRUD + caching logic
│   │   ├── controllers/
│   │   │   └── agent.controller.js
│   │   ├── routes/
│   │   │   └── agents.js
│   │   ├── middleware/
│   │   │   └── validate.js    # express-validator rules
│   │   ├── tests/
│   │   │   └── api.test.js    # Integration tests
│   │   └── index.js           # App entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── globals.css    # Design system
    │   │   ├── layout.tsx
    │   │   └── page.tsx       # Main dashboard
    │   ├── components/
    │   │   ├── AgentForm.tsx
    │   │   ├── AgentDetail.tsx
    │   │   ├── ConfirmDelete.tsx
    │   │   └── Toast.tsx
    │   ├── lib/
    │   │   └── api.ts         # Typed API client
    │   └── types/
    │       └── agent.ts       # TypeScript types
    ├── .env.example
    └── package.json
```
