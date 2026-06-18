import { PrismaClient } from '@prisma/client';

console.log('[NorTaxiGo] lib/prisma: creating PrismaClient...');
let prisma: PrismaClient;
try {
  prisma = new PrismaClient();
  console.log('[NorTaxiGo] lib/prisma: PrismaClient created OK');
} catch (e) {
  console.error('[NorTaxiGo] lib/prisma: PrismaClient FAILED:', (e as Error).message);
  throw e;
}

export default prisma;
