import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const publicFeedbackRouter = Router();
export const feedbackRouter = Router();

const MAX_PER_HOUR = 5;

const submitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(2).max(1000),
  website: z.string().max(200).optional(),
});

publicFeedbackRouter.post('/', async (req, res, next) => {
  try {
    const p = submitSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const { name, rating, message, website } = p.data;

    if (website) return res.status(201).json({ ok: true });

    const ip = req.ip ? String(req.ip).slice(0, 45) : 'unknown';
    const [cnt] = await pool.query(
      'SELECT COUNT(*) AS n FROM public_booking_attempts WHERE ip_address = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)',
      [ip]
    );
    if (cnt[0].n >= MAX_PER_HOUR) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    await pool.query('INSERT INTO public_booking_attempts (ip_address, created_at) VALUES (?, UTC_TIMESTAMP())', [ip]);

    const [result] = await pool.query(
      'INSERT INTO feedback (name, rating, message) VALUES (?, ?, ?)',
      [name ?? null, rating, message]
    );
    await logAudit({ username: 'public', action: 'public_feedback', entityType: 'feedback', entityId: result.insertId, ip });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

feedbackRouter.use(requireAuth, requireRole('administrator'));

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

feedbackRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, rating, message, status, created_at AS createdAt, reviewed_at AS reviewedAt FROM feedback ORDER BY id DESC'
    );
    res.json({ feedback: rows });
  } catch (err) {
    next(err);
  }
});

const patchSchema = z.object({ status: z.literal('reviewed') });

feedbackRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = patchSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const [found] = await pool.query('SELECT status FROM feedback WHERE id = ?', [id]);
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    if (found[0].status === 'reviewed') return res.status(409).json({ error: 'Already reviewed' });
    await pool.query(
      "UPDATE feedback SET status = 'reviewed', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'new'",
      [req.user.id, id]
    );
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'feedback_reviewed',
      entityType: 'feedback',
      entityId: id,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
