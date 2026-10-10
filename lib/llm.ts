/* DeepSeek chat completions (OpenAI-compatible API) with JSON output. */
import { cached, hashKey } from './store.ts';

export const MODELS = {
  main: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
  fast: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-flash',
} as const;

export function requireLlmKey() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set on the server');
}

async function chat(model: string, system: string, prompt: string, maxTokens: number): Promise<string> {
  requireLlmKey();
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Structured JSON output following `schema`. Retries once on empty or invalid JSON. Cached by prompt. */
export async function callJSON<T>(opts: {
  model?: string; system: string; prompt: string; name: string; schema: Record<string, unknown>; maxTokens?: number;
}): Promise<T> {
  const model = opts.model ?? MODELS.main;
  const system = `${opts.system}\n\nReply with a single json object (the "${opts.name}" result) that matches this JSON Schema exactly:\n${JSON.stringify(opts.schema)}`;
  return cached(hashKey('llm', model, system, opts.prompt), async () => {
    let last = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      last = await chat(model, system, opts.prompt, opts.maxTokens ?? 4096);
      try { return JSON.parse(last) as T; } catch { /* retry */ }
    }
    throw new Error(`${opts.name}: model did not return valid JSON (${last.slice(0, 80) || 'empty'})`);
  });
}
