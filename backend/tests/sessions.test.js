import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';
import { createSession, findSession, deleteSession } from '../src/auth/sessions.js';

let createdId = null;

afterAll(async () => {
  if (createdId) await deleteSession(createdId);
  await pool.end();
});

describe('session helper', () => {
  it('creates a session that can be found, then deletes it', async () => {
    const [users] = await pool.query('SELECT id, username FROM users ORDER BY id LIMIT 1');
    expect(users.length).toBe(1);

    createdId = await createSession(users[0].id, '127.0.0.1', 'vitest');
    expect(createdId).toMatch(/^[0-9a-f]{64}$/);

    const found = await findSession(createdId);
    expect(found).not.toBeNull();
    expect(found.username).toBe(users[0].username);
    expect(found.role).toBe('administrator');

    await deleteSession(createdId);
    expect(await findSession(createdId)).toBeNull();
    createdId = null;
  });

  it('rejects malformed session IDs without touching the database', async () => {
    expect(await findSession('not-a-valid-id')).toBeNull();
    expect(await findSession(undefined)).toBeNull();
  });
});
