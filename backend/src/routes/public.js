import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { slotsForDate, isBookableSlot, isValidDate, nairobiToUtc, utcToNairobi } from '../appointments/slots.js';

export const publicRouter = Router();

const MAX_PER_HOUR = 5;

const bookSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  date: z.string(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).nullable().optional(),
  website: z.string().max(200).optional(),
});

async function getHours() {
  const [rows] = await pool.query("SELECT setting_value FROM clinic_settings WHERE setting_key = 'opening_hours'");
  const v = rows[0]?.setting_value;
  return typeof v === 'string' ? JSON.parse(v) : v;
}

publicRouter.get('/slots', async (req, res, next) => {
  try {
    const date = String(req.query.date || '');
    if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });
    const hours = await getHours();
    const all = slotsForDate(date, hours);
    const from = nairobiToUtc(date, '00:00');
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    const [taken] = await pool.query(
      'SELECT starts_at AS startsAt FROM appointments WHERE doctor_id = 1 AND active_slot IS NOT NULL AND starts_at >= ? AND starts_at < ?',
      [from, to]
    );
    const busy = new Set(taken.map((t) => utcToNairobi(new Date(t.startsAt)).time));
    const now = new Date();
    res.json({ slots: all.filter((s) => !busy.has(s) && isBookableSlot(date, s, hours, now)) });
  } catch (err) {
    next(err);
  }
});

publicRouter.post('/appointments', async (req, res, next) => {
  try {
    const p = bookSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const { name, phone, date, time, notes, website } = p.data;

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

    const hours = await getHours();
    if (!isBookableSlot(date, time, hours)) return res.status(400).json({ error: 'Slot not available' });

    try {
      const [result] = await pool.query(
        "INSERT INTO appointments (doctor_id, starts_at, status, requester_name, requester_phone, notes) VALUES (1, ?, 'pending', ?, ?, ?)",
        [nairobiToUtc(date, time), name, phone, notes ?? null]
      );
      await logAudit({ username: 'public', action: 'public_booking', entityType: 'appointment', entityId: result.insertId, ip });
      res.status(201).json({ ok: true });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slot already taken' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});
