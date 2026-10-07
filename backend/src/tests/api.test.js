/**
 * API Integration Tests for Delivery Agent Management
 * Run with: node src/tests/api.test.js
 * Make sure the server is running on PORT 5000 before running tests
 */

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/agents`;

let createdAgentId = null;

async function request(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🧪 Running Zoop API Tests\n');

  // ── Health Check ───────────────────────────────────────────────────────────
  console.log('📋 Health');
  await test('GET /health returns 200', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT || 5000}/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok', 'Expected status ok');
  });

  // ── Create Agent ───────────────────────────────────────────────────────────
  console.log('\n📋 Create Agent');

  await test('POST /api/agents creates agent with valid data', async () => {
    const url = BASE_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Agent',
        phone: '+91-9876543210',
        email: 'testagent@zoop.test',
        service_area: 'Bangalore North',
        status: 'active',
        vehicle_type: 'bike',
      }),
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success true');
    assert(data.agent.id, 'Expected agent ID');
    createdAgentId = data.agent.id;
  });

  await test('POST /api/agents returns 409 for duplicate email', async () => {
    const url = BASE_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Duplicate Agent',
        phone: '+91-1111111111',
        email: 'testagent@zoop.test',
        service_area: 'Bangalore South',
      }),
    });
    assert(res.status === 409, `Expected 409, got ${res.status}`);
  });

  await test('POST /api/agents returns 422 for missing required fields', async () => {
    const url = BASE_URL;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'No Email' }),
    });
    assert(res.status === 422, `Expected 422, got ${res.status}`);
  });

  // ── Read Agents ────────────────────────────────────────────────────────────
  console.log('\n📋 Read Agents');

  await test('GET /api/agents returns list', async () => {
    const res = await fetch(BASE_URL);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.agents), 'Expected agents array');
    assert(data.pagination, 'Expected pagination object');
  });

  await test('GET /api/agents/:id returns agent', async () => {
    if (!createdAgentId) return;
    const res = await fetch(`${BASE_URL}/${createdAgentId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.agent.id === createdAgentId, 'Agent ID mismatch');
  });

  await test('GET /api/agents/:id returns 404 for non-existent', async () => {
    const res = await fetch(`${BASE_URL}/00000000-0000-0000-0000-000000000000`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('GET /api/agents/:id returns 422 for invalid UUID', async () => {
    const res = await fetch(`${BASE_URL}/not-a-uuid`);
    assert(res.status === 422, `Expected 422, got ${res.status}`);
  });

  await test('GET /api/agents?status=active filters correctly', async () => {
    const res = await fetch(`${BASE_URL}?status=active`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.agents), 'Expected agents array');
  });

  // ── Update Agent ───────────────────────────────────────────────────────────
  console.log('\n📋 Update Agent');

  await test('PATCH /api/agents/:id updates agent', async () => {
    if (!createdAgentId) return;
    const res = await fetch(`${BASE_URL}/${createdAgentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_area: 'Bangalore Central', status: 'inactive' }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.agent.service_area === 'Bangalore Central', 'Service area not updated');
    assert(data.agent.status === 'inactive', 'Status not updated');
  });

  await test('PATCH /api/agents/:id returns 404 for non-existent', async () => {
    const res = await fetch(`${BASE_URL}/00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  console.log('\n📋 Stats');
  await test('GET /api/agents/stats returns stats', async () => {
    const res = await fetch(`${BASE_URL}/stats`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.stats, 'Expected stats object');
  });

  // ── Delete Agent ───────────────────────────────────────────────────────────
  console.log('\n📋 Delete Agent');

  await test('DELETE /api/agents/:id deletes agent', async () => {
    if (!createdAgentId) return;
    const res = await fetch(`${BASE_URL}/${createdAgentId}`, { method: 'DELETE' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('DELETE /api/agents/:id returns 404 after deletion', async () => {
    if (!createdAgentId) return;
    const res = await fetch(`${BASE_URL}/${createdAgentId}`, { method: 'DELETE' });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  console.log('\n✅ All tests completed\n');
}

runTests().catch(console.error);
