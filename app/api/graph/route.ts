import { connection } from 'next/server';
import { allNotes } from '@/lib/store';

export async function GET() {
  await connection(); // better-sqlite3 is synchronous; keep this out of prerendering
  return Response.json({ notes: allNotes() });
}
