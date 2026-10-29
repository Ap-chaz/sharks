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
const cookies = {};
const ids = {};
let defaultId;

async function cleanup() {
  await pool.query("DELETE FROM doctors WHERE full_name LIKE 'zz_test_%' OR full_name LIKE 'zz_renamed_%'");
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%'");
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
  const [d] = await pool.query('SELECT id FROM doctors WHERE is_default = 1');
  defaultId = d[0].id;
  const roles = { admin: 'administrator', rec: 'receptionist', doc: 'doctor', doc2: 'doctor' };
  for (const [key, role] of Object.entries(roles)) {
    ids[key] = await makeUser('zz_test_dedit_' + key, role);
    cookies[key] = COOKIE_NAME + '=' + (await createSession(ids[key], '127.0.0.1', 'vitest'));
  }
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

const post = (url, key) => request(app).post(url).set('Origin', ORIGIN).set('Cookie', cookies[key]);
const patch = (url, key) => request(app).patch(url).set('Origin', ORIGIN).set('Cookie', cookies[key]);

describe('doctors editing', () => {
  let newId;
  let secondId;

  it('refuses non-administrators and anonymous users', async () => {
    expect((await post('/api/doctors', 'rec').send({ fullName: 'zz_test_x' })).status).toBe(403);
    const anon = await request(app).post('/api/doctors').set('Origin', ORIGIN).send({ fullName: 'zz_test_x' });
    expect(anon.status).toBe(401);
  });

  it('rejects an invalid name', async () => {
    expect((await post('/api/doctors', 'admin').send({ fullName: 'a' })).status).toBe(400);
  });

  it('adds a doctor and lists it', async () => {
    const res = await post('/api/doctors', 'admin').send({ fullName: 'zz_test_doctor_one' });
    expect(res.status).toBe(201);
    newId = res.body.id;
    const list = await request(app).get('/api/doctors').set('Cookie', cookies.admin);
    const found = list.body.doctors.find((d) => d.id === newId);
    expect(found.fullName).toBe('zz_test_doctor_one');
    expect(found.isActive).toBe(true);
    expect(found.isDefault).toBe(false);
  });

  it('renames and deactivates then reactivates', async () => {
    expect((await patch('/api/doctors/' + newId, 'admin').send({ fullName: 'zz_renamed_one' })).status).toBe(200);
    expect((await patch('/api/doctors/' + newId, 'admin').send({ isActive: false })).status).toBe(200);
    expect((await patch('/api/doctors/' + newId, 'admin').send({ isActive: true })).status).toBe(200);
    const list = await request(app).get('/api/doctors').set('Cookie', cookies.admin);
    const found = list.body.doctors.find((d) => d.id === newId);
    expect(found.fullName).toBe('zz_renamed_one');
    expect(found.isActive).toBe(true);
  });

  it('links and unlinks a doctor login', async () => {
    expect((await patch('/api/doctors/' + newId, 'admin').send({ userId: ids.doc })).status).toBe(200);
    const list = await request(app).get('/api/doctors').set('Cookie', cookies.admin);
    expect(list.body.doctors.find((d) => d.id === newId).username).toBe('zz_test_dedit_doc');
    expect((await patch('/api/doctors/' + newId, 'admin').send({ userId: null })).status).toBe(200);
  });

  it('refuses a login that is not a doctor account', async () => {
    const res = await patch('/api/doctors/' + newId, 'admin').send({ userId: ids.rec });
    expect(res.status).toBe(400);
  });

  it('refuses the same login on two doctors', async () => {
    await patch('/api/doctors/' + newId, 'admin').send({ userId: ids.doc2 });
    const res = await post('/api/doctors', 'admin').send({ fullName: 'zz_test_doctor_two', userId: ids.doc2 });
    expect(res.status).toBe(409);
    const ok = await post('/api/doctors', 'admin').send({ fullName: 'zz_test_doctor_two' });
    secondId = ok.body.id;
    const dup = await patch('/api/doctors/' + secondId, 'admin').send({ userId: ids.doc2 });
    expect(dup.status).toBe(409);
  });

  it('protects the default doctor', async () => {
    expect((await patch('/api/doctors/' + defaultId, 'admin').send({ isActive: false })).status).toBe(403);
    expect((await patch('/api/doctors/' + defaultId, 'admin').send({ userId: null })).status).toBe(403);
  });

  it('returns 404 for an unknown doctor and 400 for an empty change', async () => {
    expect((await patch('/api/doctors/999999', 'admin').send({ isActive: true })).status).toBe(404);
    expect((await patch('/api/doctors/' + newId, 'admin').send({})).status).toBe(400);
  });
});
