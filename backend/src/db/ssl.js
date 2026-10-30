import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function dbSsl() {
  if (config.DB_SSL !== 'true') return undefined;
  return {
    ca: fs.readFileSync(path.resolve(backendDir, config.DB_SSL_CA_FILE), 'utf8'),
    rejectUnauthorized: true,
  };
}
