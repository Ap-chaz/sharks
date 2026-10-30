import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { dbSsl } from './ssl.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

async function main() {
  if (!config.MIGRATE_DB_USER || !config.MIGRATE_DB_PASSWORD) {
    throw new Error('MIGRATE_DB_USER and MIGRATE_DB_PASSWORD must be set in .env');
  }

  const conn = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.MIGRATE_DB_USER,
    password: config.MIGRATE_DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true,
    ssl: dbSsl(),
  });

  try {
    await conn.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (' +
        'name VARCHAR(255) NOT NULL PRIMARY KEY, ' +
        'applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' +
        ') ENGINE=InnoDB'
    );

    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));

    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    let applied = 0;

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      console.log('Applying ' + file + ' ...');
      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      applied += 1;
    }

    console.log(applied === 0 ? 'Nothing to apply.' : 'Applied ' + applied + ' migration(s).');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.code || err.message);
  process.exit(1);
});
