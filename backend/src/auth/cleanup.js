import { pool } from '../db/pool.js';

const KEEP_DAYS = 7;

export async function cleanupOldRows() {
  const [s] = await pool.query('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');
  const [l] = await pool.query(
    'DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
    [KEEP_DAYS]
  );
  const [b] = await pool.query(
    'DELETE FROM public_booking_attempts WHERE created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
    [KEEP_DAYS]
  );
  return { sessions: s.affectedRows, loginAttempts: l.affectedRows, bookingAttempts: b.affectedRows };
}
