#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Catch any unhandled crash and log it before dying
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

// Default DATABASE_URL if not provided (SQLite next to this file)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:' + path.join(__dirname, 'prod.db');
  console.log('[NorTaxiGo] DATABASE_URL defaulted to:', process.env.DATABASE_URL);
}

// Fix relative SQLite path to absolute so it works regardless of cwd
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:./')) {
  const rel = process.env.DATABASE_URL.replace('file:./', '');
  const abs = path.join(__dirname, rel);
  process.env.DATABASE_URL = 'file:' + abs;
  console.log('[NorTaxiGo] DATABASE_URL resolved to:', process.env.DATABASE_URL);
}

// Find prisma binary: check server/node_modules, then workspace root node_modules, then npx
const candidateBins = [
  path.join(__dirname, 'node_modules', '.bin', 'prisma'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'prisma'),
];
const foundBin = candidateBins.find(b => fs.existsSync(b));
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaArg = fs.existsSync(schemaPath) ? ` --schema="${schemaPath}"` : '';
const prismaCmd = (foundBin ? `"${foundBin}"` : 'npx prisma') + ` db push --skip-generate` + schemaArg;

console.log('[NorTaxiGo] prisma bin :', foundBin || '(npx fallback)');
console.log('[NorTaxiGo] schema     :', fs.existsSync(schemaPath) ? schemaPath : '(not found)');
console.log('[NorTaxiGo] Running prisma db push...');
try {
  execSync(prismaCmd, {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
    timeout: 90000,
  });
  console.log('[NorTaxiGo] Database ready.');
} catch (e) {
  console.error('[NorTaxiGo] prisma db push failed:', e.message);
  console.error('[NorTaxiGo] Continuing anyway — tables may already exist.');
}

// Verify dist/index.js exists before requiring
const serverEntry = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(serverEntry)) {
  console.error('[NorTaxiGo] FATAL: dist/index.js not found at', serverEntry);
  process.exit(1);
}

console.log('[NorTaxiGo] Starting server from:', serverEntry);
require(serverEntry);
