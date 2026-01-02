/**
 * Nillion Configuration
 *
 * Handles initialization of nilDB (SecretVaults) and nilAI clients.
 * Uses the Nillion API Key for authentication.
 */

import { Keypair } from '@nillion/nuc';
import { SecretVaultBuilderClient, Did } from '@nillion/secretvaults';

// nilDB Network Configuration (Testnet)
// See: https://docs.nillion.com/build/network-config#nildb-nodes
export const NILDB_CONFIG = {
  chain: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
  auth: 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
  dbs: [
    'https://nildb-stg-n1.nillion.network',
    'https://nildb-stg-n2.nillion.network',
    'https://nildb-stg-n3.nillion.network',
  ],
};

// nilAI Configuration
export const NILAI_CONFIG = {
  baseURL: 'https://nilai-a779.nillion.network/v1/',
  model: 'google/gemma-3-27b-it',
};

/**
 * Initialize the SecretVaults Builder Client for nilDB operations
 * This client handles encrypted data storage across multiple nilDB nodes
 */
export async function initNilDBClient(): Promise<SecretVaultBuilderClient> {
  const apiKey = process.env.NILLION_API_KEY;

  if (!apiKey) {
    throw new Error('NILLION_API_KEY environment variable is required');
  }

  // Initialize the builder client with Nillion API Key
  const builderClient = await SecretVaultBuilderClient.from({
    keypair: Keypair.from(apiKey),
    urls: {
      chain: NILDB_CONFIG.chain,
      auth: NILDB_CONFIG.auth,
      dbs: NILDB_CONFIG.dbs,
    },
    blindfold: { operation: 'store' },
  });

  // Refresh authentication token
  await builderClient.refreshRootToken();

  // Register builder profile if it doesn't exist (one-time setup)
  try {
    const builderProfile = await builderClient.readProfile();
    console.log('[SUCCESS] Using existing builder profile:', builderProfile.data._id);
  } catch {
    // Profile doesn't exist, register
    try {
      const builderDid = Keypair.from(apiKey).toDid().toString();
      await builderClient.register({
        did: Did.parse(builderDid),
        name: 'Private Medical AI Builder',
      });
      console.log('[SUCCESS] Builder profile registered:', builderDid);
    } catch (error) {
      // Ignore duplicate key errors (concurrent registration)
      if (!(error instanceof Error) || !error.message.includes('duplicate key')) {
        throw error;
      }
    }
  }

  return builderClient;
}

/**
 * Get the DID (Decentralized Identifier) from the Nillion API Key
 * Used for ERC-8004 agent registration
 */
export function getBuilderDID(): string {
  const apiKey = process.env.NILLION_API_KEY;
  if (!apiKey) {
    throw new Error('NILLION_API_KEY environment variable is required');
  }
  return Keypair.from(apiKey).toDid().toString();
}
