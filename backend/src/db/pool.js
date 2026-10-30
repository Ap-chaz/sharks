import mysql from 'mysql2/promise';
import { config } from '../config.js';
import { dbSsl } from './ssl.js';

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  ssl: dbSsl(),
});

export async function checkDb() {
  await pool.query('SELECT 1');
  return true;
}
