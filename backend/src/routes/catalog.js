import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { logAudit } from '../auth/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth, requireRole('administrator'));

const nameSchema = z.string().trim().min(2).max(80);
const createDeptSchema = z.object({ name: nameSchema });
const patchDeptSchema = z
  .object({ name: nameSchema.optional(), isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0);

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

catalogRouter.get('/departments', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, is_active AS isActive FROM departments ORDER BY name');
    res.json({ departments: rows.map((r) => ({ ...r, isActive: !!r.isActive })) });
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/departments', async (req, res, next) => {
  try {
    const p = createDeptSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    try {
      const [result] = await pool.query('INSERT INTO departments (name) VALUES (?)', [p.data.name]);
      await audit(req, 'department_created', 'department', result.insertId, {});
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name already exists' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

catalogRouter.patch('/departments/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = patchDeptSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const [found] = await pool.query('SELECT id FROM departments WHERE id = ?', [id]);
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const sets = [];
    const values = [];
    if (p.data.name !== undefined) {
      sets.push('name = ?');
      values.push(p.data.name);
    }
    if (p.data.isActive !== undefined) {
      sets.push('is_active = ?');
      values.push(p.data.isActive ? 1 : 0);
    }
    try {
      await pool.query('UPDATE departments SET ' + sets.join(', ') + ' WHERE id = ?', [...values, id]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name already exists' });
      throw err;
    }
    await audit(req, 'department_updated', 'department', id, { fields: Object.keys(p.data) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const serviceName = z.string().trim().min(2).max(120);
const deptId = z.number().int().positive();
const createServiceSchema = z.object({ name: serviceName, departmentId: deptId });
const patchServiceSchema = z
  .object({ name: serviceName.optional(), departmentId: deptId.optional(), isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0);

catalogRouter.get('/services', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT s.id, s.name, s.department_id AS departmentId, d.name AS departmentName, s.is_active AS isActive ' +
        'FROM services s JOIN departments d ON d.id = s.department_id ORDER BY s.name'
    );
    res.json({ services: rows.map((r) => ({ ...r, isActive: !!r.isActive })) });
  } catch (err) {
    next(err);
  }
});

catalogRouter.post('/services', async (req, res, next) => {
  try {
    const p = createServiceSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    try {
      const [result] = await pool.query('INSERT INTO services (department_id, name) VALUES (?, ?)', [
        p.data.departmentId,
        p.data.name,
      ]);
      await audit(req, 'service_created', 'service', result.insertId, {});
      res.status(201).json({ id: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name already exists' });
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE') return res.status(400).json({ error: 'Unknown department' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

catalogRouter.patch('/services/:id', async (req, res, next) => {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const p = patchServiceSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Invalid request' });
    const [found] = await pool.query('SELECT id FROM services WHERE id = ?', [id]);
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const sets = [];
    const values = [];
    if (p.data.name !== undefined) {
      sets.push('name = ?');
      values.push(p.data.name);
    }
    if (p.data.departmentId !== undefined) {
      sets.push('department_id = ?');
      values.push(p.data.departmentId);
    }
    if (p.data.isActive !== undefined) {
      sets.push('is_active = ?');
      values.push(p.data.isActive ? 1 : 0);
    }
    try {
      await pool.query('UPDATE services SET ' + sets.join(', ') + ' WHERE id = ?', [...values, id]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name already exists' });
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE' || err.code === 'ER_WARN_DATA_OUT_OF_RANGE') return res.status(400).json({ error: 'Unknown department' });
      throw err;
    }
    await audit(req, 'service_updated', 'service', id, { fields: Object.keys(p.data) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
