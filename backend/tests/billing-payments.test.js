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
  const ids = "(SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%'))";
  await pool.query('DELETE FROM payments WHERE invoice_id IN ' + ids);
  await pool.query('DELETE FROM invoice_items WHERE invoice_id IN ' + ids);
  await pool.query("DELETE FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE full_name LIKE 'zz_test_%')");
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

const asAdmin = (m, url) => request(app)[m](url).set('Cookie', cookies.admin).set('Origin', ORIGIN);

async function newInvoice(issue) {
  const res = await asAdmin('post', '/api/billing/invoices').send({
    patientId,
    items: [{ description: 'zz_test item', quantity: 1, unitPrice: 100 }],
  });
  if (issue) await asAdmin('patch', '/api/billing/invoices/' + res.body.id).send({ status: 'issued' });
  return res.body.id;
}

const pay = (id, body) => asAdmin('post', '/api/billing/invoices/' + id + '/payments').send(body);

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_pay_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_pay_rec', 'receptionist');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_pay_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('payments', () => {
  it('rejects no session and a receptionist', async () => {
    expect((await request(app).post('/api/billing/invoices/1/payments').send({})).status).toBe(401);
    const res = await request(app).post('/api/billing/invoices/1/payments').set('Cookie', cookies.rec).set('Origin', ORIGIN).send({ amount: 10, method: 'cash' });
    expect(res.status).toBe(403);
  });

  it('records part-payments and allows paying exactly the total', async () => {
    const id = await newInvoice(true);
    expect((await pay(id, { amount: 40.5, method: 'mpesa', reference: 'ZZTEST123' })).status).toBe(201);
    expect((await pay(id, { amount: 59.5, method: 'cash' })).status).toBe(201);
    const one = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(one.body.invoice.payments.length).toBe(2);
    expect(one.body.invoice.paid).toBe(100);
    expect(one.body.invoice.payments[0].reference).toBe('ZZTEST123');
  });

  it('refuses a payment above the amount due', async () => {
    const id = await newInvoice(true);
    expect((await pay(id, { amount: 60, method: 'cash' })).status).toBe(201);
    expect((await pay(id, { amount: 40.01, method: 'cash' })).status).toBe(409);
    const one = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(one.body.invoice.paid).toBe(60);
  });

  it('refuses payments on a draft or void invoice', async () => {
    const draft = await newInvoice(false);
    expect((await pay(draft, { amount: 10, method: 'cash' })).status).toBe(409);
    const voided = await newInvoice(false);
    await asAdmin('patch', '/api/billing/invoices/' + voided).send({ status: 'void' });
    expect((await pay(voided, { amount: 10, method: 'cash' })).status).toBe(409);
  });

  it('returns 400 for bad input and 404 for an unknown invoice', async () => {
    const id = await newInvoice(true);
    expect((await pay(id, { amount: 0, method: 'cash' })).status).toBe(400);
    expect((await pay(id, { amount: -5, method: 'cash' })).status).toBe(400);
    expect((await pay(id, { amount: 10.001, method: 'cash' })).status).toBe(400);
    expect((await pay(id, { amount: 10, method: 'bitcoin' })).status).toBe(400);
    expect((await pay(id, { method: 'cash' })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices/abc/payments').send({ amount: 10, method: 'cash' })).status).toBe(400);
    expect((await pay(999999, { amount: 10, method: 'cash' })).status).toBe(404);
  });
});
