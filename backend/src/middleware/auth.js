import { findSession } from '../auth/sessions.js';
import { COOKIE_NAME } from '../routes/auth.js';

export async function requireAuth(req, res, next) {
  try {
    const session = await findSession(req.cookies?.[COOKIE_NAME]);
    if (!session) return res.status(401).json({ error: 'Not signed in' });
    req.user = {
      id: session.user_id,
      username: session.username,
      fullName: session.full_name,
      role: session.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
