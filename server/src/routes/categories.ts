import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
});

router.get('/', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { templates: true } } },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = CategorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = CategorySchema.parse(req.body);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    res.json(category);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

export default router;
