import Anthropic from '@anthropic-ai/sdk';
import { cached, hashKey } from './store.ts';

export const MODELS = { main: 'claude-sonnet-5-5', fast: 'claude-haiku-5-5' } as const;

let client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set on the server');
  return (client ??= new Anthropic({ maxRetries: 1 }));
}

/** Structured JSON output: forces one tool call whose input follows `schema`. Cached by prompt. */
export async function callJSON<T>(opts: {
  model?: string; system: string; prompt: string; name: string; schema: Record<string, unknown>; maxTokens?: number;
}): Promise<T> {
  const model = opts.model ?? MODELS.main;
  return cached(hashKey('llm', model, opts.system, opts.prompt, opts.schema), async () => {
    const msg = await anthropic().messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      tools: [{ name: opts.name, description: `Return the ${opts.name} result.`, input_schema: opts.schema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: 'tool', name: opts.name },
      messages: [{ role: 'user', content: opts.prompt }],
    }, { timeout: 90_000 });
    const block = msg.content.find(b => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') throw new Error(`${opts.name}: no structured output`);
    return block.input as T;
  });
}
