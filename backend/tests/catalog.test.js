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

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_cat_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_cat_rec', 'receptionist');
});

afterAll(cleanup);

const asAdmin = (m, url) => request(app)[m](url).set('Cookie', cookies.admin).set('Origin', ORIGIN);

describe('departments', () => {
  it('rejects a request with no session', async () => {
    const res = await request(app).get('/api/catalog/departments');
    expect(res.status).toBe(401);
  });

  it('rejects a receptionist', async () => {
    const res = await request(app).get('/api/catalog/departments').set('Cookie', cookies.rec);
    expect(res.status).toBe(403);
  });

  it('admin creates, lists, renames and deactivates a department', async () => {
    const created = await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_dept_a' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await asAdmin('get', '/api/catalog/departments');
    expect(list.status).toBe(200);
    const row = list.body.departments.find((d) => d.id === id);
    expect(row.name).toBe('zz_test_dept_a');
    expect(row.isActive).toBe(true);

    const renamed = await asAdmin('patch', '/api/catalog/departments/' + id).send({ name: 'zz_test_dept_b' });
    expect(renamed.status).toBe(200);

    const off = await asAdmin('patch', '/api/catalog/departments/' + id).send({ isActive: false });
    expect(off.status).toBe(200);

    const after = await asAdmin('get', '/api/catalog/departments');
    const row2 = after.body.departments.find((d) => d.id === id);
    expect(row2.name).toBe('zz_test_dept_b');
    expect(row2.isActive).toBe(false);
  });

  it('returns 409 for a duplicate name', async () => {
    expect((await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_dept_dup' })).status).toBe(201);
    expect((await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_dept_dup' })).status).toBe(409);
  });

  it('returns 400 for a bad body and 404 for an unknown id', async () => {
    expect((await asAdmin('post', '/api/catalog/departments').send({ name: 'x' })).status).toBe(400);
    expect((await asAdmin('patch', '/api/catalog/departments/abc').send({ isActive: false })).status).toBe(400);
    expect((await asAdmin('patch', '/api/catalog/departments/999999').send({ isActive: false })).status).toBe(404);
    const id = (await asAdmin('post', '/api/catalog/departments').send({ name: 'zz_test_dept_c' })).body.id;
    expect((await asAdmin('patch', '/api/catalog/departments/' + id).send({})).status).toBe(400);
  });
});
