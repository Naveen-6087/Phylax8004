/**
 * TypeScript Type Definitions
 */

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Chat request/response types
export interface ChatRequest {
  message: string;
  sessionId?: string;
  userWallet?: string;
  paymentTxHash?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  recordId: string;
  timestamp: string;
}

// A2A protocol types
export interface A2AMessage {
  role: 'user' | 'agent';
  parts: Array<{ type: 'text'; text: string }>;
}

export interface A2ATask {
  id: string;
  contextId: string;
  status: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';
  messages: A2AMessage[];
  artifacts: Array<{ name: string; parts: Array<{ type: 'text'; text: string }> }>;
}

// nilDB record types
export interface MedicalChatRecord {
  _id: string;
  session_id: string;
  user_wallet?: string;
  user_prompt: {
    '%allot': string;
  };
  agent_response?: {
    '%allot': string;
  };
  payment_tx_hash?: string;
  timestamp: string;
}

// ERC-8004 types
export interface AgentMetadata {
  type: string;
  name: string;
  description: string;
  image: string;
  endpoints: AgentEndpoint[];
  registrations: AgentRegistration[];
  supportedTrust: string[];
}

export interface AgentEndpoint {
  name: string;
  endpoint: string;
  version?: string;
  capabilities?: Record<string, unknown>;
}

export interface AgentRegistration {
  agentId: number | string;
  agentRegistry: string;
}

// Payment types
export interface PaymentConfig {
  network: string;
  facilitatorUrl: string;
  usdcAddress: string;
  defaultPrice: string;
}
