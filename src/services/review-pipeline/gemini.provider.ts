/**
 * gemini.provider.ts
 *
 * Google Gemini model provider for the NFTYLOGS audit engine. PDFs and images are sent inline.
 * Activated when GEMINI_API_KEY and GEMINI_MODEL are both set.
 * API:   https://generativelanguage.googleapis.com/v1beta/models
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

export class GeminiProvider implements ILlmProvider {
  readonly providerName = 'Google Gemini';

  isConfigured(): boolean {
    return readProviderConfig('gemini') !== null;
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const config = readProviderConfig('gemini');
    if (!config) {
      throw new Error('Gemini provider is not configured.');
    }
    const model = options.model || config.model;
    const temperature = options.temperature ?? 0.2;
    const maxOutputTokens = options.maxTokens ?? 4096;

    // Convert to Gemini's content format
    const system = messages.find((m) => m.role === 'system');
    const systemInstruction = system ? contentText(system.content) : '';
    const userMessages = messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: contentParts(m.content).map((p) =>
        p.type === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mimeType, data: p.data.toString('base64') } }
      ),
    }));

    // The API key is sent as a header, never in the URL, so it cannot leak into proxy or access logs.
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const body = {
      system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify(body),
    }, options.timeoutMs);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[GEMINI_PROVIDER] API error ${response.status} on model '${model}': ${errBody.slice(0, 500)}`);
      throw new Error(`Gemini API error ${response.status}.`);
    }

    const data: any = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const content = parts.map((p: any) => p.text || '').join('');
    const usage = data.usageMetadata;

    return {
      content,
      provider: this.providerName,
      model,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    };
  }
}
