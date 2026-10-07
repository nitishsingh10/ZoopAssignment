# ZoopFleet – User Flow Documentation

## Overview

ZoopFleet is a single-page dashboard for managing delivery agents. All interactions happen without page navigation — modals handle create, view, edit, and delete. The frontend talks to the backend REST API, with Redis serving cached responses transparently.

---

## Primary User Flows

### 1. Viewing the Dashboard (Read – List)

```
User opens http://localhost:3000
        │
        ▼
Dashboard loads → GET /api/agents?page=1&limit=10
        │
        ├── Redis HIT?  → Return cached list instantly  (shows ⚡ Cached pill)
        └── Redis MISS? → Query PostgreSQL → Cache result → Return list
        │
        ▼
4 Stats cards populate → GET /api/agents/stats
        │
        ├── Total agents, Active count, Avg rating, Total deliveries
        └── Stats are cached for 60 seconds
        │
        ▼
Agent table renders with:
  - Avatar (initials), Full name, Truncated ID
  - Phone + Email
  - Service area
  - Vehicle badge
  - Status badge (Active / Inactive / On Leave)
  - Star rating
  - Delivery count
  - Edit / Delete buttons (appear on row hover)
```

---

### 2. Creating an Agent

```
User clicks "Add Agent" (topbar or sidebar)
        │
        ▼
Create Agent modal opens
        │
        ▼
User fills form:
  Required: Full Name, Phone, Email, Service Area
  Optional: Status, Vehicle Type, Rating, Total Deliveries, Notes
        │
        ▼
Client-side validation runs on submit
  ├── Empty required fields → inline error messages
  └── Invalid email format  → inline error message
        │
        ▼  (if valid)
POST /api/agents  (JSON body)
        │
        ├── Server validation (express-validator)
        │     └── 422 Unprocessable Entity → form shows server errors
        │
        ├── Duplicate email/phone
        │     └── 409 Conflict → toast: "An agent with this email already exists"
        │
        └── Success → 201 Created
              │
              ▼
        Cache invalidated: agents:all, agents:list:*, agents:stats
        Modal closes
        Table refreshes (re-fetches from PostgreSQL)
        Stats cards refresh
        Toast: "Agent created successfully" ✅
```

---

### 3. Viewing Agent Details (Read – Single)

```
User clicks any row in the table
        │
        ▼
GET /api/agents/:id
        │
        ├── Redis HIT?  → Return cached agent (shows ⚡ Cached in subtitle)
        └── Redis MISS? → Query PostgreSQL → Cache result → Return agent
        │
        ▼
Agent Detail modal opens showing:
  - Avatar with initials
  - Full name + Status badge + Vehicle badge + Star rating
  - Phone, Email, Service Area, Total Deliveries
  - Notes (if any)
  - Created At / Last Updated timestamps
  - [Edit Agent] and [Delete] action buttons
```

---

### 4. Editing an Agent

```
User clicks pencil icon on a row  OR  clicks "Edit Agent" inside detail modal
        │
        ▼
Edit Agent modal opens  (form pre-filled with current values)
        │
        ▼
User modifies any fields and clicks "Save Changes"
        │
        ▼
Client-side validation runs
        │
        ▼  (if valid)
PATCH /api/agents/:id  (only changed fields in body)
        │
        ├── 404 Not Found       → toast: "Agent not found"
        ├── 409 Conflict        → toast: "An agent with this email already exists"
        ├── 422 Validation fail → form errors
        └── 200 OK
              │
              ▼
        Cache invalidated: agents:{id}, agents:all, agents:list:*, agents:stats
        Modal closes
        Table refreshes
        Toast: "Agent updated successfully" ✅
```

---

### 5. Deleting an Agent

```
User clicks trash icon on a row  OR  clicks "Delete" inside detail modal
        │
        ▼
Confirm Delete modal opens:
  "You are about to permanently delete <Name>. This cannot be undone."
  [ Cancel ]  [ Yes, Delete Agent ]
        │
        ▼  (user confirms)
DELETE /api/agents/:id
        │
        ├── 404 Not Found → toast: "Agent not found"
        └── 200 OK
              │
              ▼
        Cache invalidated: agents:{id}, agents:all, agents:list:*, agents:stats
        Modal closes
        Table refreshes (agent gone)
        Stats refresh
        Toast: "<Name> deleted" ✅
```

---

### 6. Searching & Filtering

```
Search bar (top of table)
  User types a service area keyword
        │
        ▼
  400ms debounce fires
        │
        ▼
  GET /api/agents?service_area=<keyword>&page=1
        │
        └── Results update in table

Status dropdown
  User selects Active / Inactive / On Leave / All
        │
        ▼
  GET /api/agents?status=<value>&page=1
        │
        └── Results update in table

Sidebar quick-filter buttons do the same as the dropdown.

"Clear" button resets both filters → GET /api/agents?page=1
```

---

### 7. Pagination

```
More than 10 agents in the current filter view
        │
        ▼
Pagination bar appears at table bottom
  Shows: "Showing 1–10 of 47"
  Page buttons: ← [1] [2] [3] [4] [5] →
        │
        ▼
User clicks page N
        │
        ▼
GET /api/agents?page=N&limit=10
  ├── Unique cache key per page → may be a cache HIT
  └── Table updates
```

---

### 8. Cache Visibility

| Scenario | UI Indicator |
|---|---|
| List loaded from Redis | ⚡ Cached pill in topbar |
| Single agent from Redis | ⚡ Cached in detail modal subtitle |
| Fresh data from PostgreSQL | No indicator |
| After any write (create/update/delete) | Cache cleared, next load is fresh |

---

## Error States

| Situation | User Sees |
|---|---|
| Backend unreachable | Red toast: "Failed to load agents" |
| Creating duplicate email/phone | Red toast: "An agent with this email already exists" |
| Invalid form data | Inline red error messages under each field |
| Agent deleted between page load and action | Red toast: "Agent not found" |
| Server crash (500) | Red toast: "Internal server error" |
