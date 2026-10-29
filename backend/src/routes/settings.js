import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole('administrator'));

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const dayShape = z
  .object({ open: z.string().regex(TIME), close: z.string().regex(TIME) })
  .strict()
  .nullable();

const hoursSchema = z
  .object({
    slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
    days: z.object(Object.fromEntries(DAYS.map((d) => [d, dayShape]))).strict(),
  })
  .strict()
  .refine(
    (h) =>
      DAYS.every((d) => {
        const day = h.days[d];
        return !day || minutes(day.close) - minutes(day.open) >= h.slotMinutes;
      }),
    { message: 'Each open day must be at least one slot long' }
  );

async function readHours() {
  const [rows] = await pool.query("SELECT setting_value FROM clinic_settings WHERE setting_key = 'opening_hours'");
  const v = rows[0]?.setting_value;
  return typeof v === 'string' ? JSON.parse(v) : v;
}

settingsRouter.get('/opening-hours', async (req, res, next) => {
  try {
    const hours = await readHours();
    if (!hours) return res.status(404).json({ error: 'Not found' });
    res.json({ timezone: 'Africa/Nairobi', slotMinutes: hours.slotMinutes, days: hours.days });
  } catch (err) {
    next(err);
  }
});

settingsRouter.patch('/opening-hours', async (req, res, next) => {
  try {
    const p = hoursSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const value = { timezone: 'Africa/Nairobi', slotMinutes: p.data.slotMinutes, days: p.data.days };
    await pool.query(
      "INSERT INTO clinic_settings (setting_key, setting_value) VALUES ('opening_hours', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
      [JSON.stringify(value)]
    );
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'settings_updated',
      entityType: 'settings',
      entityId: null,
      details: { key: 'opening_hours', slotMinutes: value.slotMinutes },
      ip: req.ip,
    });
    res.json(value);
  } catch (err) {
    next(err);
  }
});
