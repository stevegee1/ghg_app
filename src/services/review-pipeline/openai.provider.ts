/**
 * openai.provider.ts
 *
 * OpenAI GPT LLM provider for the AI Audit Screener.
 * Activated when OPENAI_API_KEY is present in environment.
 *
 * Model: gpt-4o (configurable via OPENAI_MODEL env var)
 * API:   https://api.openai.com/v1/chat/completions
 */

import { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmMessage } from './llm-provider.interface';

export class OpenAiProvider implements ILlmProvider {
  readonly providerName = 'OpenAI GPT';
  readonly defaultModel = 'gpt-4o';

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const model = options.model || process.env.OPENAI_MODEL || this.defaultModel;
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 4096;

    const body = {
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
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
