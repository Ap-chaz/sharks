import { stdin, stdout } from 'node:process';
import { pool } from '../db/pool.js';
import { hashPassword } from './password.js';
import { askHidden } from './hidden-input.js';

function askVisible(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.once('data', (d) => {
      stdin.pause();
      resolve(String(d).trim());
    });
  });
}

async function main() {
  const username = await askVisible('Username to reset: ');
  const [rows] = await pool.query(
    'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = ? AND r.name = ? LIMIT 1',
    [username, 'administrator']
  );
  if (rows.length === 0) {
    throw new Error('No administrator with that username. Nothing was changed.');
  }

  const password = await askHidden('New password (12+ chars, hidden): ');
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters. Nothing was changed.');
  }
  const again = await askHidden('Repeat new password: ');
  if (password !== again) {
    throw new Error('Passwords do not match. Nothing was changed.');
  }

  const hash = await hashPassword(password);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].id]);
    await conn.query('DELETE FROM sessions WHERE user_id = ?', [rows[0].id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  console.log('Password updated. Existing sessions were cleared.');
}

main()
  .catch((err) => {
    console.error('reset failed:', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
