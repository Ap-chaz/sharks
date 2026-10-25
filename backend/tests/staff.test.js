import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const PASS = 'test-password-12345';
const NEW = 'zz_test_staff_new';
let adminCookie;
let recCookie;
let adminId;

async function cleanup() {
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%' OR entity_type = 'user' AND details LIKE '%zz_test_%'");
  await pool.query("DELETE FROM users WHERE username LIKE 'zz_test_%'");
}

async function makeUser(username, role) {
  const hash = await hashPassword(PASS);
  await pool.query(
    'INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?',
    [username, 'Test ' + username, hash, role]
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return rows[0].id;
}

beforeAll(async () => {
  await cleanup();
  const [admins] = await pool.query(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'administrator' LIMIT 1"
  );
  adminId = admins[0].id;
  adminCookie = COOKIE_NAME + '=' + (await createSession(adminId, '127.0.0.1', 'vitest'));
  const recId = await makeUser('zz_test_staff_rec', 'receptionist');
  recCookie = COOKIE_NAME + '=' + (await createSession(recId, '127.0.0.1', 'vitest'));
});

afterAll(async () => {
  await pool.query('DELETE FROM sessions WHERE user_id = ? AND user_agent = ?', [adminId, 'vitest']);
  await cleanup();
  await pool.end();
});

const post = (url) => request(app).post(url).set('Origin', ORIGIN);

describe('staff routes', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/staff')).status).toBe(401);
  });

  it('refuses non-administrators', async () => {
    expect((await request(app).get('/api/staff').set('Cookie', recCookie)).status).toBe(403);
  });

  it('lists staff without password hashes', async () => {
    const res = await request(app).get('/api/staff').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('argon2');
    expect(res.body.staff.length).toBeGreaterThan(0);
  });

  it('creates, updates, resets and deactivates a staff member', async () => {
    const created = await post('/api/staff').set('Cookie', adminCookie)
      .send({ username: NEW, fullName: 'Test New', role: 'lab_technician', password: PASS });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const dup = await post('/api/staff').set('Cookie', adminCookie)
      .send({ username: NEW, fullName: 'Test New', role: 'lab_technician', password: PASS });
    expect(dup.status).toBe(409);

    const upd = await request(app).patch('/api/staff/' + id).set('Origin', ORIGIN).set('Cookie', adminCookie)
      .send({ role: 'doctor' });
    expect(upd.status).toBe(200);

    const reset = await post('/api/staff/' + id + '/reset-password').set('Cookie', adminCookie)
      .send({ password: 'another-password-12345' });
    expect(reset.status).toBe(200);

    const sid = await createSession(id, '127.0.0.1', 'vitest');
    const off = await request(app).patch('/api/staff/' + id).set('Origin', ORIGIN).set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(off.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Cookie', COOKIE_NAME + '=' + sid);
    expect(me.status).toBe(401);
  });

  it('rejects weak passwords and bad roles', async () => {
    const weak = await post('/api/staff').set('Cookie', adminCookie)
      .send({ username: 'zz_test_staff_weak', fullName: 'Weak', role: 'doctor', password: 'short' });
    expect(weak.status).toBe(400);
    const badRole = await post('/api/staff').set('Cookie', adminCookie)
      .send({ username: 'zz_test_staff_role', fullName: 'Bad Role', role: 'administrator', password: PASS });
    expect(badRole.status).toBe(400);
  });

  it('never allows changing the administrator account', async () => {
    const res = await request(app).patch('/api/staff/' + adminId).set('Origin', ORIGIN).set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(403);
    const reset = await post('/api/staff/' + adminId + '/reset-password').set('Cookie', adminCookie)
      .send({ password: 'another-password-12345' });
    expect(reset.status).toBe(403);
  });
});
