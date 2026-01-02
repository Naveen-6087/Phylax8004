/**
 * Setup Collection Script
 *
 * Creates the nilDB collection for medical chat storage.
 * Run this once before starting the server.
 *
 * Run with: npm run setup-collection
 */

import 'dotenv/config';
import { initNilDBClient } from '../config/nillion.js';
import { NilDBService, medicalChatSchema } from '../services/nildb.service.js';

async function setupCollection() {
  console.log('[SETUP] Medical Chat Collection Setup');
  console.log('═'.repeat(50));

  try {
    // Check if collection already exists
    const existingId = process.env.NILDB_COLLECTION_ID;
    if (existingId) {
      console.log(`[INFO] Collection already configured: ${existingId}`);
      console.log('   To create a new collection, remove NILDB_COLLECTION_ID from .env');
      return;
    }

    // Initialize nilDB client
    console.log('\n[INFO] Connecting to nilDB nodes...');
    const client = await initNilDBClient();

    // Create collection
    console.log('\n[INFO] Creating medical chat collection...');
    const service = await NilDBService.initialize(client);
    const collectionId = service.getCollectionId();

    console.log('\n[SUCCESS] Collection created successfully!');
    console.log('═'.repeat(50));
    console.log(`[INFO] Collection ID: ${collectionId}`);
    console.log('\n[NOTE] Add this to your .env file:');
    console.log(`   NILDB_COLLECTION_ID=${collectionId}`);
    console.log('═'.repeat(50));

    console.log('\n[INFO] Schema:');
    console.log(JSON.stringify(medicalChatSchema, null, 2));
  } catch (error) {
    console.error('\n[ERROR] Setup failed:', error);
    process.exit(1);
  }
}

setupCollection();
