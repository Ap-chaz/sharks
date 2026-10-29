import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { slotsForDate, isBookableSlot, isValidDate, nairobiToUtc, utcToNairobi } from '../appointments/slots.js';

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth, requireRole('administrator', 'doctor', 'receptionist'));

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const RECEPTIONIST_STATUSES = ['confirmed', 'cancelled'];

const createSchema = z.object({
  patientId: z.number().int().positive(),
  date: z.string(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).nullable().optional(),
});

const patchSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    doctorId: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getHours() {
  const [rows] = await pool.query("SELECT setting_value FROM clinic_settings WHERE setting_key = 'opening_hours'");
  const v = rows[0]?.setting_value;
  return typeof v === 'string' ? JSON.parse(v) : v;
}

function audit(req, action, entityId, details) {
  return logAudit({
    userId: req.user.id,
    username: req.user.username,
    action,
    entityType: 'appointment',
    entityId,
    details,
    ip: req.ip,
  });
}

function toDto(r) {
  const local = utcToNairobi(new Date(r.startsAt));
  return {
    id: r.id,
    patientId: r.patientId,
    patientCode: r.patientId ? 'P-' + (1000 + r.patientId) : null,
    patientName: r.patientName || r.requesterName || null,
    phone: r.patientPhone || r.requesterPhone || null,
    doctorId: r.doctorId,
    date: local.date,
    time: local.time,
    status: r.status,
    notes: r.notes,
  };
}

const LIST_SQL =
  'SELECT a.id, a.patient_id AS patientId, p.full_name AS patientName, p.phone AS patientPhone, a.requester_name AS requesterName, a.requester_phone AS requesterPhone, ' +
  "a.doctor_id AS doctorId, CONCAT(DATE_FORMAT(a.starts_at, '%Y-%m-%dT%H:%i:%s'), 'Z') AS startsAt, a.status, a.notes " +
  'FROM appointments a LEFT JOIN patients p ON p.id = a.patient_id';

appointmentsRouter.get('/', async (req, res, next) => {
  try {
    if (req.query.status !== undefined) {
      if (req.query.status !== 'pending') return res.status(400).json({ error: 'Invalid status' });
      const [pending] = await pool.query(LIST_SQL + " WHERE a.status = 'pending' ORDER BY a.starts_at LIMIT 500");
      await audit(req, 'appointment_list', null, { status: 'pending', count: pending.length });
      return res.json({ appointments: pending.map(toDto) });
    }
    const date = String(req.query.date || '');
    if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });
    const from = nairobiToUtc(date, '00:00');
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    const [rows] = await pool.query(LIST_SQL + ' WHERE a.starts_at >= ? AND a.starts_at < ? ORDER BY a.starts_at', [from, to]);
    await audit(req, 'appointment_list', null, { date, count: rows.length });
    res.json({ appointments: rows.map(toDto) });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.get('/slots', async (req, res, next) => {
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

appointmentsRouter.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const { patientId, date, time, notes } = p.data;
    const hours = await getHours();
    if (!isBookableSlot(date, time, hours)) return res.status(400).json({ error: 'Slot not available' });
    const [pat] = await pool.query('SELECT id FROM patients WHERE id = ? AND is_active = 1', [patientId]);
    if (!pat[0]) return res.status(400).json({ error: 'Unknown patient' });
    try {
      const [result] = await pool.query(
        "INSERT INTO appointments (patient_id, doctor_id, starts_at, status, notes, created_by) VALUES (?, 1, ?, 'confirmed', ?, ?)",
        [patientId, nairobiToUtc(date, time), notes ?? null, req.user.id]
      );
      await audit(req, 'appointment_created', result.insertId, { patientId });
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slot already taken' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    const p = patchSchema.safeParse(req.body);
    if (!id || !p.success) return res.status(400).json({ error: 'Invalid request' });
    const { status, doctorId } = p.data;
    if (req.user.role === 'receptionist') {
      if (doctorId !== undefined) return res.status(403).json({ error: 'Forbidden' });
      if (status !== undefined && !RECEPTIONIST_STATUSES.includes(status)) return res.status(403).json({ error: 'Forbidden' });
    }
    if (doctorId !== undefined && req.user.role !== 'administrator') return res.status(403).json({ error: 'Forbidden' });
    if (doctorId !== undefined) {
      const [d] = await pool.query('SELECT id FROM doctors WHERE id = ? AND is_active = 1', [doctorId]);
      if (!d[0]) return res.status(400).json({ error: 'Unknown doctor' });
    }
    const sets = [];
    const vals = [];
    if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
    if (doctorId !== undefined) { sets.push('doctor_id = ?'); vals.push(doctorId); }
    try {
      const [result] = await pool.query('UPDATE appointments SET ' + sets.join(', ') + ' WHERE id = ?', [...vals, id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slot already taken' });
      throw err;
    }
    await audit(req, 'appointment_updated', id, { fields: Object.keys(p.data), status, doctorId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
