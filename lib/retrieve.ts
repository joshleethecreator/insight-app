/* Retrieval, phase 1: keyword search over notes (minisearch) plus expansion along links.
   Phase 2 swaps embeddings in behind the same searchNotes() interface. */
import MiniSearch from 'minisearch';
import type { Note } from './types.ts';

export function searchNotes(question: string, notes: Note[], k = 8): Note[] {
  const ms = new MiniSearch<{ id: string; title: string; company: string; type: string; text: string }>({
    fields: ['title', 'company', 'type', 'text'],
    searchOptions: { boost: { title: 3, company: 2 }, prefix: true, fuzzy: 0.15 },
  });
  ms.addAll(notes.filter(n => n.type !== 'Source').map(n => ({
    id: n.id, title: n.title, company: n.company, type: n.type, text: [n.body_md, ...n.claims.map(c => c.text)].join(' '),
  })));
  const byId = new Map(notes.map(n => [n.id, n]));
  return ms.search(question).slice(0, k).map(r => byId.get(r.id as string)!).filter(Boolean);
}

/** Adds notes 1–2 hops away along links (e.g. Product → its Price and Campaign). */
export function expand(seeds: Note[], notes: Note[], hops = 1): Note[] {
  const byId = new Map(notes.map(n => [n.id, n]));
  const out = new Map(seeds.map(n => [n.id, n]));
  let frontier = seeds;
  for (let h = 0; h < hops; h++) {
    const next: Note[] = [];
    for (const n of frontier) for (const l of n.links) {
      const m = byId.get(l.to);
      if (m && m.type !== 'Source' && !out.has(m.id)) { out.set(m.id, m); next.push(m); }
    }
    frontier = next;
  }
  return [...out.values()];
}

/** A task is covered when the graph has notes of the asked type for the asked company that match its query. */
export function coverage(task: { query: string; company?: string; note_type?: string }, notes: Note[]): Note[] {
  const co = task.company?.toLowerCase();
  return searchNotes(task.query, notes, 20).filter(n =>
    (!co || n.company.toLowerCase() === co) && (!task.note_type || n.type === task.note_type));
}
