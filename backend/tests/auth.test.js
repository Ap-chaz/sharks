import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';

const app = createApp();
const USER = 'zz_test_login';
const PASS = 'test-password-12345';
const ORIGIN = 'http://localhost:5173';

async function cleanup() {
  await pool.query('DELETE FROM login_attempts WHERE username LIKE ?', ['zz_test_%']);
  await pool.query('DELETE FROM users WHERE username = ?', [USER]);
}

beforeAll(async () => {
  await cleanup();
  const hash = await hashPassword(PASS);
  await pool.query(
    "INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, 'Test Login', ? FROM roles WHERE name = 'receptionist'",
    [USER, hash]
  );
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('auth routes', () => {
  it('rejects a wrong password with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: USER, password: 'wrong-password-123' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid username or password' });
  });

  it('gives the same message for an unknown username', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'zz_test_nobody', password: 'whatever-123456' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid username or password' });
  });

  it('rejects malformed input', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: '' });
    expect(res.status).toBe(400);
  });

  it('blocks a foreign Origin', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'http://evil.example').send({ username: USER, password: PASS });
    expect(res.status).toBe(403);
  });

  it('logs in, returns me with an httpOnly cookie, and logs out', async () => {
    await pool.query('DELETE FROM login_attempts WHERE username LIKE ?', ['zz_test_%']);
    const login = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ username: USER, password: PASS });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toContain('sharks_sid=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe(USER);
    expect(me.body.user.role).toBe('receptionist');

    const out = await request(app).post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie);
    expect(out.status).toBe(200);
    const after = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });

  it('refuses /me without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('locks out after 5 failures', async () => {
    await pool.query('DELETE FROM login_attempts WHERE username LIKE ?', ['zz_test_%']);
    for (let n = 0; n < 5; n++) {
      await request(app).post('/api/auth/login').send({ username: USER, password: 'wrong-password-123' });
    }
    const res = await request(app).post('/api/auth/login').send({ username: USER, password: PASS });
    expect(res.status).toBe(429);
  });
});
