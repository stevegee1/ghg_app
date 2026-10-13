/**
 * llm-provider.interface.ts
 *
 * Provider-agnostic model abstraction behind the NFTYLOGS audit engine.
 * Each concrete provider (Gemini, Anthropic, OpenAI) implements ILlmProvider.
 * The AiAuditReviewer selects the active provider at runtime by inspecting
 * environment variables, making the system LLM-provider-independent.
 */

/** A piece of a message: text, or a file (PDF or image) the model reads directly. */
export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; fileName: string; mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp'; data: Buffer };

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmContentPart[];
}

/** A message's content as parts, so providers handle plain text and files the same way. */
export function contentParts(content: LlmMessage['content']): LlmContentPart[] {
  return typeof content === 'string' ? [{ type: 'text', text: content }] : content;
}

/** A message's text only (system prompts are always text). */
export function contentText(content: LlmMessage['content']): string {
  return contentParts(content)
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('\n');
}

export interface LlmCompletionOptions {
  temperature?: number; // 0.0 to 1.0, default 0.2 for deterministic audit scoring
  maxTokens?: number;
  model?: string; // Override default model per provider
  timeoutMs?: number; // Longer when the request carries documents
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

/** API key and model environment variables for each supported provider. */
export const LLM_PROVIDER_ENV = {
  gemini: { key: 'GEMINI_API_KEY', model: 'GEMINI_MODEL' },
  anthropic: { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' },
  openai: { key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' },
} as const;

export type LlmProviderId = keyof typeof LLM_PROVIDER_ENV;

/** A provider is usable only when both its API key and its model name are configured. */
export function readProviderConfig(id: LlmProviderId): { apiKey: string; model: string } | null {
  const apiKey = process.env[LLM_PROVIDER_ENV[id].key]?.trim();
  const model = process.env[LLM_PROVIDER_ENV[id].model]?.trim();
  return apiKey && model ? { apiKey, model } : null;
}

/** The provider the audit engine pre-screen will use, in the same priority order as resolveActiveProvider; null means rules only. */
export function configuredLlmProviderId(): LlmProviderId | null {
  return (['gemini', 'anthropic', 'openai'] as LlmProviderId[]).find((id) => readProviderConfig(id) !== null) ?? null;
}

/** Throws at boot when a provider key is set without its model name. */
export function validateLlmProviderConfig(): void {
  const problems = (Object.keys(LLM_PROVIDER_ENV) as LlmProviderId[])
    .filter((id) => process.env[LLM_PROVIDER_ENV[id].key] && !process.env[LLM_PROVIDER_ENV[id].model])
    .map((id) => `${LLM_PROVIDER_ENV[id].model} must be set when ${LLM_PROVIDER_ENV[id].key} is set.`);
  if (problems.length > 0) {
    throw new Error(problems.join(' '));
  }
}

export const LLM_REQUEST_TIMEOUT_MS = 30000;

/** fetch with an abort timeout so a stalled provider cannot hold an evaluation open. */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = LLM_REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
