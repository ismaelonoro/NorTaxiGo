import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const FolderSchema = z.object({
  name: z.string().min(1).max(200),
});

router.get('/', async (_req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { instances: true } } },
    });
    res.json(folders);
  } catch {
    res.status(500).json({ error: 'Error al obtener carpetas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = FolderSchema.parse(req.body);
    const folder = await prisma.folder.create({ data });
    res.status(201).json(folder);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = FolderSchema.parse(req.body);
    const folder = await prisma.folder.update({ where: { id: req.params.id }, data });
    res.json(folder);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar carpeta' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.folder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar carpeta' });
  }
});

export default router;
