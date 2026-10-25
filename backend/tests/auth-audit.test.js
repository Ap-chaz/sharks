import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';

const app = createApp();
const USER = 'zz_test_audit_login';
const PASS = 'test-password-12345';
const ORIGIN = 'http://localhost:5173';

async function cleanup() {
  await pool.query('DELETE FROM login_attempts WHERE username LIKE ?', ['zz_test_%']);
  await pool.query('DELETE FROM audit_logs WHERE username LIKE ?', ['zz_test_%']);
  await pool.query('DELETE FROM users WHERE username = ?', [USER]);
}

beforeAll(async () => {
  await cleanup();
  const hash = await hashPassword(PASS);
  await pool.query(
    "INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, 'Test Audit', ? FROM roles WHERE name = 'receptionist'",
    [USER, hash]
  );
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('auth audit events', () => {
  it('records failed login, success, logout and lockout without secrets', async () => {
    await request(app).post('/api/auth/login').send({ username: USER, password: 'wrong-password-123' });
    const ok = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ username: USER, password: PASS });
    const cookie = ok.headers['set-cookie'][0];
    await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
    for (let n = 0; n < 5; n++) {
      await request(app).post('/api/auth/login').send({ username: USER, password: 'wrong-password-123' });
    }
    await request(app).post('/api/auth/login').send({ username: USER, password: PASS });

    const [rows] = await pool.query('SELECT action, details FROM audit_logs WHERE username = ?', [USER]);
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('login_failed');
    expect(actions).toContain('login_success');
    expect(actions).toContain('logout');
    expect(actions).toContain('login_locked');
    expect(JSON.stringify(rows)).not.toContain(PASS);
  });
});
