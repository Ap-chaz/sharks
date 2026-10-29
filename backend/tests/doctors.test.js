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
    const id = await makeUser('zz_test_doctors_' + key, role);
    cookies[key] = COOKIE_NAME + '=' + (await createSession(id, '127.0.0.1', 'vitest'));
  }
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('doctors route', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/doctors')).status).toBe(401);
  });

  it('refuses doctor, receptionist and lab technician', async () => {
    for (const key of ['doc', 'rec', 'lab']) {
      const res = await request(app).get('/api/doctors').set('Cookie', cookies[key]);
      expect(res.status).toBe(403);
    }
  });

  it('lists doctors for the administrator', async () => {
    const res = await request(app).get('/api/doctors').set('Cookie', cookies.admin);
    expect(res.status).toBe(200);
    expect(res.body.doctors.length).toBeGreaterThan(0);
    const d = res.body.doctors[0];
    expect(d).toHaveProperty('id');
    expect(d).toHaveProperty('fullName');
    expect(d).toHaveProperty('username');
    expect(typeof d.isDefault).toBe('boolean');
    expect(typeof d.isActive).toBe('boolean');
  });
});
