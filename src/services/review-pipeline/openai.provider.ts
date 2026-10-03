/**
 * openai.provider.ts
 *
 * OpenAI GPT LLM provider for the AI Audit Screener.
 * Activated when OPENAI_API_KEY and OPENAI_MODEL are both set.
 * API:   https://api.openai.com/v1/chat/completions
 */

import {
  ILlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmMessage,
  readProviderConfig,
  fetchWithTimeout,
} from './llm-provider.interface';

export class OpenAiProvider implements ILlmProvider {
  readonly providerName = 'OpenAI';

  isConfigured(): boolean {
    return readProviderConfig('openai') !== null;
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const config = readProviderConfig('openai');
    if (!config) {
      throw new Error('OpenAI provider is not configured.');
    }
    const model = options.model || config.model;
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 4096;

    const body = {
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[OPENAI_PROVIDER] API error ${response.status} on model '${model}': ${err.slice(0, 500)}`);
      throw new Error(`OpenAI API error ${response.status}.`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    return {
      content,
      provider: this.providerName,
      model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
