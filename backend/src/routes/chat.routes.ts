/**
 * Chat Routes
 *
 * API endpoints for the medical chat functionality.
 * Protected by x402 payment middleware.
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { NilDBService } from '../services/nildb.service.js';
import { NilaiService } from '../services/nilai.service.js';

// Types for chat messages
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  userWallet?: string;
  paymentTxHash?: string;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  recordId: string;
  timestamp: string;
}

// In-memory session storage (replace with Redis in production)
const sessionHistory = new Map<string, ChatMessage[]>();

export function createChatRoutes(
  nildbService: NilDBService,
  nilaiService: NilaiService
): express.Router {
  const router = express.Router();

  /**
   * POST /api/chat
   * Main chat endpoint - processes medical queries
   * Protected by x402 payment middleware
   */
  router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, sessionId, userWallet, paymentTxHash }: ChatRequest = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Use existing session or create new one
      const currentSessionId = sessionId || uuidv4();

      // Get conversation history for context
      const history = sessionHistory.get(currentSessionId) || [];

      // Store encrypted prompt in nilDB
      const recordId = await nildbService.storePrompt(
        currentSessionId,
        message,
        paymentTxHash,
        userWallet
      );

      // Process with nilAI (in TEE)
      console.log('[TEE] Processing query in TEE...');
      const response = await nilaiService.processQuery(message, history);

      // Store encrypted response in nilDB
      await nildbService.storeResponse(recordId, response);

      // Update session history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: response });
      sessionHistory.set(currentSessionId, history);

      const chatResponse: ChatResponse = {
        response,
        sessionId: currentSessionId,
        recordId,
        timestamp: new Date().toISOString(),
      };

      console.log('[SUCCESS] Query processed successfully');
      res.json(chatResponse);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Failed to process medical query',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/chat/stream
   * Streaming chat endpoint for real-time responses
   */
  router.post('/chat/stream', async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, sessionId, userWallet, paymentTxHash }: ChatRequest = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const currentSessionId = sessionId || uuidv4();
      const history = sessionHistory.get(currentSessionId) || [];

      // Store encrypted prompt
      const recordId = await nildbService.storePrompt(
        currentSessionId,
        message,
        paymentTxHash,
        userWallet
      );

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Stream the response
      let fullResponse = '';
      for await (const chunk of nilaiService.streamQuery(message, history)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk, sessionId: currentSessionId })}\n\n`);
      }

      // Store encrypted response
      await nildbService.storeResponse(recordId, fullResponse);

      // Update session history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: fullResponse });
      sessionHistory.set(currentSessionId, history);

      // Send completion event
      res.write(`data: ${JSON.stringify({ done: true, recordId, sessionId: currentSessionId })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
      res.end();
    }
  });

  /**
   * GET /api/chat/history/:sessionId
   * Get chat history for a session (decrypted)
   */
  router.get('/history/:sessionId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const history = await nildbService.getSessionHistory(sessionId);
      res.json({ sessionId, history });
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({ error: 'Failed to retrieve history' });
    }
  });

  /**
   * GET /api/chat/user/:wallet
   * Get all chat history for a user wallet
   */
  router.get('/user/:wallet', async (req: Request, res: Response): Promise<void> => {
    try {
      const { wallet } = req.params;

      if (!wallet) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      const history = await nildbService.getUserHistory(wallet);
      res.json({ wallet, history });
    } catch (error) {
      console.error('User history error:', error);
      res.status(500).json({ error: 'Failed to retrieve user history' });
    }
  });

  /**
   * GET /api/chat/health
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response): void => {
    res.json({
      status: 'healthy',
      model: nilaiService.getModel(),
      collectionId: nildbService.getCollectionId(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
