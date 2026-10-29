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
  await pool.query("DELETE FROM appointments WHERE requester_name LIKE 'zz_test_%'");
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

const as = (who, url) => request(app).get(url).set('Cookie', cookies[who]).set('Origin', ORIGIN);

beforeAll(async () => {
  await cleanup();
  cookies.admin = await makeUser('zz_test_pend_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_pend_rec', 'receptionist');
  cookies.tech = await makeUser('zz_test_pend_tech', 'lab_technician');
  await pool.query(
    "INSERT INTO appointments (doctor_id, starts_at, status, requester_name, requester_phone, notes) VALUES (1, '2031-03-04 09:00:00', 'pending', 'zz_test_pending_person', '0711000111', 'zz_test note')"
  );
  await pool.query(
    "INSERT INTO appointments (doctor_id, starts_at, status, requester_name, requester_phone, notes) VALUES (1, '2031-03-04 09:30:00', 'confirmed', 'zz_test_confirmed_person', '0711000222', NULL)"
  );
});

afterAll(cleanup);

describe('pending appointments list', () => {
  it('rejects a request with no session', async () => {
    expect((await request(app).get('/api/appointments?status=pending')).status).toBe(401);
  });

  it('blocks the lab technician', async () => {
    expect((await as('tech', '/api/appointments?status=pending')).status).toBe(403);
  });

  it('returns 400 for any status other than pending', async () => {
    expect((await as('admin', '/api/appointments?status=confirmed')).status).toBe(400);
    expect((await as('admin', '/api/appointments?status=')).status).toBe(400);
    expect((await as('admin', '/api/appointments?status=pending&status=pending')).status).toBe(400);
  });

  it('lists pending requests with name, phone and Nairobi time', async () => {
    const res = await as('admin', '/api/appointments?status=pending');
    expect(res.status).toBe(200);
    const row = res.body.appointments.find((a) => a.patientName === 'zz_test_pending_person');
    expect(row.phone).toBe('0711000111');
    expect(row.status).toBe('pending');
    expect(row.date).toBe('2031-03-04');
    expect(row.time).toBe('12:00');
    expect(res.body.appointments.some((a) => a.patientName === 'zz_test_confirmed_person')).toBe(false);
  });

  it('lets the receptionist list pending requests', async () => {
    expect((await as('rec', '/api/appointments?status=pending')).status).toBe(200);
  });

  it('still lists a day by date and now includes the phone', async () => {
    const res = await as('admin', '/api/appointments?date=2031-03-04');
    expect(res.status).toBe(200);
    const row = res.body.appointments.find((a) => a.patientName === 'zz_test_confirmed_person');
    expect(row.phone).toBe('0711000222');
    expect(res.body.appointments.some((a) => a.patientName === 'zz_test_pending_person')).toBe(true);
    expect((await as('admin', '/api/appointments')).status).toBe(400);
  });
});
