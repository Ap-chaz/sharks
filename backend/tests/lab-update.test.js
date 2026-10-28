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
let patientId;

async function cleanup() {
  const ids = "(SELECT id FROM lab_requests WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%'))";
  await pool.query('DELETE FROM lab_results WHERE request_id IN ' + ids);
  await pool.query("DELETE FROM lab_requests WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%')");
  await pool.query("DELETE FROM patients WHERE full_name LIKE 'zz_test_%'");
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

const as = (who, m, url) => request(app)[m](url).set('Cookie', cookies[who]).set('Origin', ORIGIN);

async function newRequest() {
  const res = await as('doc', 'post', '/api/lab/requests').send({ patientId, testName: 'zz_test blood count' });
  return res.body.id;
}

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_labu_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_labu_doc', 'doctor');
  cookies.rec = await makeUser('zz_test_labu_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_labu_tech', 'lab_technician');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_labu_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('lab request updates', () => {
  it('rejects a request with no session', async () => {
    const res = await request(app).patch('/api/lab/requests/1').set('Origin', ORIGIN).send({ status: 'in_progress' });
    expect(res.status).toBe(401);
  });

  it('status flow: in progress, not twice, then cancelled, then final', async () => {
    const id = await newRequest();
    expect((await as('rec', 'patch', '/api/lab/requests/' + id).send({ status: 'in_progress' })).status).toBe(200);
    expect((await as('rec', 'patch', '/api/lab/requests/' + id).send({ status: 'in_progress' })).status).toBe(409);
    expect((await as('tech', 'patch', '/api/lab/requests/' + id).send({ status: 'cancelled' })).status).toBe(200);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ status: 'cancelled' })).status).toBe(409);
    const one = await as('doc', 'get', '/api/lab/requests/' + id);
    expect(one.body.request.status).toBe('cancelled');
  });

  it('only administrator and doctor can edit notes', async () => {
    const id = await newRequest();
    expect((await as('rec', 'patch', '/api/lab/requests/' + id).send({ notes: 'zz_test x' })).status).toBe(403);
    expect((await as('tech', 'patch', '/api/lab/requests/' + id).send({ notes: 'zz_test x' })).status).toBe(403);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ notes: 'zz_test by doctor' })).status).toBe(200);
    expect((await as('admin', 'patch', '/api/lab/requests/' + id).send({ notes: 'zz_test by admin' })).status).toBe(200);
    const one = await as('doc', 'get', '/api/lab/requests/' + id);
    expect(one.body.request.notes).toBe('zz_test by admin');
  });

  it('a completed request is final', async () => {
    const id = await newRequest();
    await pool.query("UPDATE lab_requests SET status = 'completed' WHERE id = ?", [id]);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ status: 'cancelled' })).status).toBe(409);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ notes: 'zz_test late' })).status).toBe(409);
  });

  it('returns 400 for bad input and 404 for an unknown id', async () => {
    const id = await newRequest();
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({})).status).toBe(400);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ status: 'completed' })).status).toBe(400);
    expect((await as('doc', 'patch', '/api/lab/requests/' + id).send({ status: 'requested' })).status).toBe(400);
    expect((await as('doc', 'patch', '/api/lab/requests/abc').send({ notes: 'x' })).status).toBe(400);
    expect((await as('doc', 'patch', '/api/lab/requests/999999').send({ status: 'cancelled' })).status).toBe(404);
  });
});
