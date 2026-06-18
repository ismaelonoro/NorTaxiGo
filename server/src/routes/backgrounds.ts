import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const BackgroundSchema = z.object({
  name: z.string().min(1).max(200),
  image: z.string().min(1),
  thumbnail: z.string().min(1),
});

// List backgrounds WITHOUT the full image (only thumbnail) to keep the gallery light
router.get('/', async (_req, res) => {
  try {
    const backgrounds = await prisma.background.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, thumbnail: true, createdAt: true, updatedAt: true },
    });
    res.json(backgrounds);
  } catch {
    res.status(500).json({ error: 'Error al obtener fondos' });
  }
});

// Get a single background WITH its full-resolution image (used when applying it)
router.get('/:id', async (req, res) => {
  try {
    const background = await prisma.background.findUnique({ where: { id: req.params.id } });
    if (!background) return res.status(404).json({ error: 'Fondo no encontrado' });
    res.json(background);
  } catch {
    res.status(500).json({ error: 'Error al obtener fondo' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = BackgroundSchema.parse(req.body);
    const background = await prisma.background.create({
      data,
      select: { id: true, name: true, thumbnail: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(background);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Error al crear fondo' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.background.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Error al eliminar fondo' });
  }
});

export default router;
