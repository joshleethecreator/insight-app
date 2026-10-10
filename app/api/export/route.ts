import { connection } from 'next/server';
import { notesMarkdown } from '@/lib/store';

/** All notes as Markdown with [[wikilinks]]. */
export async function GET() {
  await connection();
  return new Response(notesMarkdown(), {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': 'attachment; filename="insight-notes.md"' },
  });
}
