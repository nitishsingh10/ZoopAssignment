import pool from '../config/db';
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_KEYS,
  CACHE_TTL,
} from '../config/redis';
import type {
  Agent,
  AgentCreateInput,
  AgentUpdateInput,
  AgentListResult,
  AgentResult,
  AgentStats,
  ListFilters,
} from '../types/agent';

// ─── GET ALL AGENTS ──────────────────────────────────────────────────────────
export async function getAllAgents(filters: ListFilters = {}): Promise<AgentListResult> {
  const { status, service_area, page = 1, limit = 20 } = filters;

  const cacheKey =
    status || service_area
      ? CACHE_KEYS.LIST(status ?? '', service_area ?? '', page, limit)
      : CACHE_KEYS.ALL_AGENTS;

  const cached = await getCache<AgentListResult>(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (service_area) {
    conditions.push(`LOWER(service_area) LIKE $${idx++}`);
    values.push(`%${service_area.toLowerCase()}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const [countResult, dataResult] = await Promise.all([
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM agents ${where}`, values),
    pool.query<Agent>(
      `SELECT * FROM agents ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count);
  const result: AgentListResult = {
    agents: dataResult.rows,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };

  await setCache(cacheKey, result);
  return result;
}

// ─── GET AGENT BY ID ─────────────────────────────────────────────────────────
export async function getAgentById(id: string): Promise<AgentResult | null> {
  const cacheKey = CACHE_KEYS.AGENT(id);
  const cached = await getCache<Agent>(cacheKey);
  if (cached) return { agent: cached, fromCache: true };

  const result = await pool.query<Agent>('SELECT * FROM agents WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;

  const agent = result.rows[0];
  await setCache(cacheKey, agent);
  return { agent, fromCache: false };
}

// ─── CREATE AGENT ─────────────────────────────────────────────────────────────
export async function createAgent(data: AgentCreateInput): Promise<Agent> {
  const {
    full_name,
    phone,
    email,
    service_area,
    status = 'active',
    vehicle_type = 'bike',
    rating = 5.0,
    total_deliveries = 0,
    notes = null,
  } = data;

  const result = await pool.query<Agent>(
    `INSERT INTO agents
       (full_name, phone, email, service_area, status, vehicle_type, rating, total_deliveries, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [full_name, phone, email, service_area, status, vehicle_type, rating, total_deliveries, notes]
  );

  const agent = result.rows[0];

  // Invalidate all list caches
  await Promise.all([
    deleteCacheByPattern('agents:list:*'),
    deleteCache(CACHE_KEYS.ALL_AGENTS),
    deleteCache('agents:stats'),
  ]);

  return agent;
}

// ─── UPDATE AGENT ─────────────────────────────────────────────────────────────
const ALLOWED_UPDATE_FIELDS: ReadonlyArray<keyof AgentUpdateInput> = [
  'full_name', 'phone', 'email', 'service_area',
  'status', 'vehicle_type', 'rating', 'total_deliveries', 'notes',
];

export async function updateAgent(
  id: string,
  data: AgentUpdateInput
): Promise<Agent | null> {
  const fields = (Object.keys(data) as Array<keyof AgentUpdateInput>).filter((k) =>
    ALLOWED_UPDATE_FIELDS.includes(k)
  );

  if (fields.length === 0) return null;

  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values: unknown[] = fields.map((f) => data[f]);
  values.push(id);

  const result = await pool.query<Agent>(
    `UPDATE agents SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;

  const agent = result.rows[0];

  // Invalidate this agent and all list caches
  await Promise.all([
    deleteCache(CACHE_KEYS.AGENT(id)),
    deleteCacheByPattern('agents:list:*'),
    deleteCache(CACHE_KEYS.ALL_AGENTS),
    deleteCache('agents:stats'),
  ]);

  return agent;
}

// ─── DELETE AGENT ─────────────────────────────────────────────────────────────
export async function deleteAgent(id: string): Promise<Agent | null> {
  const result = await pool.query<Agent>(
    'DELETE FROM agents WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) return null;

  await Promise.all([
    deleteCache(CACHE_KEYS.AGENT(id)),
    deleteCacheByPattern('agents:list:*'),
    deleteCache(CACHE_KEYS.ALL_AGENTS),
    deleteCache('agents:stats'),
  ]);

  return result.rows[0];
}

// ─── GET STATS ────────────────────────────────────────────────────────────────
export async function getStats(): Promise<AgentStats> {
  const cacheKey = 'agents:stats';
  const cached = await getCache<AgentStats>(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const result = await pool.query<AgentStats>(`
    SELECT
      COUNT(*)                                          AS total,
      COUNT(*) FILTER (WHERE status = 'active')        AS active,
      COUNT(*) FILTER (WHERE status = 'inactive')      AS inactive,
      COUNT(*) FILTER (WHERE status = 'on_leave')      AS on_leave,
      ROUND(AVG(rating), 2)                            AS avg_rating,
      SUM(total_deliveries)                            AS total_deliveries,
      COUNT(DISTINCT service_area)                     AS total_areas
    FROM agents
  `);

  const stats = result.rows[0];
  await setCache(cacheKey, stats, 60); // 60s TTL for stats
  return stats;
}
