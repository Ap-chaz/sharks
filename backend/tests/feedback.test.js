import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const cookies = {};

async function clearAttempts() {
  await pool.query("DELETE FROM public_booking_attempts WHERE ip_address LIKE '%127.0.0.1' OR ip_address = '::1'");
}

async function cleanup() {
  await pool.query("DELETE FROM feedback WHERE message LIKE 'zz_test%'");
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%'");
  await pool.query("DELETE FROM users WHERE username LIKE 'zz_test_%'");
  await clearAttempts();
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

const as = (who, m, url) => request(app)[m](url).set('Cookie', cookies[who]).set('Origin', ORIGIN);
const submit = (b) => request(app).post('/api/public/feedback').set('Origin', ORIGIN).send(b);
const good = () => ({ name: 'zz_test visitor', rating: 5, message: 'zz_test great service' });

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_fb_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_fb_doc', 'doctor');
  cookies.rec = await makeUser('zz_test_fb_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_fb_tech', 'lab_technician');
});

beforeEach(clearAttempts);
afterAll(cleanup);

describe('public feedback', () => {
  it('accepts valid feedback without a session', async () => {
    const res = await submit(good());
    expect(res.status).toBe(201);
    const [rows] = await pool.query("SELECT rating, status FROM feedback WHERE message = 'zz_test great service'");
    expect(rows.length).toBe(1);
    expect(rows[0].rating).toBe(5);
    expect(rows[0].status).toBe('new');
  });

  it('accepts feedback with no name', async () => {
    const res = await submit({ rating: 4, message: 'zz_test no name' });
    expect(res.status).toBe(201);
  });

  it('returns 400 for a bad rating or message', async () => {
    expect((await submit({ ...good(), rating: 0 })).status).toBe(400);
    expect((await submit({ ...good(), rating: 6 })).status).toBe(400);
    expect((await submit({ ...good(), rating: 3.5 })).status).toBe(400);
    expect((await submit({ ...good(), message: 'x' })).status).toBe(400);
    expect((await submit({ name: 'zz_test only name' })).status).toBe(400);
  });

  it('silently ignores a filled hidden field and saves nothing', async () => {
    const res = await submit({ ...good(), message: 'zz_test bot', website: 'http://spam.example' });
    expect(res.status).toBe(201);
    const [rows] = await pool.query("SELECT id FROM feedback WHERE message = 'zz_test bot'");
    expect(rows.length).toBe(0);
  });

  it('limits to 5 per hour per address', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await submit({ ...good(), message: 'zz_test limit ' + i })).status).toBe(201);
    }
    expect((await submit({ ...good(), message: 'zz_test limit 6' })).status).toBe(429);
  });
});

describe('staff feedback', () => {
  it('rejects a request with no session', async () => {
    expect((await request(app).get('/api/feedback')).status).toBe(401);
  });

  it('blocks every role except administrator', async () => {
    for (const who of ['doc', 'rec', 'tech']) {
      expect((await as(who, 'get', '/api/feedback')).status).toBe(403);
      expect((await as(who, 'patch', '/api/feedback/1').send({ status: 'reviewed' })).status).toBe(403);
    }
  });

  it('administrator lists feedback and marks it reviewed once', async () => {
    await submit({ ...good(), message: 'zz_test to review' });
    const list = await as('admin', 'get', '/api/feedback');
    expect(list.status).toBe(200);
    const row = list.body.feedback.find((f) => f.message === 'zz_test to review');
    expect(row.status).toBe('new');

    expect((await as('admin', 'patch', '/api/feedback/' + row.id).send({ status: 'reviewed' })).status).toBe(200);
    const after = await as('admin', 'get', '/api/feedback');
    const done = after.body.feedback.find((f) => f.id === row.id);
    expect(done.status).toBe('reviewed');
    expect(done.reviewedAt).not.toBe(null);
    expect((await as('admin', 'patch', '/api/feedback/' + row.id).send({ status: 'reviewed' })).status).toBe(409);
  });

  it('returns 400 for a bad id or body and 404 for an unknown id', async () => {
    expect((await as('admin', 'patch', '/api/feedback/abc').send({ status: 'reviewed' })).status).toBe(400);
    expect((await as('admin', 'patch', '/api/feedback/1').send({ status: 'new' })).status).toBe(400);
    expect((await as('admin', 'patch', '/api/feedback/999999').send({ status: 'reviewed' })).status).toBe(404);
  });
});
