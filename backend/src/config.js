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
  SESSION_SECRET: z.string().default(''),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
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
