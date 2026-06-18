import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

const FolderSchema = z.object({
  name: z.string().min(1).max(200),
});

interface FolderRow {
  id: string; name: string; createdAt: string; updatedAt: string; instanceCount: number;
}

function shape(row: FolderRow) {
  const { instanceCount, ...folder } = row;
  return { ...folder, _count: { instances: instanceCount } };
}

const SELECT_ONE = `
  SELECT f.*, (SELECT COUNT(*) FROM "Instance" i WHERE i."folderId" = f.id) AS instanceCount
  FROM "Folder" f WHERE f.id = ?`;

router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, (SELECT COUNT(*) FROM "Instance" i WHERE i."folderId" = f.id) AS instanceCount
      FROM "Folder" f ORDER BY f.name ASC
    `).all() as unknown as FolderRow[];
    res.json(rows.map(shape));
  } catch {
    res.status(500).json({ error: 'Error al obtener carpetas' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = FolderSchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare('INSERT INTO "Folder" (id, name, "createdAt", "updatedAt") VALUES (?, ?, ?, ?)')
      .run(id, data.name, ts, ts);
    const row = db.prepare(SELECT_ONE).get(id) as unknown as FolderRow;
    res.status(201).json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const data = FolderSchema.parse(req.body);
    const result = db.prepare('UPDATE "Folder" SET name = ?, "updatedAt" = ? WHERE id = ?')
      .run(data.name, nowISO(), req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Carpeta no encontrada' });
    const row = db.prepare(SELECT_ONE).get(req.params.id) as unknown as FolderRow;
    res.json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar carpeta' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Folder" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar carpeta' });
  }
});

export default router;
