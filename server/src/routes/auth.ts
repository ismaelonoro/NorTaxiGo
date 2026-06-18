import { Router } from 'express';

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
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

export default router;
