import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const MON = '2030-01-07';
const SAT = '2030-01-05';
const cookies = {};
let patientId;

async function cleanup() {
  await pool.query("DELETE FROM appointments WHERE notes = 'zz_test_appt'");
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
  cookies.admin = await makeUser('zz_test_apt_admin', 'administrator');
  cookies.rec = await makeUser('zz_test_apt_rec', 'receptionist');
  cookies.lab = await makeUser('zz_test_apt_lab', 'lab_technician');
  const [r] = await pool.query("INSERT INTO patients (full_name, phone) VALUES ('zz_test_Patient', '0700000003')");
  patientId = r.insertId;
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

const post = (c) => request(app).post('/api/appointments').set('Origin', ORIGIN).set('Cookie', c);
const patch = (id, c) => request(app).patch('/api/appointments/' + id).set('Origin', ORIGIN).set('Cookie', c);
const body = (time) => ({ patientId, date: MON, time, notes: 'zz_test_appt' });

describe('appointments API', () => {
  it('requires a session and blocks the lab technician', async () => {
    expect((await request(app).get('/api/appointments?date=' + MON)).status).toBe(401);
    expect((await request(app).get('/api/appointments?date=' + MON).set('Cookie', cookies.lab)).status).toBe(403);
  });

  it('books a confirmed slot for Dr Nyameino and blocks a double-booking', async () => {
    const ok = await post(cookies.rec).send(body('09:00'));
    expect(ok.status).toBe(201);
    const dup = await post(cookies.rec).send(body('09:00'));
    expect(dup.status).toBe(409);
    const list = await request(app).get('/api/appointments?date=' + MON).set('Cookie', cookies.rec);
    const mine = list.body.appointments.find((a) => a.id === ok.body.id);
    expect(mine.status).toBe('confirmed');
    expect(mine.doctorId).toBe(1);
    expect(mine.date).toBe(MON);
    expect(mine.time).toBe('09:00');
  });

  it('rejects closed days, off-grid times and unknown patients', async () => {
    expect((await post(cookies.rec).send({ ...body('09:00'), date: SAT })).status).toBe(400);
    expect((await post(cookies.rec).send(body('09:15'))).status).toBe(400);
    expect((await post(cookies.rec).send({ ...body('10:00'), patientId: 999999999 })).status).toBe(400);
  });

  it('hides booked slots from the free-slot list', async () => {
    const res = await request(app).get('/api/appointments/slots?date=' + MON).set('Cookie', cookies.rec);
    expect(res.status).toBe(200);
    expect(res.body.slots).not.toContain('09:00');
    expect(res.body.slots).toContain('09:30');
    const closed = await request(app).get('/api/appointments/slots?date=' + SAT).set('Cookie', cookies.rec);
    expect(closed.body.slots).toEqual([]);
  });

  it('limits the receptionist and reserves reassignment for the administrator', async () => {
    const made = await post(cookies.rec).send(body('10:00'));
    const id = made.body.id;
    expect((await patch(id, cookies.rec).send({ status: 'completed' })).status).toBe(403);
    expect((await patch(id, cookies.rec).send({ doctorId: 2 })).status).toBe(403);
    expect((await patch(id, cookies.rec).send({ status: 'cancelled' })).status).toBe(200);
    expect((await patch(id, cookies.admin).send({ status: 'confirmed' })).status).toBe(200);
    expect((await patch(id, cookies.admin).send({ doctorId: 2 })).status).toBe(200);
    expect((await patch(id, cookies.admin).send({ doctorId: 999 })).status).toBe(400);
  });

  it('allows rebooking a cancelled slot but blocks un-cancelling into a taken one', async () => {
    const a = await post(cookies.rec).send(body('11:00'));
    await patch(a.body.id, cookies.rec).send({ status: 'cancelled' });
    const b = await post(cookies.rec).send(body('11:00'));
    expect(b.status).toBe(201);
    expect((await patch(a.body.id, cookies.admin).send({ status: 'confirmed' })).status).toBe(409);
  });

  it('writes audit rows without patient content', async () => {
    const [rows] = await pool.query("SELECT action, details FROM audit_logs WHERE username LIKE 'zz_test_apt_%'");
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('appointment_created');
    expect(actions).toContain('appointment_updated');
    expect(JSON.stringify(rows)).not.toContain('0700000003');
  });
});
