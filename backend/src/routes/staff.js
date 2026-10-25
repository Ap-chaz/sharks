import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { hashPassword } from '../auth/password.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole('administrator'));

const ROLES = ['doctor', 'receptionist', 'lab_technician'];

const createSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_]{3,60}$/),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
  password: z.string().min(12).max(200),
});

const patchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

const resetSchema = z.object({ password: z.string().min(12).max(200) });

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function audit(req, action, targetId, details) {
  return logAudit({
    userId: req.user.id,
    username: req.user.username,
    action,
    entityType: 'user',
    entityId: targetId,
    details,
    ip: req.ip,
  });
}

staffRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.username, u.full_name AS fullName, r.name AS role, u.is_active AS isActive, u.last_login_at AS lastLoginAt ' +
        'FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id'
    );
    res.json({ staff: rows.map((r) => ({ ...r, isActive: !!r.isActive })) });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const { username, fullName, role, password } = p.data;
    const hash = await hashPassword(password);
    try {
      const [result] = await pool.query(
        'INSERT INTO users (role_id, username, full_name, password_hash) SELECT id, ?, ?, ? FROM roles WHERE name = ?',
        [username, fullName, hash, role]
      );
      await audit(req, 'staff_created', result.insertId, { username, role });
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

staffRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    const p = patchSchema.safeParse(req.body);
    if (!id || !p.success) return res.status(400).json({ error: 'Invalid request' });
    const [rows] = await pool.query(
      'SELECT u.id, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (rows[0].role === 'administrator') {
      return res.status(403).json({ error: 'The administrator account cannot be changed here' });
    }
    const sets = [];
    const vals = [];
    if (p.data.fullName !== undefined) { sets.push('full_name = ?'); vals.push(p.data.fullName); }
    if (p.data.role !== undefined) { sets.push('role_id = (SELECT id FROM roles WHERE name = ?)'); vals.push(p.data.role); }
    if (p.data.isActive !== undefined) { sets.push('is_active = ?'); vals.push(p.data.isActive ? 1 : 0); }
    await pool.query('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', [...vals, id]);
    if (p.data.isActive === false) await pool.query('DELETE FROM sessions WHERE user_id = ?', [id]);
    await audit(req, 'staff_updated', id, p.data);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

staffRouter.post('/:id/reset-password', async (req, res, next) => {
  try {
    const id = parseId(req);
    const p = resetSchema.safeParse(req.body);
    if (!id || !p.success) return res.status(400).json({ error: 'Invalid request' });
    const [rows] = await pool.query(
      'SELECT r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (rows[0].role === 'administrator') {
      return res.status(403).json({ error: 'Use the reset-admin-password script for the administrator' });
    }
    const hash = await hashPassword(p.data.password);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
      await conn.query('DELETE FROM sessions WHERE user_id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    await audit(req, 'staff_password_reset', id, null);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
