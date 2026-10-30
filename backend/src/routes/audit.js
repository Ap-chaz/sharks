import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('administrator'));

// Latest 200 entries, newest first. The details column is never returned.
auditRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, created_at AS createdAt, username, action, entity_type AS entityType, ' +
        'entity_id AS entityId, ip_address AS ipAddress ' +
        'FROM audit_logs ORDER BY id DESC LIMIT 200'
    );
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
});
