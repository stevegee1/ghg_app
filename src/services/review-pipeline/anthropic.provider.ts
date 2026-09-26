/**
 * anthropic.provider.ts
 *
 * Anthropic Claude LLM provider for the AI Audit Screener.
 * Activated when ANTHROPIC_API_KEY is present in environment.
 *
 * Model: claude-3-5-sonnet-20241022 (configurable via ANTHROPIC_MODEL env var)
 * API:   https://api.anthropic.com/v1/messages
 */

import { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmMessage } from './llm-provider.interface';

export class AnthropicProvider implements ILlmProvider {
  readonly providerName = 'Anthropic Claude';
  readonly defaultModel = 'claude-3-5-sonnet-20241022';

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const model = options.model || process.env.ANTHROPIC_MODEL || this.defaultModel;
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 4096;

    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, any> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: conversationMessages,
    };

    if (systemMsg) {
      body.system = systemMsg;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text ?? '';

    return {
      content,
      provider: this.providerName,
      model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  }
}
