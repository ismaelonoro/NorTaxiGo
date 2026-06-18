import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const TemplateSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string(),
  design: z.string(),
  thumbnail: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const templates = await prisma.template.findMany({
      where: categoryId ? { categoryId: String(categoryId) } : undefined,
      include: { category: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(template);
  } catch {
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = TemplateSchema.parse(req.body);
    const template = await prisma.template.create({
      data,
      include: { category: true },
    });
    res.status(201).json(template);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = TemplateSchema.partial().parse(req.body);
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(template);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
});

export default router;
