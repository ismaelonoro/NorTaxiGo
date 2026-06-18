import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import prisma from './lib/prisma';
import { requireAuth } from './lib/auth';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import templatesRouter from './routes/templates';
import foldersRouter from './routes/folders';
import instancesRouter from './routes/instances';
import backgroundsRouter from './routes/backgrounds';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Trust LiteSpeed / nginx reverse proxy so secure cookies work correctly
app.set('trust proxy', 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth routes — public
app.use('/api/auth', authRouter);

// Guard all other API routes with a stateless signed-cookie check
app.use('/api', requireAuth);

app.use('/api/categories', categoriesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/instances', instancesRouter);
app.use('/api/backgrounds', backgroundsRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public DB diagnostic: compares Prisma (with timeout) vs node:sqlite so we
// can tell whether Prisma queries hang in this environment. Remove later.
app.get('/diag-db', async (_req, res) => {
  const result: Record<string, unknown> = {};

  // 1) Prisma query with a 6s timeout (a hang shows up as "timeout")
  try {
    const query = prisma.category.count();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT after 6s')), 6000));
    result.prismaCategoryCount = await Promise.race([query, timeout]);
  } catch (e) {
    result.prismaError = (e as Error).message;
  }

  // 2) node:sqlite direct query (in-process, no spawned engine)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = (process.env.DATABASE_URL || '').replace(/^file:/, '');
    const db = new DatabaseSync(dbPath);
    const row = db.prepare('SELECT COUNT(*) AS c FROM "Category"').get() as { c: number };
    db.close();
    result.sqliteCategoryCount = row.c;
    result.dbPath = dbPath;
  } catch (e) {
    result.sqliteError = (e as Error).message;
  }

  res.json(result);
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

console.log('[NorTaxiGo] index.ts: app configured, calling listen on port', PORT, '...');

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
