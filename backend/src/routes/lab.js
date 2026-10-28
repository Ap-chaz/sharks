import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const labRouter = Router();
labRouter.use(requireAuth);

const createRequestSchema = z.object({
  patientId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  testName: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(500).optional(),
});

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

labRouter.post('/requests', requireRole('administrator', 'doctor'), async (req, res, next) => {
  try {
    const p = createRequestSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    try {
      const [result] = await pool.query(
        'INSERT INTO lab_requests (patient_id, appointment_id, test_name, notes, requested_by) VALUES (?, ?, ?, ?, ?)',
        [d.patientId, d.appointmentId ?? null, d.testName, d.notes ?? null, req.user.id]
      );
      await audit(req, 'lab_request_created', 'lab_request', result.insertId, {});
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        return res.status(400).json({ error: 'Unknown patient or appointment' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

labRouter.get('/requests', requireRole('administrator', 'doctor', 'receptionist', 'lab_technician'), async (req, res, next) => {
  try {
    const queueOnly = req.user.role === 'lab_technician';
    const [rows] = await pool.query(
      'SELECT r.id, r.patient_id AS patientId, p.full_name AS patientName, r.test_name AS testName, r.status, r.created_at AS createdAt ' +
        'FROM lab_requests r JOIN patients p ON p.id = r.patient_id ' +
        (queueOnly ? "WHERE r.status IN ('requested','in_progress') " : '') +
        'ORDER BY r.id DESC'
    );
    res.json({ requests: rows });
  } catch (err) {
    next(err);
  }
});

labRouter.get('/requests/:id', requireRole('administrator', 'doctor'), async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [found] = await pool.query(
      'SELECT r.id, r.patient_id AS patientId, p.full_name AS patientName, r.appointment_id AS appointmentId, ' +
        'r.test_name AS testName, r.notes, r.status, r.created_at AS createdAt ' +
        'FROM lab_requests r JOIN patients p ON p.id = r.patient_id WHERE r.id = ?',
      [id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const [results] = await pool.query(
      'SELECT result_text AS resultText, unit, reference_range AS referenceRange, entered_at AS enteredAt FROM lab_results WHERE request_id = ?',
      [id]
    );
    res.json({ request: { ...found[0], result: results[0] ?? null } });
  } catch (err) {
    next(err);
  }
});
