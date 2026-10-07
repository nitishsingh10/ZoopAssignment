/**
 * API Integration Tests for Delivery Agent Management
 * Run with: npm test  (uses tsx to execute directly)
 * Requires the backend server to be running on PORT 5000
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 5000}/api/agents`;

let createdAgentId: string | null = null;

async function request(
  method: string,
  path: string,
  body: unknown = null
): Promise<{ status: number; data: unknown }> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${(err as Error).message}`);
  }
}

function assert(condition: boolean, msg?: string): void {
  if (!condition) throw new Error(msg ?? 'Assertion failed');
}

// ─── SUITE ────────────────────────────────────────────────────────────────────
async function runTests(): Promise<void> {
  console.log('\n🧪 Running Zoop API Tests\n');

  // ── Health ─────────────────────────────────────────────────────────────────
  console.log('📋 Health');
  await test('GET /health returns 200', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT ?? 5000}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = (await res.json()) as { status: string };
    assert(data.status === 'ok', 'Expected status ok');
  });

  // ── Create ─────────────────────────────────────────────────────────────────
  console.log('\n📋 Create Agent');

  await test('POST /api/agents creates agent with valid data', async () => {
    const { status, data } = await request('POST', '', {
      full_name: 'Test Agent',
      phone: '+91-9876543210',
      email: 'testagent@zoop.test',
      service_area: 'Bangalore North',
      status: 'active',
      vehicle_type: 'bike',
    });
    assert(status === 201, `Expected 201, got ${status}`);
    const d = data as { success: boolean; agent: { id: string } };
    assert(d.success === true, 'Expected success true');
    assert(!!d.agent.id, 'Expected agent ID');
    createdAgentId = d.agent.id;
  });

  await test('POST /api/agents returns 409 for duplicate email', async () => {
    const { status } = await request('POST', '', {
      full_name: 'Duplicate Agent',
      phone: '+91-1111111111',
      email: 'testagent@zoop.test',
      service_area: 'Bangalore South',
    });
    assert(status === 409, `Expected 409, got ${status}`);
  });

  await test('POST /api/agents returns 422 for missing required fields', async () => {
    const { status } = await request('POST', '', { full_name: 'No Email' });
    assert(status === 422, `Expected 422, got ${status}`);
  });

  // ── Read ───────────────────────────────────────────────────────────────────
  console.log('\n📋 Read Agents');

  await test('GET /api/agents returns list', async () => {
    const { status, data } = await request('GET', '');
    assert(status === 200, `Expected 200, got ${status}`);
    const d = data as { agents: unknown[]; pagination: unknown };
    assert(Array.isArray(d.agents), 'Expected agents array');
    assert(!!d.pagination, 'Expected pagination object');
  });

  await test('GET /api/agents/:id returns agent', async () => {
    if (!createdAgentId) return;
    const { status, data } = await request('GET', `/${createdAgentId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    const d = data as { agent: { id: string } };
    assert(d.agent.id === createdAgentId, 'Agent ID mismatch');
  });

  await test('GET /api/agents/:id returns 404 for non-existent', async () => {
    const { status } = await request('GET', '/00000000-0000-0000-0000-000000000000');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('GET /api/agents/:id returns 422 for invalid UUID', async () => {
    const { status } = await request('GET', '/not-a-uuid');
    assert(status === 422, `Expected 422, got ${status}`);
  });

  await test('GET /api/agents?status=active filters correctly', async () => {
    const { status, data } = await request('GET', '?status=active');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray((data as { agents: unknown[] }).agents), 'Expected agents array');
  });

  // ── Update ─────────────────────────────────────────────────────────────────
  console.log('\n📋 Update Agent');

  await test('PATCH /api/agents/:id updates agent', async () => {
    if (!createdAgentId) return;
    const { status, data } = await request('PATCH', `/${createdAgentId}`, {
      service_area: 'Bangalore Central',
      status: 'inactive',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    const d = data as { agent: { service_area: string; status: string } };
    assert(d.agent.service_area === 'Bangalore Central', 'Service area not updated');
    assert(d.agent.status === 'inactive', 'Status not updated');
  });

  await test('PATCH /api/agents/:id returns 404 for non-existent', async () => {
    const { status } = await request('PATCH', '/00000000-0000-0000-0000-000000000000', {
      status: 'active',
    });
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  console.log('\n📋 Stats');
  await test('GET /api/agents/stats returns stats object', async () => {
    const { status, data } = await request('GET', '/stats');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(!!(data as { stats: unknown }).stats, 'Expected stats object');
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  console.log('\n📋 Delete Agent');

  await test('DELETE /api/agents/:id deletes agent', async () => {
    if (!createdAgentId) return;
    const { status } = await request('DELETE', `/${createdAgentId}`);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  await test('DELETE /api/agents/:id returns 404 after deletion', async () => {
    if (!createdAgentId) return;
    const { status } = await request('DELETE', `/${createdAgentId}`);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  console.log('\n✅ All tests completed\n');
}

runTests().catch(console.error);
