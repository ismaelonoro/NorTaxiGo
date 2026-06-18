import 'dotenv/config';
import db, { newId, nowISO } from './lib/db';

// Fabric.js canvas JSON for a wedding template inspired by the Villa Laureana example:
// - White background
// - Gold title text at top
// - Subtitle in italic
// - QR placeholder label
// - Recommendations section
// - "Buen Viaje" closing
const WEDDING_TEMPLATE_DESIGN = JSON.stringify({
  version: '6.5.4',
  objects: [
    {
      type: 'rect',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      width: 794,
      height: 1123,
      fill: '#ffffff',
      selectable: false,
      evented: false,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 80,
      width: 634,
      height: 60,
      fill: '#C4973A',
      text: 'Villa Laureana',
      fontSize: 52,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      textAlign: 'center',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 160,
      width: 634,
      height: 40,
      fill: '#555555',
      text: 'Celebra sin preocupaciones. Tu regreso empieza aquí.',
      fontSize: 26,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'center',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 230,
      width: 634,
      height: 36,
      fill: '#444444',
      text: 'Cuando lo desee, solicite su transporte mediante QR',
      fontSize: 22,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'center',
      selectable: true,
    },
    {
      type: 'rect',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 100,
      top: 295,
      width: 200,
      height: 200,
      fill: '#f0f0f0',
      stroke: '#cccccc',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 100,
      top: 380,
      width: 200,
      height: 30,
      fill: '#aaaaaa',
      text: '[ Código QR ]',
      fontSize: 18,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'center',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 330,
      top: 310,
      width: 360,
      height: 60,
      fill: '#333333',
      text: 'Usuario: VillaLaureana\nContraseña: VillaLaureana',
      fontSize: 22,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'left',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 530,
      width: 634,
      height: 44,
      fill: '#C4973A',
      text: 'Recomendaciones de servicio:',
      fontSize: 34,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'left',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 595,
      width: 634,
      height: 200,
      fill: '#333333',
      text: '•  Solicite su servicio con 30 minutos de antelación.\n\n•  Indique si desea ser recogido en la puerta principal o que entremos a preguntar por usted.\n\n•  Nort Taxi estará disponible para ayudarle en todo momento.',
      fontSize: 21,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'left',
      selectable: true,
    },
    {
      type: 'textbox',
      version: '6.5.4',
      originX: 'left',
      originY: 'top',
      left: 80,
      top: 980,
      width: 634,
      height: 80,
      fill: '#C4973A',
      text: 'Buen Viaje',
      fontSize: 64,
      fontFamily: 'Georgia',
      fontStyle: 'italic',
      textAlign: 'center',
      selectable: true,
    },
  ],
  background: '#ffffff',
});

function seed() {
  console.log('🌱 Seeding database...');

  db.exec('DELETE FROM "Template"; DELETE FROM "Category"; DELETE FROM "Folder";');

  const insertCategory = db.prepare(`
    INSERT INTO "Category" (id, name, icon, color, "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertFolder = db.prepare('INSERT INTO "Folder" (id, name, "createdAt", "updatedAt") VALUES (?, ?, ?, ?)');
  const insertTemplate = db.prepare(`
    INSERT INTO "Template" (id, name, "categoryId", design, thumbnail, "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const ts = nowISO();
  const bodasId = newId();
  insertCategory.run(bodasId, 'Bodas', '💍', '#D4AF37', ts, ts);
  for (const c of [
    { name: 'Eventos corporativos', icon: '🏢', color: '#3B82F6' },
    { name: 'Cumpleaños', icon: '🎂', color: '#EC4899' },
    { name: 'Comuniones y bautizos', icon: '⛪', color: '#8B5CF6' },
    { name: 'Fiestas privadas', icon: '🎊', color: '#F97316' },
    { name: 'Otros eventos', icon: '🎉', color: '#6B7280' },
  ]) {
    insertCategory.run(newId(), c.name, c.icon, c.color, ts, ts);
  }

  for (const name of ['Bodas 2025', 'Eventos corporativos', 'Sin carpeta']) {
    insertFolder.run(newId(), name, ts, ts);
  }

  insertTemplate.run(newId(), 'Boda clásica', bodasId, WEDDING_TEMPLATE_DESIGN, null, ts, ts);

  console.log('✅ 6 categorías, 3 carpetas y 1 plantilla de ejemplo creadas');
}

seed();
