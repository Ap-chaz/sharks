import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

export const SESSION_HOURS = 8;

export async function createSession(userId, ip, userAgent) {
  const id = crypto.randomBytes(32).toString('hex');
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) ' +
      'VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR), ?, ?)',
    [id, userId, SESSION_HOURS, ip ? String(ip).slice(0, 45) : null, userAgent ? String(userAgent).slice(0, 255) : null]
  );
  return id;
}

export async function findSession(id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) return null;
  const [rows] = await pool.query(
    'SELECT s.id, u.id AS user_id, u.username, u.full_name, r.name AS role ' +
      'FROM sessions s ' +
      'JOIN users u ON u.id = s.user_id ' +
      'JOIN roles r ON r.id = u.role_id ' +
      'WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = 1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function deleteSession(id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) return;
  await pool.query('DELETE FROM sessions WHERE id = ?', [id]);
}
