import { pool } from '../db/pool.js';

export const MAX_FAILURES_PER_USER_IP = 5;
export const MAX_FAILURES_PER_IP = 20;
export const WINDOW_MINUTES = 15;

function clean(username, ip) {
  return [String(username).slice(0, 60), ip ? String(ip).slice(0, 45) : null];
}

export async function isLockedOut(username, ip) {
  const [u, i] = clean(username, ip);
  const [rows] = await pool.query(
    'SELECT ' +
      'SUM(username = ? AND ip_address <=> ?) AS user_ip, ' +
      'COUNT(*) AS ip_total ' +
      'FROM login_attempts ' +
      'WHERE succeeded = 0 ' +
      'AND ip_address <=> ? ' +
      'AND attempted_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)',
    [u, i, i, WINDOW_MINUTES]
  );
  const userIp = Number(rows[0].user_ip || 0);
  const ipTotal = Number(rows[0].ip_total || 0);
  return userIp >= MAX_FAILURES_PER_USER_IP || ipTotal >= MAX_FAILURES_PER_IP;
}

export async function recordAttempt(username, ip, succeeded) {
  const [u, i] = clean(username, ip);
  await pool.query(
    'INSERT INTO login_attempts (username, ip_address, succeeded, attempted_at) ' +
      'VALUES (?, ?, ?, UTC_TIMESTAMP())',
    [u, i, succeeded ? 1 : 0]
  );
}
