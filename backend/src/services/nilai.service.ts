/**
 * nilAI Service - Private Medical AI Inference
 *
 * Handles private LLM inference using Nillion's nilAI nodes.
 * All prompts are processed inside a Trusted Execution Environment (TEE),
 * ensuring user data never leaves the secure enclave unencrypted.
 */

import { NilaiOpenAIClient, NilAuthInstance } from '@nillion/nilai-ts';
import { NILAI_CONFIG } from '../config/nillion.js';

/**
 * System prompt for medical AI assistant
 * Defines the behavior and constraints of the medical chatbot
 */
const MEDICAL_SYSTEM_PROMPT = `You are a privacy-focused medical AI assistant powered by Nillion's secure computation network.

IMPORTANT GUIDELINES:
1. You provide general health information and guidance, NOT medical diagnoses.
2. Always recommend consulting a healthcare professional for specific medical concerns.
3. Be empathetic, clear, and concise in your responses.
4. Never store or share any personal health information outside this conversation.
5. If asked about emergency symptoms, advise seeking immediate medical attention.

Your responses are processed inside a Trusted Execution Environment (TEE) for privacy.
All conversation data is encrypted using Nillion's secure storage.

When responding:
- Acknowledge the user's concern
- Provide relevant general health information
- Suggest when to seek professional medical advice
- Be supportive but avoid making specific diagnoses`;

export class NilaiService {
  private client: NilaiOpenAIClient;

  constructor() {
    const apiKey = process.env.NILLION_API_KEY;

    if (!apiKey) {
      throw new Error('NILLION_API_KEY environment variable is required');
    }

    // Initialize the nilAI OpenAI-compatible client
    // Uses API key mode for direct access
    this.client = new NilaiOpenAIClient({
      baseURL: NILAI_CONFIG.baseURL,
      apiKey: apiKey,
      nilauthInstance: NilAuthInstance.SANDBOX,
    });
  }

  /**
   * Process a medical query and return the AI response
   *
   * @param userPrompt - The user's medical question
   * @param conversationHistory - Previous messages for context (optional)
   * @param enableWebSearch - Enable web search for latest information (optional)
   * @returns The AI assistant's response
   */
  async processQuery(
    userPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    enableWebSearch: boolean = true // Enable web search by default
  ): Promise<string> {
    // Build the messages array with system prompt, history, and new message
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userPrompt },
    ];

    try {
      console.log('[TEE] Processing in TEE with web search:', enableWebSearch);
      
      const response = await this.client.chat.completions.create(
        {
          model: NILAI_CONFIG.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        },
        {
          extra_body: { web_search: enableWebSearch }, // Enable web search for latest info
        } as any
      );

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response received from nilAI');
      }

      console.log('[SUCCESS] nilAI response received (length:', content.length, 'chars)');
      return content;
    } catch (error) {
      console.error('nilAI processing error:', error);
      throw new Error('Failed to process medical query securely');
    }
  }

  /**
   * Process a medical query with streaming response
   *
   * @param userPrompt - The user's medical question
   * @param conversationHistory - Previous messages for context (optional)
   * @yields Text chunks as they are generated
   */
  async *streamQuery(
    userPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): AsyncGenerator<string> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userPrompt },
    ];

    try {
      const stream = await this.client.chat.completions.create({
        model: NILAI_CONFIG.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      });

      for await (const chunk of stream as AsyncIterable<any>) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('nilAI streaming error:', error);
      throw new Error('Failed to stream medical response');
    }
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return NILAI_CONFIG.model;
  }
}
