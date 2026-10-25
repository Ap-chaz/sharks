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
const ids = [];

async function cleanup() {
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%'");
  await pool.query("DELETE FROM patients WHERE full_name LIKE 'zz_test_%'");
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
  cookies.admin = await makeUser('zz_test_pat_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_pat_rec', 'receptionist');
  cookies.lab = await makeUser('zz_test_pat_lab', 'lab_technician');
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

const post = (url, c) => request(app).post(url).set('Origin', ORIGIN).set('Cookie', c);
const patch = (url, c) => request(app).patch(url).set('Origin', ORIGIN).set('Cookie', c);

describe('patients API', () => {
  it('requires a session and blocks the lab technician', async () => {
    expect((await request(app).get('/api/patients')).status).toBe(401);
    expect((await request(app).get('/api/patients').set('Cookie', cookies.lab)).status).toBe(403);
  });

  it('creates a patient with a code and no date of birth', async () => {
    const res = await post('/api/patients', cookies.rec).send({ fullName: 'zz_test_Mary', phone: '0700000001' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('P-' + (1000 + res.body.id));
    ids.push(res.body.id);
  });

  it('rejects invalid input', async () => {
    expect((await post('/api/patients', cookies.rec).send({ fullName: 'x', phone: '1' })).status).toBe(400);
    expect((await post('/api/patients', cookies.rec).send({ fullName: 'zz_test_Bad', phone: '0700000002', email: 'nope' })).status).toBe(400);
  });

  it('lets a receptionist edit contact details but not other fields', async () => {
    const ok = await patch('/api/patients/' + ids[0], cookies.rec).send({ phone: '0700000009' });
    expect(ok.status).toBe(200);
    const no = await patch('/api/patients/' + ids[0], cookies.rec).send({ fullName: 'zz_test_Changed' });
    expect(no.status).toBe(403);
    const no2 = await patch('/api/patients/' + ids[0], cookies.rec).send({ isActive: false });
    expect(no2.status).toBe(403);
  });

  it('lets the administrator edit anything and deactivate', async () => {
    const res = await patch('/api/patients/' + ids[0], cookies.admin)
      .send({ fullName: 'zz_test_Mary B', dateOfBirth: '1990-05-17', gender: 'female' });
    expect(res.status).toBe(200);
    const view = await request(app).get('/api/patients/' + ids[0]).set('Cookie', cookies.admin);
    expect(view.body.patient.dateOfBirth).toBe('1990-05-17');
    expect(view.body.patient.phone).toBe('0700000009');
    await patch('/api/patients/' + ids[0], cookies.admin).send({ isActive: false });
    const list = await request(app).get('/api/patients?q=zz_test_').set('Cookie', cookies.admin);
    expect(list.body.patients.length).toBe(0);
    const all = await request(app).get('/api/patients?q=zz_test_&includeInactive=1').set('Cookie', cookies.admin);
    expect(all.body.patients.length).toBe(1);
  });

  it('writes audit rows without patient content', async () => {
    const [rows] = await pool.query("SELECT action, details FROM audit_logs WHERE username LIKE 'zz_test_pat_%'");
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('patient_created');
    expect(actions).toContain('patient_updated');
    expect(actions).toContain('patient_view');
    expect(JSON.stringify(rows)).not.toContain('0700000009');
  });

  it('returns 404 for a missing patient', async () => {
    expect((await request(app).get('/api/patients/999999999').set('Cookie', cookies.admin)).status).toBe(404);
  });
});
