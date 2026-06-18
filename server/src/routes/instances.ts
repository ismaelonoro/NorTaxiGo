import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const InstanceSchema = z.object({
  name: z.string().min(1).max(200),
  folderId: z.string().nullable().optional(),
  templateId: z.string().optional(),
  design: z.string(),
  thumbnail: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { folderId } = req.query;
    const instances = await prisma.instance.findMany({
      where: folderId ? { folderId: String(folderId) } : undefined,
      include: { folder: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(instances);
  } catch {
    res.status(500).json({ error: 'Error al obtener instancias' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const instance = await prisma.instance.findUnique({
      where: { id: req.params.id },
      include: { folder: true },
    });
    if (!instance) return res.status(404).json({ error: 'Instancia no encontrada' });
    res.json(instance);
  } catch {
    res.status(500).json({ error: 'Error al obtener instancia' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = InstanceSchema.parse(req.body);
    const instance = await prisma.instance.create({
      data,
      include: { folder: true },
    });
    res.status(201).json(instance);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear instancia' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = InstanceSchema.partial().parse(req.body);
    const instance = await prisma.instance.update({
      where: { id: req.params.id },
      data,
      include: { folder: true },
    });
    res.json(instance);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar instancia' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.instance.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar instancia' });
  }
});

export default router;
