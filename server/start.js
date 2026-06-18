#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

console.log('[NorTaxiGo] Starting up...');
console.log('[NorTaxiGo] NODE_ENV:', process.env.NODE_ENV);
console.log('[NorTaxiGo] PORT:', process.env.PORT);

// Run prisma db push to ensure schema is in sync before starting
console.log('[NorTaxiGo] Syncing database schema...');
try {
  execSync(
    'node ' + path.join(__dirname, 'node_modules/.bin/prisma') + ' db push --skip-generate',
    { cwd: __dirname, stdio: 'inherit', env: process.env }
  );
  console.log('[NorTaxiGo] Database ready.');
} catch (e) {
  console.error('[NorTaxiGo] Database sync warning:', e.message);
}

// Start the compiled server
require('./dist/index.js');
