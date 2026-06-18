import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

const BackgroundSchema = z.object({
  name: z.string().min(1).max(200),
  image: z.string().min(1),
  thumbnail: z.string().min(1),
});

// List WITHOUT the full image (only thumbnail) to keep the gallery light
router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, thumbnail, "createdAt", "updatedAt"
      FROM "Background" ORDER BY "createdAt" DESC
    `).all();
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener fondos' });
  }
});

// Single background WITH its full-resolution image (used when applying it)
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM "Background" WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Fondo no encontrado' });
    res.json(row);
  } catch {
    res.status(500).json({ error: 'Error al obtener fondo' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = BackgroundSchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare(`
      INSERT INTO "Background" (id, name, image, thumbnail, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.image, data.thumbnail, ts, ts);
    // Return without the heavy image, matching the list shape
    res.status(201).json({ id, name: data.name, thumbnail: data.thumbnail, createdAt: ts, updatedAt: ts });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear fondo' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Background" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar fondo' });
  }
});

export default router;
