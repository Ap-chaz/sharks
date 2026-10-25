import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('password helper', () => {
  it('accepts the correct password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(await verifyPassword(hash, 'correct-horse-battery')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(await verifyPassword(hash, 'wrong-password-here')).toBe(false);
  });

  it('produces a different hash each time', async () => {
    const a = await hashPassword('correct-horse-battery');
    const b = await hashPassword('correct-horse-battery');
    expect(a).not.toBe(b);
  });

  it('refuses short passwords', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
  });

  it('returns false for a broken hash', async () => {
    expect(await verifyPassword('not-a-hash', 'anything-long-enough')).toBe(false);
  });
});
