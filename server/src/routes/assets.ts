import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

// Reusable image library (logos, decorations…), same shape as backgrounds.
const AssetSchema = z.object({
  name: z.string().min(1).max(200),
  image: z.string().min(1),
  thumbnail: z.string().min(1),
});

// List WITHOUT the full image (only thumbnail) to keep the gallery light
router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, thumbnail, "createdAt", "updatedAt"
      FROM "Asset" ORDER BY "createdAt" DESC
    `).all();
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

// Single asset WITH its full-resolution image (used when inserting it)
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM "Asset" WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Imagen no encontrada' });
    res.json(row);
  } catch {
    res.status(500).json({ error: 'Error al obtener imagen' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = AssetSchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare(`
      INSERT INTO "Asset" (id, name, image, thumbnail, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.image, data.thumbnail, ts, ts);
    res.status(201).json({ id, name: data.name, thumbnail: data.thumbnail, createdAt: ts, updatedAt: ts });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear imagen' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Asset" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

export default router;
