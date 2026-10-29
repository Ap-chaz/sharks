import { Router } from 'express';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole('administrator'));

// Nairobi is UTC+3 all year (no daylight saving).
const NAIROBI_HOURS = 3;

/** Month keys (YYYY-MM) in Nairobi time, from `back` months ago to `forward` months ahead, oldest first. */
function lastMonths(back, forward) {
  const now = new Date(Date.now() + NAIROBI_HOURS * 3600 * 1000);
  const keys = [];
  for (let i = back; i >= -forward; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'));
  }
  return keys;
}

reportsRouter.get('/summary', async (req, res, next) => {
  try {
    const [totals] = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(patient_id IS NULL), 0) AS website FROM appointments'
    );
    const [statuses] = await pool.query(
      'SELECT status, COUNT(*) AS n FROM appointments GROUP BY status ORDER BY n DESC'
    );
    const [doctors] = await pool.query(
      'SELECT d.id, d.full_name AS name, COUNT(a.id) AS n FROM doctors d LEFT JOIN appointments a ON a.doctor_id = d.id GROUP BY d.id, d.full_name ORDER BY n DESC, d.id'
    );
    const [months] = await pool.query(
      "SELECT DATE_FORMAT(DATE_ADD(starts_at, INTERVAL ? HOUR), '%Y-%m') AS month, COUNT(*) AS n FROM appointments GROUP BY month",
      [NAIROBI_HOURS]
    );
    const [ratings] = await pool.query('SELECT rating, COUNT(*) AS n FROM feedback GROUP BY rating');

    const monthTotals = new Map(months.map((m) => [m.month, Number(m.n)]));
    const ratingTotals = new Map(ratings.map((r) => [Number(r.rating), Number(r.n)]));
    const spread = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: ratingTotals.get(rating) ?? 0 }));
    const feedbackCount = spread.reduce((sum, r) => sum + r.count, 0);
    const feedbackSum = spread.reduce((sum, r) => sum + r.rating * r.count, 0);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'report_view',
      entityType: 'report',
      entityId: null,
      ip: req.ip,
    });

    res.json({
      appointments: {
        total: Number(totals[0].total),
        website: Number(totals[0].website),
        byStatus: statuses.map((s) => ({ status: s.status, count: Number(s.n) })),
        byDoctor: doctors.map((d) => ({ doctorId: d.id, name: d.name, count: Number(d.n) })),
        byMonth: lastMonths(3, 1).map((month) => ({ month, count: monthTotals.get(month) ?? 0 })),
      },
      feedback: {
        count: feedbackCount,
        average: feedbackCount ? Math.round((feedbackSum / feedbackCount) * 10) / 10 : null,
        spread,
      },
    });
  } catch (err) {
    next(err);
  }
});
