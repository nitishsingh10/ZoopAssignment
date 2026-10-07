import 'dotenv/config';
import pool from './db';

const createTableSQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS agents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name        VARCHAR(100)  NOT NULL,
  phone            VARCHAR(20)   NOT NULL UNIQUE,
  email            VARCHAR(150)  NOT NULL UNIQUE,
  service_area     VARCHAR(100)  NOT NULL,
  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive', 'on_leave')),
  vehicle_type     VARCHAR(50)   DEFAULT 'bike'
                     CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'van', 'cycle')),
  rating           NUMERIC(3,2)  DEFAULT 5.00
                     CHECK (rating >= 0 AND rating <= 5),
  total_deliveries INTEGER       DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_agents_status       ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_service_area ON agents(service_area);
CREATE INDEX IF NOT EXISTS idx_agents_email        ON agents(email);
`;

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');
    await client.query(createTableSQL);
    console.log('✅ Migration complete: agents table ready');
  } catch (err) {
    console.error('❌ Migration failed:', (err as Error).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
