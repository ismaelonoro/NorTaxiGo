#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('[NorTaxiGo] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[NorTaxiGo] UNHANDLED REJECTION:', reason);
  process.exit(1);
});

console.log('[NorTaxiGo] === STARTUP ===');
console.log('[NorTaxiGo] __dirname :', __dirname);
console.log('[NorTaxiGo] cwd       :', process.cwd());
console.log('[NorTaxiGo] NODE_ENV  :', process.env.NODE_ENV);
console.log('[NorTaxiGo] PORT      :', process.env.PORT);
console.log('[NorTaxiGo] DB_URL set:', !!process.env.DATABASE_URL);

// Default DATABASE_URL to an absolute SQLite path next to this file
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:' + path.join(__dirname, 'prod.db');
  console.log('[NorTaxiGo] DATABASE_URL defaulted to:', process.env.DATABASE_URL);
}

// Fix relative sqlite path to absolute
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:./')) {
  const rel = process.env.DATABASE_URL.replace('file:./', '');
  const abs = path.join(__dirname, rel);
  process.env.DATABASE_URL = 'file:' + abs;
  console.log('[NorTaxiGo] DATABASE_URL resolved to:', process.env.DATABASE_URL);
}

// Find the Prisma CLI JS entry point directly (avoid unreliable shell wrappers)
// In a workspace, deps are hoisted to the root node_modules
const prismaCliCandidates = [
  path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js'),
  path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js'),
];
const prismaCliJs = prismaCliCandidates.find(p => fs.existsSync(p));
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaArg = fs.existsSync(schemaPath) ? ` --schema="${schemaPath}"` : '';

console.log('[NorTaxiGo] prisma CLI :', prismaCliJs || '(not found, will use npx)');
console.log('[NorTaxiGo] schema     :', fs.existsSync(schemaPath) ? schemaPath : '(not found)');

function runPrisma(subCmd) {
  const cmd = prismaCliJs
    ? `node "${prismaCliJs}" ${subCmd}${schemaArg}`
    : `npx prisma ${subCmd}${schemaArg}`;
  console.log(`[NorTaxiGo] Running: ${cmd}`);
  execSync(cmd, { cwd: __dirname, stdio: 'inherit', env: process.env, timeout: 120000 });
}

// Generate client (needed if build didn't run prisma generate)
try {
  runPrisma('generate');
  console.log('[NorTaxiGo] prisma generate done.');
} catch (e) {
  console.error('[NorTaxiGo] prisma generate failed (may already be generated):', e.message);
}

// Push schema to database
try {
  runPrisma('db push --skip-generate');
  console.log('[NorTaxiGo] Database ready.');
} catch (e) {
  console.error('[NorTaxiGo] prisma db push failed:', e.message);
  console.error('[NorTaxiGo] Continuing — tables may already exist.');
}

const serverEntry = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(serverEntry)) {
  console.error('[NorTaxiGo] FATAL: dist/index.js not found at', serverEntry);
  process.exit(1);
}

console.log('[NorTaxiGo] Starting server from:', serverEntry);
require(serverEntry);
