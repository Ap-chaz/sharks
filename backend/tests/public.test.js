import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
const ORIGIN = 'http://localhost:5173';
const MON = '2030-01-07';
const SAT = '2030-01-05';
const TEST_IPS = ['::ffff:127.0.0.1', '127.0.0.1', '::1'];
const NOTE = 'zz_test_pub';
const NAME = 'zz_test_Public Person';
const PHONE = '0711223344';

async function cleanup() {
  await pool.query('DELETE FROM appointments WHERE notes = ?', [NOTE]);
  await pool.query("DELETE FROM audit_logs WHERE username = 'public' AND action = 'public_booking'");
  await pool.query('DELETE FROM public_booking_attempts WHERE ip_address IN (?, ?, ?)', TEST_IPS);
}

function book(body) {
  return request(app)
    .post('/api/public/appointments')
    .set('Origin', ORIGIN)
    .send({ name: NAME, phone: PHONE, date: MON, time: '10:00', notes: NOTE, ...body });
}

async function count(sql) {
  const [rows] = await pool.query(sql);
  return rows[0].n;
}

beforeEach(cleanup);
afterAll(cleanup);

describe('public booking', () => {
  it('saves a pending request for doctor 1 and creates no patient', async () => {
    const before = await count('SELECT COUNT(*) AS n FROM patients');
    const res = await book({});
    expect(res.status).toBe(201);
    const [rows] = await pool.query('SELECT * FROM appointments WHERE notes = ?', [NOTE]);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].doctor_id).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM patients')).toBe(before);
  });

  it('honeypot returns 201 and saves nothing', async () => {
    const res = await book({ website: 'http://spam.example' });
    expect(res.status).toBe(201);
    const [rows] = await pool.query('SELECT id FROM appointments WHERE notes = ?', [NOTE]);
    expect(rows.length).toBe(0);
  });

  it('returns 429 on the 6th attempt from the same IP', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await book({ time: '10:15' });
      expect(r.status).toBe(400);
    }
    const sixth = await book({ time: '10:15' });
    expect(sixth.status).toBe(429);
  });

  it('returns 409 when the slot is taken', async () => {
    expect((await book({})).status).toBe(201);
    expect((await book({})).status).toBe(409);
  });

  it('returns 400 for a closed day and an off-grid time', async () => {
    expect((await book({ date: SAT })).status).toBe(400);
    expect((await book({ time: '10:15' })).status).toBe(400);
  });

  it('audit row does not contain the name or phone', async () => {
    expect((await book({})).status).toBe(201);
    const [rows] = await pool.query("SELECT * FROM audit_logs WHERE username = 'public' AND action = 'public_booking'");
    expect(rows.length).toBe(1);
    const text = JSON.stringify(rows[0]);
    expect(text).not.toContain('Public Person');
    expect(text).not.toContain(PHONE);
  });

  it('free-slots endpoint lists open slots and hides a booked one', async () => {
    const before = await request(app).get('/api/public/slots?date=' + MON);
    expect(before.status).toBe(200);
    expect(before.body.slots).toContain('10:00');
    expect(before.body.slots).toContain('19:30');
    expect(before.body.slots).not.toContain('20:00');
    await book({});
    const after = await request(app).get('/api/public/slots?date=' + MON);
    expect(after.body.slots).not.toContain('10:00');
  });

  it('free-slots endpoint rejects a bad date', async () => {
    const res = await request(app).get('/api/public/slots?date=garbage');
    expect(res.status).toBe(400);
  });
});
