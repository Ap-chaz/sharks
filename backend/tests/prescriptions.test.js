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
  const mine = "(SELECT id FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%'))";
  await pool.query('DELETE FROM prescription_items WHERE prescription_id IN ' + mine);
  await pool.query("DELETE FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%')");
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
const item = (name = 'zz_test amoxicillin') => ({
  medication: name,
  dosage: '500mg',
  frequency: '3 times daily',
  duration: '5 days',
});
const body = () => ({ patientId, items: [item()] });

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_rx_admin', 'administrator');
  cookies.doc = await makeUser('zz_test_rx_doc', 'doctor');
  cookies.rec = await makeUser('zz_test_rx_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_rx_tech', 'lab_technician');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_rx_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('prescriptions', () => {
  it('rejects a request with no session', async () => {
    expect((await request(app).get('/api/prescriptions')).status).toBe(401);
  });

  it('blocks receptionist and lab technician on every route', async () => {
    for (const who of ['rec', 'tech']) {
      expect((await as(who, 'post', '/api/prescriptions').send(body())).status).toBe(403);
      expect((await as(who, 'get', '/api/prescriptions')).status).toBe(403);
      expect((await as(who, 'get', '/api/prescriptions/1')).status).toBe(403);
      expect((await as(who, 'patch', '/api/prescriptions/1').send({ notes: 'x' })).status).toBe(403);
    }
  });

  it('doctor creates, lists and reads a prescription with its items', async () => {
    const created = await as('doc', 'post', '/api/prescriptions').send({
      ...body(),
      notes: 'zz_test note',
      items: [item(), { ...item('zz_test ibuprofen'), instructions: 'After food' }],
    });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await as('admin', 'get', '/api/prescriptions');
    expect(list.status).toBe(200);
    const row = list.body.prescriptions.find((r) => r.id === id);
    expect(row.patientName).toBe('zz_test_rx_patient');
    expect(row.status).toBe('active');

    const one = await as('doc', 'get', '/api/prescriptions/' + id);
    expect(one.status).toBe(200);
    expect(one.body.prescription.notes).toBe('zz_test note');
    expect(one.body.prescription.items.length).toBe(2);
    expect(one.body.prescription.items[1].instructions).toBe('After food');
  });

  it('returns 400 for a bad body, unknown patient or unknown appointment', async () => {
    expect((await as('doc', 'post', '/api/prescriptions').send({ patientId })).status).toBe(400);
    expect((await as('doc', 'post', '/api/prescriptions').send({ patientId, items: [] })).status).toBe(400);
    const tooMany = Array.from({ length: 21 }, () => item());
    expect((await as('doc', 'post', '/api/prescriptions').send({ patientId, items: tooMany })).status).toBe(400);
    expect((await as('doc', 'post', '/api/prescriptions').send({ ...body(), patientId: 999999 })).status).toBe(400);
    expect((await as('doc', 'post', '/api/prescriptions').send({ ...body(), appointmentId: 999999 })).status).toBe(400);
  });

  it('returns 400 for a bad id and 404 for an unknown id', async () => {
    expect((await as('doc', 'get', '/api/prescriptions/abc')).status).toBe(400);
    expect((await as('doc', 'get', '/api/prescriptions/999999')).status).toBe(404);
    expect((await as('doc', 'patch', '/api/prescriptions/999999').send({ notes: 'x' })).status).toBe(404);
  });

  it('replaces notes and items while active', async () => {
    const id = (await as('doc', 'post', '/api/prescriptions').send(body())).body.id;
    const patched = await as('doc', 'patch', '/api/prescriptions/' + id).send({
      notes: 'zz_test new note',
      items: [item('zz_test paracetamol')],
    });
    expect(patched.status).toBe(200);
    const one = await as('doc', 'get', '/api/prescriptions/' + id);
    expect(one.body.prescription.notes).toBe('zz_test new note');
    expect(one.body.prescription.items.length).toBe(1);
    expect(one.body.prescription.items[0].medication).toBe('zz_test paracetamol');
  });

  it('rejects an empty patch and a cancel mixed with other changes', async () => {
    const id = (await as('doc', 'post', '/api/prescriptions').send(body())).body.id;
    expect((await as('doc', 'patch', '/api/prescriptions/' + id).send({})).status).toBe(400);
    expect((await as('doc', 'patch', '/api/prescriptions/' + id).send({ status: 'cancelled', notes: 'x' })).status).toBe(400);
    expect((await as('doc', 'patch', '/api/prescriptions/' + id).send({ status: 'active' })).status).toBe(400);
  });

  it('cancelling is final', async () => {
    const id = (await as('doc', 'post', '/api/prescriptions').send(body())).body.id;
    expect((await as('doc', 'patch', '/api/prescriptions/' + id).send({ status: 'cancelled' })).status).toBe(200);
    const one = await as('admin', 'get', '/api/prescriptions/' + id);
    expect(one.body.prescription.status).toBe('cancelled');
    expect((await as('doc', 'patch', '/api/prescriptions/' + id).send({ notes: 'x' })).status).toBe(409);
    expect((await as('admin', 'patch', '/api/prescriptions/' + id).send({ status: 'cancelled' })).status).toBe(409);
  });
});
