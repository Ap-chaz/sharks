import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/auth/password.js';
import { cleanupOldRows } from '../src/auth/cleanup.js';

const USER = 'zz_test_cleanup_user';
const IP = '203.0.113.77';
let userId;

async function cleanup() {
  await pool.query('DELETE FROM login_attempts WHERE username = ?', [USER]);
  await pool.query('DELETE FROM public_booking_attempts WHERE ip_address = ?', [IP]);
  await pool.query("DELETE FROM users WHERE username LIKE 'zz_test_cleanup%'");
}

async function count(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows[0].n;
}

beforeAll(async () => {
  await cleanup();
  const hash = await hashPassword('test-password-12345');
  await pool.query(
    'INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?',
    [USER, 'Test cleanup', hash, 'doctor']
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [USER]);
  userId = rows[0].id;

  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR))',
    ['zz_test_cleanup_expired'.padEnd(64, '0'), userId]
  );
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))',
    ['zz_test_cleanup_valid'.padEnd(64, '0'), userId]
  );
  await pool.query(
    'INSERT INTO login_attempts (username, ip_address, succeeded, attempted_at) VALUES (?, ?, 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY))',
    [USER, IP]
  );
  await pool.query(
    'INSERT INTO login_attempts (username, ip_address, succeeded, attempted_at) VALUES (?, ?, 0, UTC_TIMESTAMP())',
    [USER, IP]
  );
  await pool.query(
    'INSERT INTO public_booking_attempts (ip_address, created_at) VALUES (?, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY))',
    [IP]
  );
  await pool.query('INSERT INTO public_booking_attempts (ip_address, created_at) VALUES (?, UTC_TIMESTAMP())', [IP]);
});

afterAll(cleanup);

describe('cleanupOldRows', () => {
  it('removes only old rows and keeps recent ones', async () => {
    const result = await cleanupOldRows();
    expect(result.sessions).toBeGreaterThanOrEqual(1);
    expect(result.loginAttempts).toBeGreaterThanOrEqual(1);
    expect(result.bookingAttempts).toBeGreaterThanOrEqual(1);

    expect(await count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?', [userId])).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM login_attempts WHERE username = ?', [USER])).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM public_booking_attempts WHERE ip_address = ?', [IP])).toBe(1);
  });
});
