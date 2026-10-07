# ZoopFleet – Delivery Agent Management

A full-stack web application for managing delivery agents. Built with **Node.js + Express + TypeScript** (backend), **Next.js** (frontend), **Neon DB / PostgreSQL** (database), and **Upstash Redis** (caching).

---

## Tech Stack

| Layer    | Technology              | Reason                                                              |
|----------|-------------------------|---------------------------------------------------------------------|
| Backend  | Node.js + Express + TS  | Lightweight, fast, type-safe REST API                               |
| Frontend | Next.js (App Router)    | React-based, SSR-capable, TypeScript support                        |
| Database | **Neon DB** (PostgreSQL) | Serverless Postgres, free tier, branching, auto-scaling            |
| Cache    | **Upstash Redis**       | Serverless Redis, free tier (10k cmd/day), TLS, HTTP-based         |

### Why PostgreSQL / Neon DB?
- Agent records are structured and relational
- ACID compliance ensures data consistency on updates/deletes
- UUID primary keys work natively with the `uuid-ossp` extension
- Excellent support for indexing on `status`, `service_area`, and `email`
- **Neon** adds zero-infrastructure serverless Postgres with connection pooling built in


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

---

## Production Deployment

### Services Used

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Neon DB](https://neon.tech) | PostgreSQL database | 0.5 GB storage, 1 project |
| [Upstash](https://upstash.com) | Redis cache | 10,000 commands/day |
| [Render](https://render.com) | Backend hosting | 750 hrs/month |
| [Vercel](https://vercel.com) | Frontend hosting | Unlimited on hobby plan |

---

### Step 1 – Set Up Neon DB

1. Go to [neon.tech](https://neon.tech) → **Sign up / Log in**
2. Click **New Project** → name it `zoop-agents` → choose a region
3. Once created, go to **Dashboard → Connection Details**
4. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
5. Save it — you'll paste it as `DATABASE_URL` in Render

> **Run migration against Neon:**
> ```bash
> cd backend
> DATABASE_URL="postgresql://..." npm run migrate
> ```

---

### Step 2 – Set Up Upstash Redis

1. Go to [console.upstash.com](https://console.upstash.com) → **Sign up / Log in**
2. Click **Create Database** → name it `zoop-cache` → choose the same region as Neon → **TLS enabled**
3. Once created, go to **Details** tab
4. Copy the **REDIS_URL** (starts with `rediss://`)
5. Save it — you'll paste it as `REDIS_URL` in Render and Vercel (not needed for frontend but good to have)

---

### Step 3 – Deploy Backend on Render

1. Go to [render.com](https://render.com) → **Sign up / Log in with GitHub**
2. Click **New → Web Service**
3. Connect your GitHub repo: `nitishsingh10/ZoopAssignment`
4. Set these fields:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Region:** Singapore (or closest to your Neon region)
5. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(paste Neon connection string)* |
   | `REDIS_URL` | *(paste Upstash REDIS_URL)* |
   | `FRONTEND_URL` | *(your Vercel URL — add after Step 4)* |
   | `CACHE_TTL` | `300` |

6. Click **Create Web Service**
7. Wait for the build to finish (~2 min)
8. Note your backend URL: `https://zoop-backend-xxxx.onrender.com`

> **Verify:** Open `https://your-render-url.onrender.com/health` → should return `{ "status": "ok" }`

---

### Step 4 – Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign up / Log in with GitHub**
2. Click **New Project** → Import `nitishsingh10/ZoopAssignment`
3. Set **Root Directory** to `frontend`
4. Under **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://your-render-url.onrender.com` |

5. Click **Deploy**
6. Note your frontend URL: `https://zoop-assignment-xxxx.vercel.app`

---

### Step 5 – Wire CORS

Go back to your **Render dashboard → Environment Variables** and update:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://zoop-assignment-xxxx.vercel.app` |

Click **Save** → Render will automatically redeploy.

---

### Deployment Checklist

- [ ] Neon DB created and migration run (`npm run migrate` with `DATABASE_URL` set)
- [ ] Upstash Redis database created and URL copied
- [ ] Render web service deployed with all env vars
- [ ] `GET /health` returns `{ "status": "ok" }` on Render URL
- [ ] Vercel project deployed with `NEXT_PUBLIC_API_URL` pointing to Render
- [ ] `FRONTEND_URL` updated on Render to the Vercel URL
- [ ] Full CRUD working end-to-end on production URLs
