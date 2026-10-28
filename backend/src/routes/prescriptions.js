import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const prescriptionsRouter = Router();
prescriptionsRouter.use(requireAuth, requireRole('administrator', 'doctor'));

const itemSchema = z.object({
  medication: z.string().trim().min(2).max(120),
  dosage: z.string().trim().min(1).max(80),
  frequency: z.string().trim().min(1).max(80),
  duration: z.string().trim().min(1).max(80),
  instructions: z.string().trim().min(1).max(255).optional(),
});

const createSchema = z.object({
  patientId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1).max(20),
});

const patchSchema = z
  .object({
    status: z.literal('cancelled').optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(itemSchema).min(1).max(20).optional(),
  })
  .refine((v) => Object.keys(v).length > 0)
  .refine((v) => !(v.status && (v.notes !== undefined || v.items)));

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function audit(req, action, entityType, entityId, details) {
  return logAudit({
    userId: req.user.id,
    username: req.user.username,
    action,
    entityType,
    entityId,
    details,
    ip: req.ip,
  });
}

function itemRows(prescriptionId, items) {
  return items.map((i) => [
    prescriptionId,
    i.medication,
    i.dosage,
    i.frequency,
    i.duration,
    i.instructions ?? null,
  ]);
}

const ITEM_INSERT =
  'INSERT INTO prescription_items (prescription_id, medication, dosage, frequency, duration, instructions) VALUES ?';

prescriptionsRouter.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO prescriptions (patient_id, appointment_id, notes, prescribed_by) VALUES (?, ?, ?, ?)',
        [d.patientId, d.appointmentId ?? null, d.notes ?? null, req.user.id]
      );
      await conn.query(ITEM_INSERT, [itemRows(result.insertId, d.items)]);
      await conn.commit();
      await audit(req, 'prescription_created', 'prescription', result.insertId, {});
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      await conn.rollback();
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        return res.status(400).json({ error: 'Unknown patient or appointment' });
      }
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

prescriptionsRouter.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.id, r.patient_id AS patientId, p.full_name AS patientName, r.status, r.created_at AS createdAt ' +
        'FROM prescriptions r JOIN patients p ON p.id = r.patient_id ORDER BY r.id DESC'
    );
    res.json({ prescriptions: rows });
  } catch (err) {
    next(err);
  }
});

prescriptionsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [found] = await pool.query(
      'SELECT r.id, r.patient_id AS patientId, p.full_name AS patientName, r.appointment_id AS appointmentId, ' +
        'r.notes, r.status, r.prescribed_by AS prescribedBy, r.created_at AS createdAt, r.updated_at AS updatedAt ' +
        'FROM prescriptions r JOIN patients p ON p.id = r.patient_id WHERE r.id = ?',
      [id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.query(
      'SELECT id, medication, dosage, frequency, duration, instructions FROM prescription_items WHERE prescription_id = ? ORDER BY id',
      [id]
    );
    res.json({ prescription: { ...found[0], items } });
  } catch (err) {
    next(err);
  }
});

prescriptionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = patchSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const stop = async (code, msg) => {
        await conn.rollback();
        return res.status(code).json({ error: msg });
      };
      const [found] = await conn.query('SELECT status FROM prescriptions WHERE id = ? FOR UPDATE', [id]);
      if (found.length === 0) return await stop(404, 'Not found');
      if (found[0].status !== 'active') return await stop(409, 'Prescription is cancelled');
      if (d.status) {
        await conn.query("UPDATE prescriptions SET status = 'cancelled' WHERE id = ?", [id]);
      }
      if (d.notes !== undefined) {
        await conn.query('UPDATE prescriptions SET notes = ? WHERE id = ?', [d.notes, id]);
      }
      if (d.items) {
        await conn.query('DELETE FROM prescription_items WHERE prescription_id = ?', [id]);
        await conn.query(ITEM_INSERT, [itemRows(id, d.items)]);
        await conn.query('UPDATE prescriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      }
      await conn.commit();
      await audit(req, 'prescription_updated', 'prescription', id, { fields: Object.keys(d) });
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});
