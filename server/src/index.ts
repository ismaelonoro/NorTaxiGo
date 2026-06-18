import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { requireAuth } from './lib/auth';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import templatesRouter from './routes/templates';
import foldersRouter from './routes/folders';
import instancesRouter from './routes/instances';
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
