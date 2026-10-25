import { describe, it, expect, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';

const SLOT = '2030-01-01 09:00:00';
const SLOT2 = '2030-01-01 09:30:00';

async function cleanup() {
  await pool.query("DELETE FROM appointments WHERE requester_name = 'zz_test_slot'");
}

async function book(doctorId, startsAt, status = 'pending') {
  const [r] = await pool.query(
    "INSERT INTO appointments (doctor_id, starts_at, status, requester_name) VALUES (?, ?, ?, 'zz_test_slot')",
    [doctorId, startsAt, status]
  );
  return r.insertId;
}

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('appointment slot rules', () => {
  it('blocks double-booking, allows another doctor, and allows rebooking after cancel', async () => {
    await cleanup();
    const first = await book(1, SLOT);

    await expect(book(1, SLOT)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

    await expect(book(2, SLOT)).resolves.toBeTypeOf('number');
    await expect(book(1, SLOT2)).resolves.toBeTypeOf('number');

    await pool.query("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [first]);
    await expect(book(1, SLOT)).resolves.toBeTypeOf('number');
  });
});
