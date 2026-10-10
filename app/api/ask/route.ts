import { runAgent } from '@/lib/agent';
import type { Run } from '@/lib/types';

export const maxDuration = 300;

/** Runs the agent and streams each step as Server-Sent Events. */
export async function POST(req: Request) {
  const { question, mode } = (await req.json()) as { question?: string; mode?: Run['mode'] };
  const q = question?.trim();
  if (!q) return Response.json({ error: 'question is required' }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      await runAgent(q.slice(0, 500), mode === 'report' ? 'report' : 'answer', e => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)));
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' } });
}
