import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';
import { isLockedOut, recordAttempt } from '../src/auth/attempts.js';

const USER = 'zz_test_user';
const IP = '203.0.113.7';
const OTHER_IP = '203.0.113.8';

async function cleanup() {
  await pool.query('DELETE FROM login_attempts WHERE username LIKE ? OR ip_address IN (?, ?)', ['zz_test_%', IP, OTHER_IP]);
}

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('login attempt limiter', () => {
  it('locks username+IP after 5 failures, but not another IP', async () => {
    await cleanup();
    for (let n = 0; n < 4; n++) await recordAttempt(USER, IP, false);
    expect(await isLockedOut(USER, IP)).toBe(false);
    await recordAttempt(USER, IP, false);
    expect(await isLockedOut(USER, IP)).toBe(true);
    expect(await isLockedOut(USER, OTHER_IP)).toBe(false);
  });

  it('locks an IP after 20 failures across usernames', async () => {
    await cleanup();
    for (let n = 0; n < 20; n++) await recordAttempt('zz_test_' + n, IP, false);
    expect(await isLockedOut('zz_test_new', IP)).toBe(true);
  });

  it('ignores successful attempts', async () => {
    await cleanup();
    for (let n = 0; n < 6; n++) await recordAttempt(USER, IP, true);
    expect(await isLockedOut(USER, IP)).toBe(false);
  });
});
