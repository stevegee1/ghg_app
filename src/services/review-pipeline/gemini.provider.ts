/**
 * gemini.provider.ts
 *
 * Google Gemini LLM provider for the AI Audit Screener.
 * Activated when GEMINI_API_KEY is present in environment.
 *
 * Model: gemini-1.5-pro-latest (configurable via GEMINI_MODEL env var)
 * API:   https://generativelanguage.googleapis.com/v1beta/models
 */

import { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmMessage } from './llm-provider.interface';

export class GeminiProvider implements ILlmProvider {
  readonly providerName = 'Google Gemini';
  readonly defaultModel = 'gemini-3.8-flash';

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  async complete(messages: LlmMessage[], options: LlmCompletionOptions = {}): Promise<LlmCompletionResult> {
    const apiKey = process.env.GEMINI_API_KEY!;
    const model = options.model || process.env.GEMINI_MODEL || this.defaultModel;
    const temperature = options.temperature ?? 0.2;
    const maxOutputTokens = options.maxTokens ?? 4096;

    // Convert to Gemini's content format
    const systemInstruction = messages.find((m) => m.role === 'system')?.content || '';
    const userMessages = messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${err}`);
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
