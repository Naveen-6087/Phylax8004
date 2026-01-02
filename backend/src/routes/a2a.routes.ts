/**
 * A2A Routes
 *
 * Agent-to-Agent (A2A) protocol endpoints for agent communication.
 * Implements JSON-RPC 2.0 for message/send, tasks/get, and tasks/cancel.
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { NilaiService } from '../services/nilai.service.js';

// Types for A2A protocol
interface A2AMessage {
  role: 'user' | 'agent';
  parts: Array<{ type: 'text'; text: string }>;
}

interface A2ATask {
  id: string;
  contextId: string;
  status: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';
  messages: A2AMessage[];
  artifacts: Array<{ name: string; parts: Array<{ type: 'text'; text: string }> }>;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// In-memory storage
const tasks = new Map<string, A2ATask>();
const conversationHistory = new Map<string, ConversationMessage[]>();

export function createA2ARoutes(nilaiService: NilaiService): express.Router {
  const router = express.Router();

  /**
   * GET /.well-known/agent-card.json
   * Agent discovery card for A2A protocol
   */
  router.get('/.well-known/agent-card.json', (_req: Request, res: Response): void => {
    const agentCard = {
      name: 'Private Medical AI',
      description: 'Privacy-preserving medical AI assistant powered by Nillion',
      url: process.env.AGENT_URL || 'http://localhost:3001',
      version: '1.0.0',
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      authentication: {
        schemes: ['x402'],
      },
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: [
        {
          id: 'medical-chat',
          name: 'Medical Chat',
          description: 'Answer medical questions with privacy protection',
          tags: ['medical', 'health', 'privacy', 'ai'],
          examples: [
            'What are the symptoms of the common cold?',
            'How can I improve my sleep quality?',
            'What should I do for a mild headache?',
          ],
        },
      ],
    };

    res.json(agentCard);
  });

  /**
   * POST /a2a
   * JSON-RPC 2.0 endpoint for A2A protocol
   */
  router.post('/a2a', async (req: Request, res: Response): Promise<void> => {
    const { jsonrpc, method, params, id } = req.body;

    // Validate JSON-RPC version
    if (jsonrpc !== '2.0') {
      res.json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id,
      });
      return;
    }

    try {
      let result;
      switch (method) {
        case 'message/send':
          result = await handleMessageSend(params, nilaiService, res);
          break;
        case 'tasks/get':
          result = handleTasksGet(params);
          break;
        case 'tasks/cancel':
          result = handleTasksCancel(params);
          break;
        default:
          res.json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id,
          });
          return;
      }

      // If result is null, response was already sent (streaming)
      if (result !== null) {
        res.json({ jsonrpc: '2.0', result, id });
      }
    } catch (error: any) {
      res.json({
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message || 'Internal error' },
        id,
      });
    }
  });

  return router;
}

/**
 * Handle message/send method
 */
async function handleMessageSend(
  params: {
    message: { role: string; parts: Array<{ type: string; text?: string }> };
    configuration?: { contextId?: string; streaming?: boolean };
  },
  nilaiService: NilaiService,
  res: express.Response
): Promise<A2ATask | null> {
  const { message, configuration } = params;
  const streaming = configuration?.streaming ?? false;
  const contextId = configuration?.contextId || uuidv4();
  const taskId = uuidv4();

  // Extract text content
  const userText = message.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('\n');

  // Get conversation history
  const history = conversationHistory.get(contextId) || [];

  if (streaming) {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create initial task
    const task: A2ATask = {
      id: taskId,
      contextId,
      status: 'working',
      messages: [{ role: 'user', parts: [{ type: 'text', text: userText }] }],
      artifacts: [],
    };
    tasks.set(taskId, task);

    // Send initial state
    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: task })}\n\n`);

    // Stream response
    let fullResponse = '';
    for await (const chunk of nilaiService.streamQuery(userText, history)) {
      fullResponse += chunk;

      const partialTask = {
        ...task,
        status: 'working' as const,
        messages: [
          { role: 'user' as const, parts: [{ type: 'text' as const, text: userText }] },
          { role: 'agent' as const, parts: [{ type: 'text' as const, text: fullResponse }] },
        ],
      };
      res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: partialTask })}\n\n`);
    }

    // Update history
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: fullResponse });
    conversationHistory.set(contextId, history);

    // Send completed task
    const completedTask: A2ATask = {
      id: taskId,
      contextId,
      status: 'completed',
      messages: [
        { role: 'user', parts: [{ type: 'text', text: userText }] },
        { role: 'agent', parts: [{ type: 'text', text: fullResponse }] },
      ],
      artifacts: [],
    };
    tasks.set(taskId, completedTask);

    res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', result: completedTask })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

    return null;
  }

  // Non-streaming response
  const responseText = await nilaiService.processQuery(userText, history);

  // Update history
  history.push({ role: 'user', content: userText });
  history.push({ role: 'assistant', content: responseText });
  conversationHistory.set(contextId, history);

  const task: A2ATask = {
    id: taskId,
    contextId,
    status: 'completed',
    messages: [
      { role: 'user', parts: [{ type: 'text', text: userText }] },
      { role: 'agent', parts: [{ type: 'text', text: responseText }] },
    ],
    artifacts: [],
  };

  tasks.set(taskId, task);
  return task;
}

/**
 * Handle tasks/get method
 */
function handleTasksGet(params: { taskId: string }): A2ATask {
  const task = tasks.get(params.taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  return task;
}

/**
 * Handle tasks/cancel method
 */
function handleTasksCancel(params: { taskId: string }): A2ATask {
  const task = tasks.get(params.taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  task.status = 'canceled';
  return task;
}
