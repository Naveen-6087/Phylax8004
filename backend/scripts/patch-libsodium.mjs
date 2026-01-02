/**
 * Patch libsodium-wrappers-sumo ESM module
 * 
 * This script patches the ESM wrapper to correctly load the CJS module
 * since the ESM version of libsodium-wrappers-sumo is incomplete.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const esmWrapperFile = join(__dirname, '..', 'node_modules', 'libsodium-wrappers-sumo', 'dist', 'modules-sumo-esm', 'libsodium-wrappers.mjs');
const backupFile = esmWrapperFile + '.bak';

// Check if already patched
if (existsSync(backupFile)) {
  console.log('✓ libsodium already patched, skipping');
  process.exit(0);
}

if (!existsSync(esmWrapperFile)) {
  console.log('⚠ ESM wrapper not found, libsodium may not be installed');
  process.exit(0);
}

// Create a proper ESM wrapper that uses CJS
const newWrapper = `
// Patched ESM wrapper for libsodium-wrappers-sumo
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load the CJS version which has all the WASM files bundled
const sodium = require('../modules-sumo/libsodium-wrappers.js');

// Re-export everything
export default sodium;
export const ready = sodium.ready;
`;

try {
  // Backup original
  const original = readFileSync(esmWrapperFile, 'utf8');
  writeFileSync(backupFile, original);
  
  // Write patched version
  writeFileSync(esmWrapperFile, newWrapper.trim());
  console.log('✓ Patched libsodium-wrappers.mjs to use CJS module');
} catch (error) {
  console.error('Failed to patch libsodium:', error.message);
  process.exit(1);
}

