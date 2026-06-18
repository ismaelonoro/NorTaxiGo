import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
});

interface CategoryRow {
  id: string; name: string; icon: string; color: string;
  createdAt: string; updatedAt: string; templateCount: number;
}

function shape(row: CategoryRow) {
  const { templateCount, ...cat } = row;
  return { ...cat, _count: { templates: templateCount } };
}

const SELECT_ONE = `
  SELECT c.*, (SELECT COUNT(*) FROM "Template" t WHERE t."categoryId" = c.id) AS templateCount
  FROM "Category" c WHERE c.id = ?`;

router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM "Template" t WHERE t."categoryId" = c.id) AS templateCount
      FROM "Category" c ORDER BY c.name ASC
    `).all() as unknown as CategoryRow[];
    res.json(rows.map(shape));
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = CategorySchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare(`
      INSERT INTO "Category" (id, name, icon, color, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.icon ?? '🎉', data.color ?? '#6B7280', ts, ts);
    const row = db.prepare(SELECT_ONE).get(id) as unknown as CategoryRow;
    res.status(201).json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const data = CategorySchema.parse(req.body);
    const result = db.prepare(`
      UPDATE "Category" SET name = ?, icon = ?, color = ?, "updatedAt" = ? WHERE id = ?
    `).run(data.name, data.icon ?? '🎉', data.color ?? '#6B7280', nowISO(), req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    const row = db.prepare(SELECT_ONE).get(req.params.id) as unknown as CategoryRow;
    res.json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Category" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

export default router;
