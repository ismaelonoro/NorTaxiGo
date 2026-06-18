import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

const TemplateSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string(),
  design: z.string(),
  thumbnail: z.string().optional(),
});

interface TemplateRow {
  id: string; name: string; categoryId: string; design: string;
  thumbnail: string | null; createdAt: string; updatedAt: string;
  cat_id: string; cat_name: string; cat_icon: string; cat_color: string;
  cat_createdAt: string; cat_updatedAt: string;
}

function shape(r: TemplateRow) {
  return {
    id: r.id, name: r.name, categoryId: r.categoryId, design: r.design,
    thumbnail: r.thumbnail, createdAt: r.createdAt, updatedAt: r.updatedAt,
    category: {
      id: r.cat_id, name: r.cat_name, icon: r.cat_icon, color: r.cat_color,
      createdAt: r.cat_createdAt, updatedAt: r.cat_updatedAt,
    },
  };
}

const SELECT_BASE = `
  SELECT t.*,
    cat.id AS cat_id, cat.name AS cat_name, cat.icon AS cat_icon, cat.color AS cat_color,
    cat."createdAt" AS cat_createdAt, cat."updatedAt" AS cat_updatedAt
  FROM "Template" t JOIN "Category" cat ON cat.id = t."categoryId"`;

router.get('/', (req, res) => {
  try {
    const { categoryId } = req.query;
    const rows = (categoryId
      ? db.prepare(`${SELECT_BASE} WHERE t."categoryId" = ? ORDER BY t."updatedAt" DESC`).all(String(categoryId))
      : db.prepare(`${SELECT_BASE} ORDER BY t."updatedAt" DESC`).all()
    ) as unknown as TemplateRow[];
    res.json(rows.map(shape));
  } catch {
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`${SELECT_BASE} WHERE t.id = ?`).get(req.params.id) as unknown as TemplateRow | undefined;
    if (!row) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(shape(row));
  } catch {
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = TemplateSchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare(`
      INSERT INTO "Template" (id, name, "categoryId", design, thumbnail, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.categoryId, data.design, data.thumbnail ?? null, ts, ts);
    const row = db.prepare(`${SELECT_BASE} WHERE t.id = ?`).get(id) as unknown as TemplateRow;
    res.status(201).json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const data = TemplateSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM "Template" WHERE id = ?').get(req.params.id) as unknown as TemplateRow | undefined;
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' });
    db.prepare(`
      UPDATE "Template" SET name = ?, "categoryId" = ?, design = ?, thumbnail = ?, "updatedAt" = ? WHERE id = ?
    `).run(
      data.name ?? existing.name,
      data.categoryId ?? existing.categoryId,
      data.design ?? existing.design,
      data.thumbnail !== undefined ? data.thumbnail : existing.thumbnail,
      nowISO(),
      req.params.id,
    );
    const row = db.prepare(`${SELECT_BASE} WHERE t.id = ?`).get(req.params.id) as unknown as TemplateRow;
    res.json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Template" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
});

export default router;
