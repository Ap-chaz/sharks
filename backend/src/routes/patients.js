import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(requireAuth, requireRole('administrator', 'doctor', 'receptionist'));

const CONTACT_FIELDS = ['phone', 'email', 'address'];

const fields = {
  fullName: z.string().trim().min(2).max(120),
  dateOfBirth: z.iso.date().nullable(),
  gender: z.enum(['female', 'male', 'other']).nullable(),
  phone: z.string().trim().min(5).max(30),
  email: z.email().max(190).nullable(),
  address: z.string().trim().max(255).nullable(),
};

const createSchema = z.object({
  fullName: fields.fullName,
  phone: fields.phone,
  dateOfBirth: fields.dateOfBirth.optional(),
  gender: fields.gender.optional(),
  email: fields.email.optional(),
  address: fields.address.optional(),
});

const patchSchema = z
  .object({
    fullName: fields.fullName.optional(),
    phone: fields.phone.optional(),
    dateOfBirth: fields.dateOfBirth.optional(),
    gender: fields.gender.optional(),
    email: fields.email.optional(),
    address: fields.address.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

const COLUMNS = {
  fullName: 'full_name',
  dateOfBirth: 'date_of_birth',
  gender: 'gender',
  phone: 'phone',
  email: 'email',
  address: 'address',
  isActive: 'is_active',
};

const SELECT =
  "SELECT id, full_name AS fullName, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS dateOfBirth, gender, phone, email, address, is_active AS isActive FROM patients";

function toDto(r) {
  return { ...r, code: 'P-' + (1000 + r.id), isActive: !!r.isActive };
}

function parseId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function audit(req, action, entityId, details) {
  return logAudit({
    userId: req.user.id,
    username: req.user.username,
    action,
    entityType: 'patient',
    entityId,
    details,
    ip: req.ip,
  });
}

patientsRouter.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const all = req.query.includeInactive === '1' && req.user.role !== 'receptionist';
    const where = [];
    const vals = [];
    if (!all) where.push('is_active = 1');
    if (q) {
      where.push('(full_name LIKE ? OR phone LIKE ?)');
      vals.push('%' + q + '%', '%' + q + '%');
    }
    const [rows] = await pool.query(
      SELECT + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY full_name LIMIT 1000',
      vals
    );
    await audit(req, 'patient_list', null, { count: rows.length });
    res.json({ patients: rows.map(toDto) });
  } catch (err) {
    next(err);
  }
});

patientsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid request' });
    const [rows] = await pool.query(SELECT + ' WHERE id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await audit(req, 'patient_view', id, null);
    res.json({ patient: toDto(rows[0]) });
  } catch (err) {
    next(err);
  }
});

patientsRouter.post('/', async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const d = p.data;
    const [result] = await pool.query(
      'INSERT INTO patients (full_name, date_of_birth, gender, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [d.fullName, d.dateOfBirth ?? null, d.gender ?? null, d.phone, d.email ?? null, d.address ?? null]
    );
    await audit(req, 'patient_created', result.insertId, null);
    res.status(201).json({ id: result.insertId, code: 'P-' + (1000 + result.insertId) });
  } catch (err) {
    next(err);
  }
});

patientsRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    const p = patchSchema.safeParse(req.body);
    if (!id || !p.success) return res.status(400).json({ error: 'Invalid request' });
    const keys = Object.keys(p.data);
    if (req.user.role === 'receptionist' && keys.some((k) => !CONTACT_FIELDS.includes(k))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sets = keys.map((k) => COLUMNS[k] + ' = ?');
    const vals = keys.map((k) => (k === 'isActive' ? (p.data[k] ? 1 : 0) : p.data[k]));
    const [result] = await pool.query('UPDATE patients SET ' + sets.join(', ') + ' WHERE id = ?', [...vals, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    await audit(req, 'patient_updated', id, { fields: keys });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
