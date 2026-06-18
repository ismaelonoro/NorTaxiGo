import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import FileStore from 'session-file-store';
import path from 'path';
import fs from 'fs';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import templatesRouter from './routes/templates';
import foldersRouter from './routes/folders';
import instancesRouter from './routes/instances';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || '*';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'nortaxigo-secret';

const SessionFileStore = FileStore(session);
// Store sessions on disk so all workers share them (in-memory would break with multiple workers)
const sessionsDir = path.join(__dirname, '..', 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

// Trust LiteSpeed / nginx reverse proxy so cookies and forwarded headers work correctly
app.set('trust proxy', 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  store: new SessionFileStore({ path: sessionsDir, ttl: 7 * 24 * 3600, retries: 1, logFn: () => {} }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// Auth routes — public
app.use('/api/auth', authRouter);

// Guard all other API routes
app.use('/api', (req, res, next) => {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Not authenticated' });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/instances', instancesRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  const addr = server.address();
  console.log(`🚕 NorTaxiGo server running on http://localhost:${PORT} — bound:`, JSON.stringify(addr));
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[NorTaxiGo] Port ${PORT} already in use — exiting cleanly.`);
    process.exit(0);
  }
  console.error('[NorTaxiGo] Server error:', err);
  process.exit(1);
});
