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
const body = () => ({ patientId, testName: 'zz_test blood count' });

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_lab_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_lab_doc', 'doctor');
  cookies.rec = await makeUser('zz_test_lab_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_lab_tech', 'lab_technician');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_lab_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('lab requests', () => {
  it('rejects a request with no session', async () => {
    expect((await request(app).get('/api/lab/requests')).status).toBe(401);
  });

  it('enforces roles on create and on reading one request', async () => {
    expect((await as('rec', 'post', '/api/lab/requests').send(body())).status).toBe(403);
    expect((await as('tech', 'post', '/api/lab/requests').send(body())).status).toBe(403);
    expect((await as('rec', 'get', '/api/lab/requests/1')).status).toBe(403);
    expect((await as('tech', 'get', '/api/lab/requests/1')).status).toBe(403);
  });

  it('doctor creates, lists and reads a request, then the result shows', async () => {
    const created = await as('doc', 'post', '/api/lab/requests').send({ ...body(), notes: 'zz_test note' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await as('doc', 'get', '/api/lab/requests');
    expect(list.status).toBe(200);
    const row = list.body.requests.find((r) => r.id === id);
    expect(row.patientName).toBe('zz_test_lab_patient');
    expect(row.status).toBe('requested');

    const one = await as('doc', 'get', '/api/lab/requests/' + id);
    expect(one.status).toBe(200);
    expect(one.body.request.testName).toBe('zz_test blood count');
    expect(one.body.request.result).toBe(null);

    await pool.query("INSERT INTO lab_results (request_id, result_text, entered_at) VALUES (?, 'zz_test result', UTC_TIMESTAMP())", [id]);
    const again = await as('admin', 'get', '/api/lab/requests/' + id);
    expect(again.body.request.result.resultText).toBe('zz_test result');
  });

  it('lab technician sees only open requests; receptionist sees all', async () => {
    const open = (await as('doc', 'post', '/api/lab/requests').send(body())).body.id;
    const done = (await as('doc', 'post', '/api/lab/requests').send(body())).body.id;
    await pool.query("UPDATE lab_requests SET status = 'completed' WHERE id = ?", [done]);

    const tech = await as('tech', 'get', '/api/lab/requests');
    expect(tech.status).toBe(200);
    expect(tech.body.requests.some((r) => r.id === open)).toBe(true);
    expect(tech.body.requests.some((r) => r.id === done)).toBe(false);

    const rec = await as('rec', 'get', '/api/lab/requests');
    expect(rec.status).toBe(200);
    expect(rec.body.requests.some((r) => r.id === done)).toBe(true);
  });

  it('returns 400 for a bad body or unknown patient or appointment', async () => {
    expect((await as('doc', 'post', '/api/lab/requests').send({ patientId })).status).toBe(400);
    expect((await as('doc', 'post', '/api/lab/requests').send({ patientId, testName: 'x' })).status).toBe(400);
    expect((await as('doc', 'post', '/api/lab/requests').send({ patientId: 999999, testName: 'zz_test blood' })).status).toBe(400);
    expect((await as('doc', 'post', '/api/lab/requests').send({ ...body(), appointmentId: 999999 })).status).toBe(400);
  });

  it('returns 400 for a bad id and 404 for an unknown id', async () => {
    expect((await as('doc', 'get', '/api/lab/requests/abc')).status).toBe(400);
    expect((await as('doc', 'get', '/api/lab/requests/999999')).status).toBe(404);
  });
});
