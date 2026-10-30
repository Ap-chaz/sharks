import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();

afterAll(async () => {
  await pool.end();
});

describe('public opening hours', () => {
  it('is readable without signing in and exposes only hours', async () => {
    const res = await request(app).get('/api/public/opening-hours');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['days', 'slotMinutes', 'timezone']);
    expect(res.body.timezone).toBe('Africa/Nairobi');
    expect([15, 30, 45, 60]).toContain(res.body.slotMinutes);
    expect(Object.keys(res.body.days).sort()).toEqual(['fri', 'mon', 'sat', 'sun', 'thu', 'tue', 'wed']);
  });
});
