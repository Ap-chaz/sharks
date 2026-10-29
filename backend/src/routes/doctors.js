import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const doctorsRouter = Router();
doctorsRouter.use(requireAuth, requireRole('administrator'));

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  userId: z.number().int().positive().nullable().optional(),
});

const patchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    isActive: z.boolean().optional(),
    userId: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function audit(req, action, targetId, details) {
  return logAudit({
    userId: req.user.id,
    username: req.user.username,
    action,
    entityType: 'doctor',
    entityId: targetId,
    details,
    ip: req.ip,
  });
}

// A login can be linked only if it is an active doctor-role account.
async function isLinkableUser(userId) {
  const [rows] = await pool.query(
    'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.is_active = 1 AND r.name = ?',
    [userId, 'doctor']
  );
  return !!rows[0];
}

doctorsRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT d.id, d.full_name AS fullName, d.user_id AS userId, u.username AS username, d.is_default AS isDefault, d.is_active AS isActive ' +
        'FROM doctors d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.id'
    );
    res.json({
      doctors: rows.map((r) => ({ ...r, isDefault: !!r.isDefault, isActive: !!r.isActive })),
    });
  } catch (err) {
    next(err);
  }
});

doctorsRouter.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const { fullName } = p.data;
    const userId = p.data.userId ?? null;
    if (userId !== null && !(await isLinkableUser(userId))) {
      return res.status(400).json({ error: 'Choose an active doctor login' });
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO doctors (user_id, full_name) VALUES (?, ?)',
        [userId, fullName]
      );
      await audit(req, 'doctor_created', result.insertId, { fullName, userId });
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'That login is already linked to another doctor' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

doctorsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    const p = patchSchema.safeParse(req.body);
    if (!id || !p.success) return res.status(400).json({ error: 'Invalid request' });
    const [rows] = await pool.query('SELECT id, is_default AS isDefault FROM doctors WHERE id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const { fullName, isActive, userId } = p.data;
    if (rows[0].isDefault && (isActive === false || userId !== undefined)) {
      return res.status(403).json({ error: 'The default doctor cannot be deactivated or re-linked' });
    }
    if (userId !== undefined && userId !== null && !(await isLinkableUser(userId))) {
      return res.status(400).json({ error: 'Choose an active doctor login' });
    }
    const sets = [];
    const vals = [];
    if (fullName !== undefined) { sets.push('full_name = ?'); vals.push(fullName); }
    if (isActive !== undefined) { sets.push('is_active = ?'); vals.push(isActive ? 1 : 0); }
    if (userId !== undefined) { sets.push('user_id = ?'); vals.push(userId); }
    try {
      await pool.query('UPDATE doctors SET ' + sets.join(', ') + ' WHERE id = ?', [...vals, id]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'That login is already linked to another doctor' });
      }
      throw err;
    }
    await audit(req, 'doctor_updated', id, p.data);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
