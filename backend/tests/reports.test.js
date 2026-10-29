import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const app = createApp();
const PASS = 'test-password-12345';
const cookies = {};

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

beforeAll(async () => {
  await cleanup();
  const roles = {
    admin: 'administrator',
    doc: 'doctor',
    rec: 'receptionist',
    lab: 'lab_technician',
  };
  for (const [key, role] of Object.entries(roles)) {
    const id = await makeUser('zz_test_reports_' + key, role);
    cookies[key] = COOKIE_NAME + '=' + (await createSession(id, '127.0.0.1', 'vitest'));
  }
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('reports route', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/reports/summary')).status).toBe(401);
  });

  it('refuses doctor, receptionist and lab technician', async () => {
    for (const key of ['doc', 'rec', 'lab']) {
      const res = await request(app).get('/api/reports/summary').set('Cookie', cookies[key]);
      expect(res.status).toBe(403);
    }
  });

  it('returns the summary for the administrator', async () => {
    const res = await request(app).get('/api/reports/summary').set('Cookie', cookies.admin);
    expect(res.status).toBe(200);

    const a = res.body.appointments;
    expect(typeof a.total).toBe('number');
    expect(typeof a.website).toBe('number');
    expect(a.website).toBeLessThanOrEqual(a.total);
    expect(Array.isArray(a.byStatus)).toBe(true);
    expect(a.byStatus.reduce((sum, s) => sum + s.count, 0)).toBe(a.total);
    expect(a.byDoctor.length).toBeGreaterThan(0);
    expect(a.byDoctor[0]).toHaveProperty('doctorId');
    expect(a.byDoctor[0]).toHaveProperty('name');
    expect(a.byMonth).toHaveLength(5);
    expect(a.byMonth[0].month).toMatch(/^\d{4}-\d{2}$/);

    const f = res.body.feedback;
    expect(f.spread.map((s) => s.rating)).toEqual([5, 4, 3, 2, 1]);
    expect(f.spread.reduce((sum, s) => sum + s.count, 0)).toBe(f.count);
    if (f.count === 0) expect(f.average).toBeNull();
    else expect(f.average).toBeGreaterThanOrEqual(1);
  });

  it('records the view in the audit log', async () => {
    await request(app).get('/api/reports/summary').set('Cookie', cookies.admin);
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM audit_logs WHERE username = 'zz_test_reports_admin' AND action = 'report_view'"
    );
    expect(Number(rows[0].n)).toBeGreaterThan(0);
  });
});
