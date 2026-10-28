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
let deptA;
let deptB;

async function cleanup() {
  await pool.query("DELETE FROM services WHERE name LIKE 'zz_test_%'");
  await pool.query("DELETE FROM departments WHERE name LIKE 'zz_test_%'");
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

const asAdmin = (m, url) => request(app)[m](url).set('Cookie', cookies.admin).set('Origin', ORIGIN);

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_svc_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_svc_rec', 'receptionist');
  deptA = (await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_svc_dept_a' })).body.id;
  deptB = (await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_svc_dept_b' })).body.id;
});

afterAll(cleanup);

describe('services', () => {
  it('rejects a request with no session', async () => {
    const res = await request(app).get('/api/catalog/services');
    expect(res.status).toBe(401);
  });

  it('rejects a receptionist', async () => {
    const res = await request(app).get('/api/catalog/services').set('Cookie', cookies.rec);
    expect(res.status).toBe(403);
  });

  it('admin creates, lists, renames, moves and deactivates a service', async () => {
    const created = await asAdmin('post', '/api/catalog/services').send({ name: 'zz_test_svc_a', departmentId: deptA });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await asAdmin('get', '/api/catalog/services');
    expect(list.status).toBe(200);
    const row = list.body.services.find((s) => s.id === id);
    expect(row.name).toBe('zz_test_svc_a');
    expect(row.departmentId).toBe(deptA);
    expect(row.isActive).toBe(true);

    expect((await asAdmin('patch', '/api/catalog/services/' + id).send({ name: 'zz_test_svc_b' })).status).toBe(200);
    expect((await asAdmin('patch', '/api/catalog/services/' + id).send({ departmentId: deptB })).status).toBe(200);
    expect((await asAdmin('patch', '/api/catalog/services/' + id).send({ isActive: false })).status).toBe(200);

    const after = await asAdmin('get', '/api/catalog/services');
    const row2 = after.body.services.find((s) => s.id === id);
    expect(row2.name).toBe('zz_test_svc_b');
    expect(row2.departmentId).toBe(deptB);
    expect(row2.isActive).toBe(false);
  });

  it('returns 409 for a duplicate name', async () => {
    const body = { name: 'zz_test_svc_dup', departmentId: deptA };
    expect((await asAdmin('post', '/api/catalog/services').send(body)).status).toBe(201);
    expect((await asAdmin('post', '/api/catalog/services').send(body)).status).toBe(409);
  });

  it('returns 400 for a bad body or unknown department', async () => {
    expect((await asAdmin('post', '/api/catalog/services').send({ name: 'x', departmentId: deptA })).status).toBe(400);
    expect((await asAdmin('post', '/api/catalog/services').send({ name: 'zz_test_svc_nodept' })).status).toBe(400);
    expect((await asAdmin('post', '/api/catalog/services').send({ name: 'zz_test_svc_baddept', departmentId: 999999 })).status).toBe(400);
  });

  it('returns 400 for a bad id or empty patch, and 404 for an unknown id', async () => {
    expect((await asAdmin('patch', '/api/catalog/services/abc').send({ isActive: false })).status).toBe(400);
    expect((await asAdmin('patch', '/api/catalog/services/999999').send({ isActive: false })).status).toBe(404);
    const id = (await asAdmin('post', '/api/catalog/services').send({ name: 'zz_test_svc_c', departmentId: deptA })).body.id;
    expect((await asAdmin('patch', '/api/catalog/services/' + id).send({})).status).toBe(400);
  });
});
