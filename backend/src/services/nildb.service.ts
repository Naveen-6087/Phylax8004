/**
 * nilDB Service - Medical Chat Storage
 *
 * Handles encrypted storage of medical chat conversations using
 * Nillion's SecretVaults SDK. All sensitive medical data is encrypted
 * before being distributed across multiple nilDB nodes.
 */

import { SecretVaultBuilderClient } from '@nillion/secretvaults';
import { randomUUID } from 'node:crypto';

/**
 * Medical Chat Collection Schema
 *
 * Defines the structure for storing encrypted chat conversations.
 * Fields marked with %share will be encrypted and distributed across nodes.
 */
export const medicalChatSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Unique record identifier',
      },
      session_id: {
        type: 'string',
        description: 'Chat session identifier',
      },
      user_wallet: {
        type: 'string',
        description: 'User wallet address (for history lookup)',
      },
      user_prompt: {
        type: 'object',
        properties: {
          '%share': {
            type: 'string',
          },
        },
        required: ['%share'],
        description: 'Encrypted user medical question',
      },
      agent_response: {
        type: 'object',
        properties: {
          '%share': {
            type: 'string',
          },
        },
        required: ['%share'],
        description: 'Encrypted AI medical response',
      },
      payment_tx_hash: {
        type: 'string',
        description: 'Payment transaction hash (plaintext for verification)',
      },
      timestamp: {
        type: 'string',
        description: 'ISO timestamp of the conversation',
      },
    },
    required: ['_id', 'session_id', 'user_prompt', 'timestamp'],
  },
};

export class NilDBService {
  private client: SecretVaultBuilderClient;
  private collectionId: string;

  constructor(client: SecretVaultBuilderClient, collectionId: string) {
    this.client = client;
    this.collectionId = collectionId;
  }

  /**
   * Initialize the service with an existing collection or create a new one
   */
  static async initialize(
    client: SecretVaultBuilderClient,
    existingCollectionId?: string
  ): Promise<NilDBService> {
    if (existingCollectionId) {
      console.log('[INFO] Using existing collection:', existingCollectionId);
      return new NilDBService(client, existingCollectionId);
    }

    // Create new collection
    const collectionId = await NilDBService.createCollection(client);
    return new NilDBService(client, collectionId);
  }

  /**
   * Create a new medical chat collection
   */
  private static async createCollection(
    client: SecretVaultBuilderClient
  ): Promise<string> {
    const collectionId = randomUUID();

    await client.createCollection({
      _id: collectionId,
      type: 'standard',
      name: 'Medical Chat History',
      schema: medicalChatSchema,
    });

    console.log('[SUCCESS] Created nilDB collection:', collectionId);
    return collectionId;
  }

  /**
   * Store an encrypted chat prompt
   * @returns The record ID for later update with response
   */
  async storePrompt(
    sessionId: string,
    prompt: string,
    paymentTxHash?: string,
    userWallet?: string
  ): Promise<string> {
    const recordId = randomUUID();

    console.log('[ENCRYPT] Encrypting and storing prompt...');
    console.log('   [INFO] Session:', sessionId);
    console.log('   [INFO] Prompt length:', prompt.length, 'chars');
    console.log('   [INFO] Wallet:', userWallet || 'anonymous');

    const recordData = [
      {
        _id: recordId,
        session_id: sessionId,
        user_wallet: userWallet || '',
        user_prompt: {
          '%share': prompt, // Field marked with %share will be encrypted by SecretVaults SDK
        },
        payment_tx_hash: paymentTxHash || '',
        timestamp: new Date().toISOString(),
      },
    ];

    await this.client.createStandardData({
      body: {
        collection: this.collectionId,
        data: recordData,
      },
    });

    console.log('[SUCCESS] Encrypted prompt stored in nilDB');
    console.log('   [INFO] Record ID:', recordId);
    console.log('   [INFO] Collection:', this.collectionId);
    return recordId;
  }

  /**
   * Update a chat record with the AI response
   */
  async storeResponse(recordId: string, response: string): Promise<void> {
    console.log('[ENCRYPT] Encrypting and storing response...');
    console.log('   [INFO] Response length:', response.length, 'chars');
    
    await this.client.updateData({
      collection: this.collectionId,
      filter: {
        _id: recordId,
      },
      update: {
        $set: {
          agent_response: {
            '%share': response, // Encrypted response
          },
        },
      },
    });

    console.log('[SUCCESS] Encrypted response stored in nilDB');
    console.log('   [INFO] Record ID:', recordId);
  }

  /**
   * Get chat history for a session
   */
  async getSessionHistory(sessionId: string): Promise<any[]> {
    const result = await this.client.findData({
      collection: this.collectionId,
      filter: {
        session_id: sessionId,
      },
    });

    return result.data || [];
  }

  /**
   * Get all chat history for a user wallet
   */
  async getUserHistory(userWallet: string): Promise<any[]> {
    const result = await this.client.findData({
      collection: this.collectionId,
      filter: {
        user_wallet: userWallet,
      },
    });

    return result.data || [];
  }

  /**
   * Get all records (for admin/debugging)
   */
  async getAllRecords(): Promise<any[]> {
    const result = await this.client.findData({
      collection: this.collectionId,
      filter: {},
    });

    return result.data || [];
  }

  /**
   * Get the collection ID
   */
  getCollectionId(): string {
    return this.collectionId;
  }
}
