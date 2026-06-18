import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';

const router = Router();

const GenerateSchema = z.object({
  prompt: z.string().min(1).max(500),
  style: z.string().optional(),
});

router.post('/generate-background', async (req, res) => {
  try {
    const { prompt, style } = GenerateSchema.parse(req.body);

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'API de IA no configurada' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const fullPrompt = [
      `Elegant background illustration for an A4 event card.`,
      `Style: ${style || 'watercolor botanical, soft colors, luxury feel'}.`,
      `Theme: ${prompt}.`,
      `No text, no QR codes, no people. Soft pastel tones, white space in center for content.`,
      `High quality, print-ready, portrait orientation.`,
    ].join(' ');

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1792',
      quality: 'hd',
      response_format: 'b64_json',
    });

    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) return res.status(500).json({ error: 'No se pudo generar la imagen' });

    res.json({ image: `data:image/png;base64,${imageData}` });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error('AI error:', e);
    res.status(500).json({ error: 'Error al generar fondo' });
  }
});

export default router;
