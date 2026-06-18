#!/usr/bin/env node
'use strict';

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
console.log('[NorTaxiGo] NODE_ENV  :', process.env.NODE_ENV);
console.log('[NorTaxiGo] PORT      :', process.env.PORT);
console.log('[NorTaxiGo] DB_URL set:', !!process.env.DATABASE_URL);

// Normalize DATABASE_URL to an absolute `file:` path so it works regardless
// of Hostinger's working directory. The schema itself is created/ensured by
// the app at startup (server/src/lib/db.ts), in-process via node:sqlite.
{
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    process.env.DATABASE_URL = 'file:' + path.join(__dirname, 'prod.db');
    console.log('[NorTaxiGo] DATABASE_URL defaulted to:', process.env.DATABASE_URL);
  } else {
    let p = raw.startsWith('file:') ? raw.slice('file:'.length) : raw;
    if (!path.isAbsolute(p)) p = path.join(__dirname, p);
    const normalized = 'file:' + p;
    if (normalized !== raw) console.log('[NorTaxiGo] DATABASE_URL normalized to:', normalized);
    process.env.DATABASE_URL = normalized;
  }
}

const serverEntry = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(serverEntry)) {
  console.error('[NorTaxiGo] FATAL: dist/index.js not found at', serverEntry);
  process.exit(1);
}

console.log('[NorTaxiGo] Starting server from:', serverEntry);
try {
  require(serverEntry);
} catch (e) {
  console.error('[NorTaxiGo] FATAL while loading server:', e.message);
  console.error(e.stack);
  process.exit(1);
}
