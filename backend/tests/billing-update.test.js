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
const item = { description: 'zz_test item', quantity: 1, unitPrice: 100 };

async function newInvoice() {
  const res = await asAdmin('post', '/api/billing/invoices').send({ patientId, items: [item] });
  return res.body.id;
}

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_billp_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_billp_rec', 'receptionist');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_billp_patient', '0700000000')");
  patientId = r.insertId;
});

afterAll(cleanup);

describe('invoice updates', () => {
  it('rejects a receptionist', async () => {
    const res = await request(app).patch('/api/billing/invoices/1').set('Cookie', cookies.rec).set('Origin', ORIGIN).send({ notes: 'x' });
    expect(res.status).toBe(403);
  });

  it('draft: edits notes and replaces items, then issues', async () => {
    const id = await newInvoice();
    const edit = await asAdmin('patch', '/api/billing/invoices/' + id).send({
      notes: 'zz_test new note',
      items: [{ description: 'zz_test replaced', quantity: 3, unitPrice: 50 }],
    });
    expect(edit.status).toBe(200);
    const one = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(one.body.invoice.notes).toBe('zz_test new note');
    expect(one.body.invoice.items.length).toBe(1);
    expect(one.body.invoice.total).toBe(150);

    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'issued' })).status).toBe(200);
    const after = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(after.body.invoice.status).toBe('issued');
  });

  it('issued: items are locked, notes still editable, cannot issue twice', async () => {
    const id = await newInvoice();
    await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'issued' });
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ items: [item] })).status).toBe(409);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'issued' })).status).toBe(409);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ notes: 'zz_test still ok' })).status).toBe(200);
  });

  it('void is final', async () => {
    const id = await newInvoice();
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'void' })).status).toBe(200);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ notes: 'zz_test x' })).status).toBe(409);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'issued' })).status).toBe(409);
  });

  it('an invoice with payments cannot be voided', async () => {
    const id = await newInvoice();
    await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'issued' });
    await pool.query("INSERT INTO payments (invoice_id, amount, method, paid_at) VALUES (?, 50, 'cash', UTC_TIMESTAMP())", [id]);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'void' })).status).toBe(409);
    const one = await asAdmin('get', '/api/billing/invoices/' + id);
    expect(one.body.invoice.status).toBe('issued');
    expect(one.body.invoice.paid).toBe(50);
  });

  it('returns 400 for bad input and 404 for an unknown id', async () => {
    const id = await newInvoice();
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({})).status).toBe(400);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ status: 'draft' })).status).toBe(400);
    expect((await asAdmin('patch', '/api/billing/invoices/' + id).send({ items: [] })).status).toBe(400);
    expect((await asAdmin('patch', '/api/billing/invoices/abc').send({ notes: 'x' })).status).toBe(400);
    expect((await asAdmin('patch', '/api/billing/invoices/999999').send({ notes: 'x' })).status).toBe(404);
  });
});
