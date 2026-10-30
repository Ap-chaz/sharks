import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3307),
  DB_NAME: z.string().min(1).default('sharks_clinic'),
  DB_USER: z.string().default(''),
  DB_PASSWORD: z.string().default(''),
  MIGRATE_DB_USER: z.string().default(''),
  MIGRATE_DB_PASSWORD: z.string().default(''),
  SESSION_SECRET: z.string().default(''),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  HOST: z.string().min(1).default('127.0.0.1'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  DB_SSL: z.enum(['true', 'false']).default('false'),
  DB_SSL_CA_FILE: z.string().min(1).default('db/aiven-ca.pem'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid configuration:');
  for (const issue of parsed.error.issues) {
    console.error('  - ' + issue.path.join('.') + ': ' + issue.message);
  }
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
