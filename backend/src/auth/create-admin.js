import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pool } from '../db/pool.js';
import { hashPassword } from './password.js';

function askHidden(rl, question) {
  return new Promise((resolve) => {
    const original = rl._writeToOutput;
    rl._writeToOutput = function (s) {
      if (s.includes(question)) original.call(rl, s);
    };
    rl.question(question).then((answer) => {
      rl._writeToOutput = original;
      stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const [existing] = await pool.query(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'administrator' LIMIT 1"
  );
  if (existing.length > 0) {
    throw new Error('An administrator already exists. Nothing was changed.');
  }

  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
  try {
    const username = (await rl.question('Username (3-60 letters/digits/_): ')).trim();
    if (!/^[A-Za-z0-9_]{3,60}$/.test(username)) {
      throw new Error('Invalid username.');
    }
    const fullName = (await rl.question('Full name: ')).trim();
    if (fullName.length < 2 || fullName.length > 120) {
      throw new Error('Invalid full name.');
    }
    const password = await askHidden(rl, 'Password (12+ chars, hidden): ');
    const again = await askHidden(rl, 'Repeat password: ');
    if (password !== again) {
      throw new Error('Passwords do not match.');
    }

    const hash = await hashPassword(password);
    await pool.query(
      "INSERT INTO users (role_id, username, full_name, password_hash) " +
        "SELECT id, ?, ?, ? FROM roles WHERE name = 'administrator'",
      [username, fullName, hash]
    );
    console.log('Administrator created.');
  } finally {
    rl.close();
  }
}

main()
  .catch((err) => {
    console.error('create-admin failed:', err.code || err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
