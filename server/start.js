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
console.log('[NorTaxiGo] BUILD MARKER : 2026-06-18-diag-1');
console.log('[NorTaxiGo] __dirname :', __dirname);
console.log('[NorTaxiGo] cwd       :', process.cwd());
console.log('[NorTaxiGo] NODE_ENV  :', process.env.NODE_ENV);
console.log('[NorTaxiGo] PORT      :', process.env.PORT);
console.log('[NorTaxiGo] DB_URL set:', !!process.env.DATABASE_URL);
// Log all env keys so we can spot port-related vars Hostinger might inject
console.log('[NorTaxiGo] env keys  :', Object.keys(process.env).sort().join(', '));

// Normalize DATABASE_URL so Prisma always gets a valid absolute `file:` URL.
// Prisma REQUIRES the `file:` prefix; node:sqlite tolerates a bare path, which
// is why a misconfigured URL can create tables yet crash Prisma on startup.
{
  let raw = process.env.DATABASE_URL;
  if (!raw) {
    // No env var: default next to this file
    process.env.DATABASE_URL = 'file:' + path.join(__dirname, 'prod.db');
    console.log('[NorTaxiGo] DATABASE_URL defaulted to:', process.env.DATABASE_URL);
  } else {
    // Strip an optional file: prefix, resolve to absolute, then re-add file:
    let p = raw.startsWith('file:') ? raw.slice('file:'.length) : raw;
    if (!path.isAbsolute(p)) p = path.join(__dirname, p);
    const normalized = 'file:' + p;
    if (normalized !== raw) {
      console.log('[NorTaxiGo] DATABASE_URL normalized to:', normalized);
    }
    process.env.DATABASE_URL = normalized;
  }
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
  // Capture output so we can see WHY it fails (stdio:'inherit' was swallowing it)
  execSync(cmd, { cwd: __dirname, encoding: 'utf8', env: process.env, timeout: 120000 });
}

// Push schema to database (prisma generate runs during build, not here)
let dbPushOk = false;
try {
  runPrisma('db push --skip-generate');
  console.log('[NorTaxiGo] Database ready via prisma db push.');
  dbPushOk = true;
} catch (e) {
  console.error('[NorTaxiGo] prisma db push failed.');
  console.error('[NorTaxiGo]   message:', e.message);
  console.error('[NorTaxiGo]   code   :', e.code, '| status:', e.status, '| signal:', e.signal);
  if (e.stdout) console.error('[NorTaxiGo]   stdout :', String(e.stdout).slice(0, 1000));
  if (e.stderr) console.error('[NorTaxiGo]   stderr :', String(e.stderr).slice(0, 1000));
}

// Fallback: create tables directly using node:sqlite (Node 22+)
if (!dbPushOk) {
  console.log('[NorTaxiGo] Attempting table creation via node:sqlite fallback...');
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbFilePath = process.env.DATABASE_URL.replace(/^file:/, '');
    const db = new DatabaseSync(dbFilePath);
    db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;

      CREATE TABLE IF NOT EXISTS "Category" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "icon"      TEXT NOT NULL DEFAULT '🎉',
        "color"     TEXT NOT NULL DEFAULT '#6B7280',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Template" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "name"       TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        "design"     TEXT NOT NULL DEFAULT '{}',
        "thumbnail"  TEXT,
        "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Template_categoryId_fkey"
          FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "Background" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "image"     TEXT NOT NULL,
        "thumbnail" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Folder" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "name"      TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Instance" (
        "id"         TEXT NOT NULL PRIMARY KEY,
        "name"       TEXT NOT NULL,
        "folderId"   TEXT,
        "templateId" TEXT,
        "design"     TEXT NOT NULL DEFAULT '{}',
        "thumbnail"  TEXT,
        "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Instance_folderId_fkey"
          FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Instance_templateId_fkey"
          FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    db.close();
    console.log('[NorTaxiGo] Tables ensured via node:sqlite.');
  } catch (e2) {
    console.error('[NorTaxiGo] node:sqlite fallback failed:', e2.message);
    console.error('[NorTaxiGo] Continuing — tables may already exist or DB will fail at query time.');
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
  // A synchronous failure while loading the server (e.g. Prisma client init)
  // would otherwise die silently here — surface it explicitly.
  console.error('[NorTaxiGo] FATAL while loading server:', e.message);
  console.error(e.stack);
  process.exit(1);
}
