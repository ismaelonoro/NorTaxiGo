export type FontCategory = 'Caligráficas' | 'Elegantes' | 'Modernas' | 'Sistema';

export interface FontDef {
  name: string;
  category: FontCategory;
}

/**
 * Fonts offered in the designer. Web fonts (Caligráficas / Elegantes / Modernas)
 * are loaded from Google Fonts in index.html. System fonts need no loading.
 * Keep this list in sync with the <link> in client/index.html.
 */
export const FONTS: FontDef[] = [
  // Script / calligraphy — the elegant Villa Laureana style
  { name: 'Great Vibes', category: 'Caligráficas' },
  { name: 'Dancing Script', category: 'Caligráficas' },
  { name: 'Parisienne', category: 'Caligráficas' },
  { name: 'Tangerine', category: 'Caligráficas' },
  { name: 'Pinyon Script', category: 'Caligráficas' },
  { name: 'Allura', category: 'Caligráficas' },
  { name: 'Sacramento', category: 'Caligráficas' },
  { name: 'Alex Brush', category: 'Caligráficas' },
  { name: 'Petit Formal Script', category: 'Caligráficas' },
  { name: 'Cookie', category: 'Caligráficas' },

  // Elegant serifs
  { name: 'Playfair Display', category: 'Elegantes' },
  { name: 'Cormorant Garamond', category: 'Elegantes' },
  { name: 'EB Garamond', category: 'Elegantes' },
  { name: 'Marcellus', category: 'Elegantes' },
  { name: 'Cinzel', category: 'Elegantes' },
  { name: 'Lora', category: 'Elegantes' },
  { name: 'Libre Baskerville', category: 'Elegantes' },

  // Modern sans
  { name: 'Montserrat', category: 'Modernas' },
  { name: 'Poppins', category: 'Modernas' },
  { name: 'Raleway', category: 'Modernas' },

  // System (no web loading needed)
  { name: 'Georgia', category: 'Sistema' },
  { name: 'Times New Roman', category: 'Sistema' },
  { name: 'Arial', category: 'Sistema' },
  { name: 'Trebuchet MS', category: 'Sistema' },
  { name: 'Verdana', category: 'Sistema' },
  { name: 'Courier New', category: 'Sistema' },
  { name: 'Impact', category: 'Sistema' },
];

export const FONT_CATEGORIES: FontCategory[] = ['Caligráficas', 'Elegantes', 'Modernas', 'Sistema'];

/** Web fonts that must be loaded before Fabric can render them on the canvas. */
export const WEB_FONTS = FONTS.filter((f) => f.category !== 'Sistema').map((f) => f.name);
