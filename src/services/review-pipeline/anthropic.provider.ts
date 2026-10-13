/**
 * anthropic.provider.ts
 *
 * Anthropic Claude model provider for the NFTYLOGS audit engine. PDFs go as document blocks, images as image blocks.
 * Activated when ANTHROPIC_API_KEY and ANTHROPIC_MODEL are both set.
 * API:   https://api.anthropic.com/v1/messages
 */

import {
  ILlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmMessage,
  contentParts,
  contentText,
  readProviderConfig,
  fetchWithTimeout,
} from './llm-provider.interface';

export class AnthropicProvider implements ILlmProvider {
  readonly providerName = 'Anthropic Claude';

  isConfigured(): boolean {
    return readProviderConfig('anthropic') !== null;
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const config = readProviderConfig('anthropic');
    if (!config) {
      throw new Error('Anthropic provider is not configured.');
    }
    const model = options.model || config.model;
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 4096;

    const system = messages.find((m) => m.role === 'system');
    const systemMsg = system ? contentText(system.content) : undefined;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: contentParts(m.content).map((p) => {
          if (p.type === 'text') return { type: 'text', text: p.text };
          const source = { type: 'base64', media_type: p.mimeType, data: p.data.toString('base64') };
          return p.mimeType === 'application/pdf' ? { type: 'document', source, title: p.fileName } : { type: 'image', source };
        }),
      }));

    const body: Record<string, any> = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: conversationMessages,
    };

    if (systemMsg) {
      body.system = systemMsg;
    }

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    }, options.timeoutMs);

    if (!response.ok) {
      const err = await response.text();
      console.error(`[ANTHROPIC_PROVIDER] API error ${response.status} on model '${model}': ${err.slice(0, 500)}`);
      throw new Error(`Anthropic API error ${response.status}.`);
    }

    const data: any = await response.json();
    const content = (data.content ?? []).map((block: any) => (block.type === 'text' ? block.text : '')).join('');

    return {
      content,
      provider: this.providerName,
      model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  }
}
