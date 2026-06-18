import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import categoriesRouter from './routes/categories';
import templatesRouter from './routes/templates';
import foldersRouter from './routes/folders';
import instancesRouter from './routes/instances';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/categories', categoriesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/instances', instancesRouter);
app.use('/api/ai', aiRouter);

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🚕 NorTaxiGo server running on http://localhost:${PORT}`);
});
