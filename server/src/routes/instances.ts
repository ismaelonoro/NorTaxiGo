import { Router } from 'express';
import { z } from 'zod';
import db, { newId, nowISO } from '../lib/db';

const router = Router();

const InstanceSchema = z.object({
  name: z.string().min(1).max(200),
  folderId: z.string().nullable().optional(),
  templateId: z.string().optional(),
  design: z.string(),
  thumbnail: z.string().optional(),
});

interface InstanceRow {
  id: string; name: string; folderId: string | null; templateId: string | null;
  design: string; thumbnail: string | null; createdAt: string; updatedAt: string;
  f_id: string | null; f_name: string | null; f_createdAt: string | null; f_updatedAt: string | null;
}

function shape(r: InstanceRow) {
  return {
    id: r.id, name: r.name, folderId: r.folderId, templateId: r.templateId,
    design: r.design, thumbnail: r.thumbnail, createdAt: r.createdAt, updatedAt: r.updatedAt,
    folder: r.f_id
      ? { id: r.f_id, name: r.f_name, createdAt: r.f_createdAt, updatedAt: r.f_updatedAt }
      : null,
  };
}

const SELECT_BASE = `
  SELECT i.*,
    f.id AS f_id, f.name AS f_name, f."createdAt" AS f_createdAt, f."updatedAt" AS f_updatedAt
  FROM "Instance" i LEFT JOIN "Folder" f ON f.id = i."folderId"`;

router.get('/', (req, res) => {
  try {
    const { folderId } = req.query;
    const rows = (folderId
      ? db.prepare(`${SELECT_BASE} WHERE i."folderId" = ? ORDER BY i."updatedAt" DESC`).all(String(folderId))
      : db.prepare(`${SELECT_BASE} ORDER BY i."updatedAt" DESC`).all()
    ) as unknown as InstanceRow[];
    res.json(rows.map(shape));
  } catch {
    res.status(500).json({ error: 'Error al obtener instancias' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`${SELECT_BASE} WHERE i.id = ?`).get(req.params.id) as unknown as InstanceRow | undefined;
    if (!row) return res.status(404).json({ error: 'Instancia no encontrada' });
    res.json(shape(row));
  } catch {
    res.status(500).json({ error: 'Error al obtener instancia' });
  }
});

router.post('/', (req, res) => {
  try {
    const data = InstanceSchema.parse(req.body);
    const id = newId();
    const ts = nowISO();
    db.prepare(`
      INSERT INTO "Instance" (id, name, "folderId", "templateId", design, thumbnail, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.folderId ?? null, data.templateId ?? null, data.design, data.thumbnail ?? null, ts, ts);
    const row = db.prepare(`${SELECT_BASE} WHERE i.id = ?`).get(id) as unknown as InstanceRow;
    res.status(201).json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear instancia' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const data = InstanceSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM "Instance" WHERE id = ?').get(req.params.id) as unknown as InstanceRow | undefined;
    if (!existing) return res.status(404).json({ error: 'Instancia no encontrada' });
    db.prepare(`
      UPDATE "Instance" SET name = ?, "folderId" = ?, "templateId" = ?, design = ?, thumbnail = ?, "updatedAt" = ?
      WHERE id = ?
    `).run(
      data.name ?? existing.name,
      data.folderId !== undefined ? data.folderId : existing.folderId,
      data.templateId !== undefined ? data.templateId : existing.templateId,
      data.design ?? existing.design,
      data.thumbnail !== undefined ? data.thumbnail : existing.thumbnail,
      nowISO(),
      req.params.id,
    );
    const row = db.prepare(`${SELECT_BASE} WHERE i.id = ?`).get(req.params.id) as unknown as InstanceRow;
    res.json(shape(row));
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar instancia' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM "Instance" WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar instancia' });
  }
});

export default router;
