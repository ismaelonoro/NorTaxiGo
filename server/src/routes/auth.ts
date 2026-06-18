import { Router } from 'express';
import { AUTH_COOKIE, authToken, cookieOptions, isAuthenticated } from '../lib/auth';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validPass) {
    res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
    return;
  }

  if (username === validUser && password === validPass) {
    res.cookie(AUTH_COOKIE, authToken(), cookieOptions());
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

export default router;
