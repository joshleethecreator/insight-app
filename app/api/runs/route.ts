import { connection } from 'next/server';
import { listRuns } from '@/lib/store';

export async function GET() {
  await connection();
  return Response.json({ runs: listRuns() });
}
