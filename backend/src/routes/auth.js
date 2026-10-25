import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { verifyPassword } from '../auth/password.js';
import { createSession, findSession, deleteSession, SESSION_HOURS } from '../auth/sessions.js';
import { isLockedOut, recordAttempt } from '../auth/attempts.js';
import { config } from '../config.js';

export const COOKIE_NAME = 'sharks_sid';

const loginSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(200),
});

// Valid argon2id hash of a random string. Used so unknown usernames cost the same time as known ones.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$0000000000000000000000000000000000000000000';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.NODE_ENV === 'production',
  maxAge: SESSION_HOURS * 3600 * 1000,
  path: '/',
};

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
    const { username, password } = parsed.data;
    const ip = req.ip;

    if (await isLockedOut(username, ip)) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    const [rows] = await pool.query(
      'SELECT id, password_hash, is_active FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    const user = rows[0];
    const ok = await verifyPassword(user ? user.password_hash : DUMMY_HASH, password);

    if (!user || !user.is_active || !ok) {
      await recordAttempt(username, ip, false);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await recordAttempt(username, ip, true);
    const sid = await createSession(user.id, ip, req.get('user-agent'));
    await pool.query('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
    res.cookie(COOKIE_NAME, sid, cookieOptions);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const session = await findSession(req.cookies?.[COOKIE_NAME]);
    if (!session) return res.status(401).json({ error: 'Not signed in' });
    res.json({
      user: { id: session.user_id, username: session.username, fullName: session.full_name, role: session.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await deleteSession(req.cookies?.[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
