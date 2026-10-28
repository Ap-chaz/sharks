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

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_bill_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_bill_rec', 'receptionist');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_bill_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('invoices', () => {
  it('rejects a request with no session', async () => {
    const res = await request(app).get('/api/billing/invoices');
    expect(res.status).toBe(401);
  });

  it('rejects a receptionist', async () => {
    const res = await request(app).get('/api/billing/invoices').set('Cookie', cookies.rec);
    expect(res.status).toBe(403);
  });

  it('admin creates, lists and reads an invoice with computed total', async () => {
    const created = await asAdmin('post', '/api/billing/invoices').send({
      patientId,
      notes: 'zz_test note',
      items: [
        { description: 'zz_test consultation', quantity: 2, unitPrice: 1500.5 },
        { description: 'zz_test lab fee', quantity: 1, unitPrice: 200 },
      ],
    });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await asAdmin('get', '/api/billing/invoices');
    expect(list.status).toBe(200);
    const row = list.body.invoices.find((i) => i.id === id);
    expect(row.patientName).toBe('zz_test_bill_patient');
    expect(row.status).toBe('draft');
    expect(row.total).toBe(3201);
    expect(row.paid).toBe(0);

    const one = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(one.status).toBe(200);
    expect(one.body.invoice.items.length).toBe(2);
    expect(one.body.invoice.payments).toEqual([]);
    expect(one.body.invoice.total).toBe(3201);
    expect(one.body.invoice.notes).toBe('zz_test note');
  });

  it('returns 400 for a bad body', async () => {
    const ok = { description: 'zz_test item', quantity: 1, unitPrice: 10 };
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId, items: [] })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId, items: [{ ...ok, quantity: 0 }] })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId, items: [{ ...ok, unitPrice: -5 }] })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId, items: [{ ...ok, unitPrice: 1.005 }] })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices').send({ items: [ok] })).status).toBe(400);
  });

  it('returns 400 for an unknown patient or appointment', async () => {
    const ok = { description: 'zz_test item', quantity: 1, unitPrice: 10 };
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId: 999999, items: [ok] })).status).toBe(400);
    expect((await asAdmin('post', '/api/billing/invoices').send({ patientId, appointmentId: 999999, items: [ok] })).status).toBe(400);
  });

  it('returns 400 for a bad id and 404 for an unknown id', async () => {
    expect((await asAdmin('get', '/api/billing/invoices/abc')).status).toBe(400);
    expect((await asAdmin('get', '/api/billing/invoices/999999')).status).toBe(404);
  });
});
