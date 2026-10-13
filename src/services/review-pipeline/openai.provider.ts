/**
 * openai.provider.ts
 *
 * OpenAI model provider for the NFTYLOGS audit engine. Images go as image parts, PDFs as file parts.
 * Activated when OPENAI_API_KEY and OPENAI_MODEL are both set.
 * API:   https://api.openai.com/v1/chat/completions
 */

import {
  ILlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmMessage,
  contentParts,
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
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === 'string'
            ? m.content
            : contentParts(m.content).map((p) => {
                if (p.type === 'text') return { type: 'text', text: p.text };
                const dataUri = `data:${p.mimeType};base64,${p.data.toString('base64')}`;
                return p.mimeType === 'application/pdf'
                  ? { type: 'file', file: { filename: p.fileName, file_data: dataUri } }
                  : { type: 'image_url', image_url: { url: dataUri } };
              }),
      })),
    };

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    }, options.timeoutMs);

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
