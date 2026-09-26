/**
 * llm-provider.interface.ts
 *
 * Provider-agnostic LLM abstraction for the AI Audit Screener.
 * Each concrete provider (Gemini, Anthropic, OpenAI) implements ILlmProvider.
 * The AiAuditReviewer selects the active provider at runtime by inspecting
 * environment variables, making the system LLM-provider-independent.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  temperature?: number; // 0.0 to 1.0, default 0.2 for deterministic audit scoring
  maxTokens?: number;
  model?: string; // Override default model per provider
}

export interface LlmCompletionResult {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Core LLM provider contract. All implementations must be stateless and
 * safe to call concurrently (no shared mutable state).
 */
export interface ILlmProvider {
  readonly providerName: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  complete(messages: LlmMessage[], options?: LlmCompletionOptions): Promise<LlmCompletionResult>;
}

/**
 * Auto-selects the best available LLM provider from environment variables.
 * Priority order: Gemini > Anthropic > OpenAI > null (deterministic fallback).
 */
export function resolveActiveProvider(providers: ILlmProvider[]): ILlmProvider | null {
  return providers.find((p) => p.isConfigured()) ?? null;
}
