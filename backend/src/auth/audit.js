import { pool } from '../db/pool.js';

const FORBIDDEN = /pass|hash|secret|token|cookie/i;

function sanitize(details) {
  if (!details || typeof details !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(details)) {
    if (!FORBIDDEN.test(k)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export async function logAudit({ userId = null, username = null, action, entityType = null, entityId = null, details = null, ip = null }) {
  try {
    const clean = sanitize(details);
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        username ? String(username).slice(0, 60) : null,
        String(action).slice(0, 60),
        entityType,
        entityId === null ? null : String(entityId).slice(0, 40),
        clean ? JSON.stringify(clean) : null,
        ip ? String(ip).slice(0, 45) : null,
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err.code || err.message);
  }
}
