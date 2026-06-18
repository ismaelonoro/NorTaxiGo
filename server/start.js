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
let dbPushOk = false;
try {
  runPrisma('db push --skip-generate');
  console.log('[NorTaxiGo] Database ready via prisma db push.');
  dbPushOk = true;
} catch (e) {
  console.error('[NorTaxiGo] prisma db push failed:', e.message);
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
require(serverEntry);
