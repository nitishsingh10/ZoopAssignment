const pool = require('../config/db');
const {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_KEYS,
} = require('../config/redis');

// ─── GET ALL AGENTS ──────────────────────────────────────────────────────────
async function getAllAgents(filters = {}) {
  const { status, service_area, page = 1, limit = 20 } = filters;

  // Build a cache key that includes filters
  const cacheKey = status || service_area
    ? `agents:list:${status || 'all'}:${service_area || 'all'}:${page}:${limit}`
    : CACHE_KEYS.ALL_AGENTS;

  const cached = await getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const conditions = [];
  const values = [];
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
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) FROM agents ${where}`;
  const dataQuery = `
    SELECT * FROM agents ${where}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(dataQuery, [...values, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  const result = {
    agents: dataResult.rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };

  await setCache(cacheKey, result);
  return result;
}

// ─── GET AGENT BY ID ─────────────────────────────────────────────────────────
async function getAgentById(id) {
  const cacheKey = CACHE_KEYS.AGENT(id);
  const cached = await getCache(cacheKey);
  if (cached) return { agent: cached, fromCache: true };

  const result = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;

  const agent = result.rows[0];
  await setCache(cacheKey, agent);
  return { agent, fromCache: false };
}

// ─── CREATE AGENT ─────────────────────────────────────────────────────────────
async function createAgent(data) {
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

  const query = `
    INSERT INTO agents
      (full_name, phone, email, service_area, status, vehicle_type, rating, total_deliveries, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `;
  const values = [full_name, phone, email, service_area, status, vehicle_type, rating, total_deliveries, notes];
  const result = await pool.query(query, values);
  const agent = result.rows[0];

  // Invalidate list caches
  await deleteCacheByPattern('agents:list:*');
  await deleteCache(CACHE_KEYS.ALL_AGENTS);

  return agent;
}

// ─── UPDATE AGENT ─────────────────────────────────────────────────────────────
async function updateAgent(id, data) {
  // Build dynamic SET clause
  const allowed = ['full_name', 'phone', 'email', 'service_area', 'status', 'vehicle_type', 'rating', 'total_deliveries', 'notes'];
  const fields = Object.keys(data).filter((k) => allowed.includes(k));

  if (fields.length === 0) return null;

  const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => data[f]);
  values.push(id);

  const query = `
    UPDATE agents SET ${sets}
    WHERE id = $${fields.length + 1}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  if (result.rows.length === 0) return null;

  const agent = result.rows[0];

  // Invalidate this agent's cache and list caches
  await deleteCache(CACHE_KEYS.AGENT(id));
  await deleteCacheByPattern('agents:list:*');
  await deleteCache(CACHE_KEYS.ALL_AGENTS);

  return agent;
}

// ─── DELETE AGENT ─────────────────────────────────────────────────────────────
async function deleteAgent(id) {
  const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) return null;

  // Invalidate this agent's cache and list caches
  await deleteCache(CACHE_KEYS.AGENT(id));
  await deleteCacheByPattern('agents:list:*');
  await deleteCache(CACHE_KEYS.ALL_AGENTS);

  return result.rows[0];
}

// ─── GET STATS ────────────────────────────────────────────────────────────────
async function getStats() {
  const cacheKey = 'agents:stats';
  const cached = await getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const result = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
      COUNT(*) FILTER (WHERE status = 'on_leave') AS on_leave,
      ROUND(AVG(rating), 2) AS avg_rating,
      SUM(total_deliveries) AS total_deliveries,
      COUNT(DISTINCT service_area) AS total_areas
    FROM agents
  `);

  const stats = result.rows[0];
  await setCache(cacheKey, stats, 60); // Short TTL for stats
  return stats;
}

module.exports = {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getStats,
};
