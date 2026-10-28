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

const enter = (who, id, body) => as(who, 'post', '/api/lab/requests/' + id + '/result').send(body);

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_labr_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_labr_doc', 'doctor');
  cookies.rec = await makeUser('zz_test_labr_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_labr_tech', 'lab_technician');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_labr_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('lab results', () => {
  it('rejects no session, doctor and receptionist', async () => {
    expect((await request(app).post('/api/lab/requests/1/result').send({ resultText: 'x' })).status).toBe(401);
    expect((await enter('doc', 1, { resultText: 'zz_test r' })).status).toBe(403);
    expect((await enter('rec', 1, { resultText: 'zz_test r' })).status).toBe(403);
  });

  it('technician enters a result, request completes, doctor reads it', async () => {
    const id = await newRequest();
    await as('tech', 'patch', '/api/lab/requests/' + id).send({ status: 'in_progress' });
    const res = await enter('tech', id, { resultText: 'zz_test Hb 13.5', unit: 'g/dL', referenceRange: '12-16' });
    expect(res.status).toBe(201);
    const one = await as('doc', 'get', '/api/lab/requests/' + id);
    expect(one.body.request.status).toBe('completed');
    expect(one.body.request.result.resultText).toBe('zz_test Hb 13.5');
    expect(one.body.request.result.unit).toBe('g/dL');
    expect(one.body.request.result.referenceRange).toBe('12-16');
  });

  it('administrator can also enter a result', async () => {
    const id = await newRequest();
    expect((await enter('admin', id, { resultText: 'zz_test ok' })).status).toBe(201);
  });

  it('refuses a second result, a cancelled request, and an unknown id', async () => {
    const id = await newRequest();
    expect((await enter('tech', id, { resultText: 'zz_test first' })).status).toBe(201);
    expect((await enter('tech', id, { resultText: 'zz_test second' })).status).toBe(409);
    const cancelled = await newRequest();
    await as('doc', 'patch', '/api/lab/requests/' + cancelled).send({ status: 'cancelled' });
    expect((await enter('tech', cancelled, { resultText: 'zz_test late' })).status).toBe(409);
    expect((await enter('tech', 999999, { resultText: 'zz_test r' })).status).toBe(404);
  });

  it('returns 400 for bad input', async () => {
    const id = await newRequest();
    expect((await enter('tech', id, {})).status).toBe(400);
    expect((await enter('tech', id, { resultText: '' })).status).toBe(400);
    expect((await enter('tech', id, { resultText: 'a'.repeat(2001) })).status).toBe(400);
    expect((await as('tech', 'post', '/api/lab/requests/abc/result').send({ resultText: 'zz_test r' })).status).toBe(400);
  });
});
