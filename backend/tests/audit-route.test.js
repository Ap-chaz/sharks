import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const cookies = {};

async function cleanup() {
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%'");
  await pool.query("DELETE FROM users WHERE username LIKE 'zz_test_%'");
}

async function makeUser(username, role) {
  const hash = await hashPassword('test-password-12345');
  await pool.query(
    'INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?',
    [username, 'Test ' + username, hash, role]
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return COOKIE_NAME + '=' + (await createSession(rows[0].id, '127.0.0.1', 'vitest'));
}

const as = (who, url) => request(app).get(url).set('Cookie', cookies[who]).set('Origin', ORIGIN);

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_au_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_au_doc', 'doctor');
  await pool.query(
    'INSERT INTO audit_logs (username, action, details, ip_address) VALUES (?, ?, ?, ?)',
    ['zz_test_au_marker', 'zz_test_action', JSON.stringify({ note: 'zz_test_secret_detail' }), '203.0.113.9']
  );
});

afterAll(cleanup);

describe('GET /api/audit', () => {
  it('rejects a request with no session', async () => {
    const res = await request(app).get('/api/audit').set('Origin', ORIGIN);
    expect(res.status).toBe(401);
  });

  it('rejects a non-administrator', async () => {
    const res = await as('doc', '/api/audit');
    expect(res.status).toBe(403);
  });

  it('gives an administrator the entries, newest first, without details', async () => {
    const res = await as('admin', '/api/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeLessThanOrEqual(200);
    const row = res.body.entries.find((e) => e.action === 'zz_test_action');
    expect(row).toBeTruthy();
    expect(row.ipAddress).toBe('203.0.113.9');
    expect(row).not.toHaveProperty('details');
    expect(JSON.stringify(res.body)).not.toContain('zz_test_secret_detail');
    const ids = res.body.entries.map((e) => e.id);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });
});
