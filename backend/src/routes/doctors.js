import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const doctorsRouter = Router();
doctorsRouter.use(requireAuth, requireRole('administrator'));

doctorsRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT d.id, d.full_name AS fullName, u.username AS username, d.is_default AS isDefault, d.is_active AS isActive ' +
        'FROM doctors d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.id'
    );
    res.json({
      doctors: rows.map((r) => ({ ...r, isDefault: !!r.isDefault, isActive: !!r.isActive })),
    });
  } catch (err) {
    next(err);
  }
});
