import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

/**
 * Data layer backed by node:sqlite.
 *
 * Why not Prisma: Hostinger's environment refuses to let the Prisma query
 * engine (Rust/tokio) spawn worker threads ("OS can't spawn worker thread,
 * os error 11"), so Prisma queries fail intermittently. node:sqlite runs
 * in-process on the main thread — no threads, no spawned engines — so it
 * works reliably here.
 */

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL || '';
  let p = url.startsWith('file:') ? url.slice('file:'.length) : url;
  if (!p) p = path.join(__dirname, '..', '..', 'prod.db');
  return p;
}

const db = new DatabaseSync(resolveDbPath());

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Schema — idempotent. Mirrors prisma/schema.prisma (kept only as documentation).
db.exec(`
  CREATE TABLE IF NOT EXISTS "Category" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "icon"      TEXT NOT NULL DEFAULT '🎉',
    "color"     TEXT NOT NULL DEFAULT '#6B7280',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "Template" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "name"       TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "design"     TEXT NOT NULL DEFAULT '{}',
    "thumbnail"  TEXT,
    "createdAt"  TEXT NOT NULL,
    "updatedAt"  TEXT NOT NULL,
    CONSTRAINT "Template_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Background" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "image"     TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "Folder" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "Instance" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "name"       TEXT NOT NULL,
    "folderId"   TEXT,
    "templateId" TEXT,
    "design"     TEXT NOT NULL DEFAULT '{}',
    "thumbnail"  TEXT,
    "createdAt"  TEXT NOT NULL,
    "updatedAt"  TEXT NOT NULL,
    CONSTRAINT "Instance_folderId_fkey"
      FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Instance_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

export function newId(): string {
  return randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export default db;
