import 'dotenv/config';
import prisma from './lib/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  await prisma.category.deleteMany();
  await prisma.folder.deleteMany();

  const categories = await prisma.category.createMany({
    data: [
      { name: 'Bodas', icon: '💍', color: '#D4AF37' },
      { name: 'Eventos corporativos', icon: '🏢', color: '#3B82F6' },
      { name: 'Cumpleaños', icon: '🎂', color: '#EC4899' },
      { name: 'Comuniones y bautizos', icon: '⛪', color: '#8B5CF6' },
      { name: 'Fiestas privadas', icon: '🎊', color: '#F97316' },
      { name: 'Otros eventos', icon: '🎉', color: '#6B7280' },
    ],
  });

  const folders = await prisma.folder.createMany({
    data: [
      { name: 'Bodas 2025' },
      { name: 'Eventos corporativos' },
      { name: 'Sin carpeta' },
    ],
  });

  console.log(`✅ Created ${categories.count} categories and ${folders.count} folders`);
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
