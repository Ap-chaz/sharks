import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const PASS = 'test-password-12345';
const ORIGIN = 'http://localhost:5173';
const cookies = {};
let original = null;

async function cleanup() {
  await pool.query("DELETE FROM audit_logs WHERE username LIKE 'zz_test_%'");
  await pool.query("DELETE FROM users WHERE username LIKE 'zz_test_%'");
}

async function makeUser(username, role) {
  const hash = await hashPassword(PASS);
  await pool.query(
    'INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?',
    [username, 'Test ' + username, hash, role]
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return rows[0].id;
}

function sample(slotMinutes = 30) {
  const day = { open: '09:00', close: '17:00' };
  return { slotMinutes, days: { sun: null, mon: day, tue: day, wed: day, thu: day, fri: day, sat: null } };
}

beforeAll(async () => {
  await cleanup();
  const [rows] = await pool.query("SELECT setting_value FROM clinic_settings WHERE setting_key = 'opening_hours'");
  original = rows[0]?.setting_value;
  if (typeof original !== 'string') original = JSON.stringify(original);
  const roles = { admin: 'administrator', doc: 'doctor', rec: 'receptionist', lab: 'lab_technician' };
  for (const [key, role] of Object.entries(roles)) {
    const id = await makeUser('zz_test_settings_' + key, role);
    cookies[key] = COOKIE_NAME + '=' + (await createSession(id, '127.0.0.1', 'vitest'));
  }
});

afterAll(async () => {
  if (original) {
    await pool.query("UPDATE clinic_settings SET setting_value = ? WHERE setting_key = 'opening_hours'", [original]);
  }
  await cleanup();
  await pool.end();
});

describe('settings route', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/settings/opening-hours')).status).toBe(401);
  });

  it('refuses doctor, receptionist and lab technician', async () => {
    for (const key of ['doc', 'rec', 'lab']) {
      const get = await request(app).get('/api/settings/opening-hours').set('Cookie', cookies[key]);
      expect(get.status).toBe(403);
      const patch = await request(app)
        .patch('/api/settings/opening-hours')
        .set('Cookie', cookies[key])
        .set('Origin', ORIGIN)
        .send(sample());
      expect(patch.status).toBe(403);
    }
  });

  it('returns the opening hours to the administrator', async () => {
    const res = await request(app).get('/api/settings/opening-hours').set('Cookie', cookies.admin);
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('Africa/Nairobi');
    expect([15, 30, 45, 60]).toContain(res.body.slotMinutes);
    expect(Object.keys(res.body.days).sort()).toEqual(['fri', 'mon', 'sat', 'sun', 'thu', 'tue', 'wed']);
  });

  it('saves new hours, changes the booking slots, and audits it', async () => {
    const res = await request(app)
      .patch('/api/settings/opening-hours')
      .set('Cookie', cookies.admin)
      .set('Origin', ORIGIN)
      .send(sample(60));
    expect(res.status).toBe(200);
    const get = await request(app).get('/api/settings/opening-hours').set('Cookie', cookies.admin);
    expect(get.body.slotMinutes).toBe(60);
    expect(get.body.days.mon).toEqual({ open: '09:00', close: '17:00' });
    expect(get.body.days.sat).toBeNull();
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM audit_logs WHERE username = 'zz_test_settings_admin' AND action = 'settings_updated'"
    );
    expect(Number(rows[0].n)).toBeGreaterThan(0);
  });

  it('rejects bad input and leaves the saved hours alone', async () => {
    const before = await request(app).get('/api/settings/opening-hours').set('Cookie', cookies.admin);
    const bad = [
      { ...sample(), slotMinutes: 20 },
      { ...sample(), days: { ...sample().days, mon: { open: '18:00', close: '09:00' } } },
      { ...sample(), days: { ...sample().days, mon: { open: '9am', close: '5pm' } } },
      { ...sample(60), days: { ...sample().days, mon: { open: '09:00', close: '09:30' } } },
      { slotMinutes: 30 },
    ];
    for (const body of bad) {
      const res = await request(app)
        .patch('/api/settings/opening-hours')
        .set('Cookie', cookies.admin)
        .set('Origin', ORIGIN)
        .send(body);
      expect(res.status).toBe(400);
    }
    const after = await request(app).get('/api/settings/opening-hours').set('Cookie', cookies.admin);
    expect(after.body).toEqual(before.body);
  });

  it('refuses a write from a foreign Origin', async () => {
    const res = await request(app)
      .patch('/api/settings/opening-hours')
      .set('Cookie', cookies.admin)
      .set('Origin', 'http://evil.example')
      .send(sample());
    expect(res.status).toBe(403);
  });
});
