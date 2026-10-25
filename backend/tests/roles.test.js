import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { createSession } from '../src/auth/sessions.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';
import { COOKIE_NAME } from '../src/routes/auth.js';

const USER = 'zz_test_roles';
let cookie;

const app = express();
app.use(cookieParser());
app.get('/admin-only', requireAuth, requireRole('administrator'), (req, res) => res.json({ ok: true }));
app.get('/staff', requireAuth, requireRole('administrator', 'receptionist'), (req, res) => res.json({ ok: true }));

beforeAll(async () => {
  await pool.query('DELETE FROM users WHERE username = ?', [USER]);
  const hash = await hashPassword('test-password-12345');
  await pool.query(
    "INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, 'Test Roles', ? FROM roles WHERE name = 'receptionist'",
    [USER, hash]
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [USER]);
  const sid = await createSession(rows[0].id, '127.0.0.1', 'vitest');
  cookie = COOKIE_NAME + '=' + sid;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE username = ?', [USER]);
  await pool.end();
});

describe('role middleware', () => {
  it('returns 401 without a session', async () => {
    expect((await request(app).get('/staff')).status).toBe(401);
  });
  it('returns 403 for a role that is not allowed', async () => {
    expect((await request(app).get('/admin-only').set('Cookie', cookie)).status).toBe(403);
  });
  it('allows a permitted role', async () => {
    expect((await request(app).get('/staff').set('Cookie', cookie)).status).toBe(200);
  });
});
