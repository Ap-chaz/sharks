import argon2 from 'argon2';

export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash, plain) {
  if (typeof hash !== 'string' || typeof plain !== 'string') return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
