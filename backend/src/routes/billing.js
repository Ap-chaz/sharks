import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const billingRouter = Router();
billingRouter.use(requireAuth, requireRole('administrator'));

const moneySchema = z
  .number()
  .min(0)
  .max(10000000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6);

const itemSchema = z.object({
  description: z.string().trim().min(2).max(255),
  quantity: z.number().int().min(1).max(1000),
  unitPrice: moneySchema,
});

const createInvoiceSchema = z.object({
  patientId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(itemSchema).min(1).max(50),
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

billingRouter.post('/invoices', async (req, res, next) => {
  try {
    const p = createInvoiceSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO invoices (patient_id, appointment_id, notes, created_by) VALUES (?, ?, ?, ?)',
        [d.patientId, d.appointmentId ?? null, d.notes ?? null, req.user.id]
      );
      const rows = d.items.map((i) => [result.insertId, i.description, i.quantity, i.unitPrice]);
      await conn.query('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ?', [rows]);
      await conn.commit();
      await audit(req, 'invoice_created', 'invoice', result.insertId, { itemCount: d.items.length });
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

billingRouter.get('/invoices', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT i.id, i.patient_id AS patientId, p.full_name AS patientName, i.status, i.created_at AS createdAt, ' +
        '(SELECT COALESCE(SUM(quantity * unit_price), 0) FROM invoice_items WHERE invoice_id = i.id) AS total, ' +
        '(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) AS paid ' +
        'FROM invoices i JOIN patients p ON p.id = i.patient_id ORDER BY i.id DESC'
    );
    res.json({ invoices: rows.map((r) => ({ ...r, total: Number(r.total), paid: Number(r.paid) })) });
  } catch (err) {
    next(err);
  }
});

billingRouter.get('/invoices/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [found] = await pool.query(
      'SELECT i.id, i.patient_id AS patientId, p.full_name AS patientName, i.appointment_id AS appointmentId, ' +
        'i.status, i.notes, i.created_at AS createdAt FROM invoices i JOIN patients p ON p.id = i.patient_id WHERE i.id = ?',
      [id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.query(
      'SELECT id, description, quantity, unit_price AS unitPrice FROM invoice_items WHERE invoice_id = ? ORDER BY id',
      [id]
    );
    const [payments] = await pool.query(
      'SELECT id, amount, method, reference, paid_at AS paidAt FROM payments WHERE invoice_id = ? ORDER BY id',
      [id]
    );
    const mItems = items.map((r) => ({ ...r, unitPrice: Number(r.unitPrice) }));
    const mPayments = payments.map((r) => ({ ...r, amount: Number(r.amount) }));
    const total = mItems.reduce((s, r) => s + r.quantity * r.unitPrice, 0);
    const paid = mPayments.reduce((s, r) => s + r.amount, 0);
    res.json({ invoice: { ...found[0], items: mItems, payments: mPayments, total, paid } });
  } catch (err) {
    next(err);
  }
});

const patchInvoiceSchema = z
  .object({
    status: z.enum(['issued', 'void']).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z.array(itemSchema).min(1).max(50).optional(),
  })
  .refine((v) => Object.keys(v).length > 0);

billingRouter.patch('/invoices/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = patchInvoiceSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const stop = async (code, msg) => {
        await conn.rollback();
        return res.status(code).json({ error: msg });
      };
      const [found] = await conn.query('SELECT status FROM invoices WHERE id = ? FOR UPDATE', [id]);
      if (found.length === 0) return await stop(404, 'Not found');
      const current = found[0].status;
      if (current === 'void') return await stop(409, 'Invoice is void');
      if (d.items && current !== 'draft') return await stop(409, 'Items are locked');
      if (d.status === 'issued' && current !== 'draft') return await stop(409, 'Invoice is already issued');
      if (d.status === 'void') {
        const [pay] = await conn.query('SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ?', [id]);
        if (pay[0].n > 0) return await stop(409, 'Invoice has payments');
      }
      const sets = ['updated_at = CURRENT_TIMESTAMP'];
      const values = [];
      if (d.notes !== undefined) {
        sets.push('notes = ?');
        values.push(d.notes);
      }
      if (d.status !== undefined) {
        sets.push('status = ?');
        values.push(d.status);
      }
      await conn.query('UPDATE invoices SET ' + sets.join(', ') + ' WHERE id = ?', [...values, id]);
      if (d.items) {
        await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
        const rows = d.items.map((i) => [id, i.description, i.quantity, i.unitPrice]);
        await conn.query('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ?', [rows]);
      }
      await conn.commit();
      await audit(req, 'invoice_updated', 'invoice', id, { fields: Object.keys(d) });
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
