import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';
import { logAudit } from '../src/auth/audit.js';

afterAll(async () => {
  await pool.query("DELETE FROM audit_logs WHERE action LIKE 'zz_test_%'");
  await pool.end();
});

describe('audit helper', () => {
  it('writes a row and strips sensitive keys from details', async () => {
    await logAudit({
      username: 'zz_test_audit',
      action: 'zz_test_event',
      details: { note: 'ok', password: 'secret-value', password_hash: 'x', sessionToken: 'y' },
      ip: '127.0.0.1',
    });
    const [rows] = await pool.query("SELECT username, details FROM audit_logs WHERE action = 'zz_test_event'");
    expect(rows.length).toBe(1);
    const details = typeof rows[0].details === 'string' ? JSON.parse(rows[0].details) : rows[0].details;
    expect(details).toEqual({ note: 'ok' });
  });

  it('does not throw when the insert fails', async () => {
    await expect(logAudit({ action: null, userId: 999999999 })).resolves.toBeUndefined();
  });
});
