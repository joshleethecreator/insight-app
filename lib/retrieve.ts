/* Retrieval, phase 1: keyword search over notes (minisearch) plus expansion along links.
   Phase 2 swaps embeddings in behind the same searchNotes() interface. */
import MiniSearch from 'minisearch';
import type { Note } from './types.ts';

function index(notes: Note[]) {
  const ms = new MiniSearch<{ id: string; title: string; company: string; type: string; text: string }>({
    fields: ['title', 'company', 'type', 'text'],
    searchOptions: { boost: { title: 3, company: 2 }, prefix: true, fuzzy: 0.15 },
  });
  ms.addAll(notes.filter(n => n.type !== 'Source').map(n => ({
    id: n.id, title: n.title, company: n.company, type: n.type, text: [n.body_md, ...n.claims.map(c => c.text)].join(' '),
  })));
  return ms;
}

export function searchNotes(question: string, notes: Note[], k = 8): Note[] {
  const byId = new Map(notes.map(n => [n.id, n]));
  return index(notes).search(question).slice(0, k).map(r => byId.get(r.id as string)!).filter(Boolean);
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

const FILLER = new Set(['malaysia', 'malaysian', 'my', 'the', 'and', 'of', 'in', 'for', 'on', 'a', 'to', 'new', 'latest', 'current', 'recent']);

/** A task is covered when the graph has notes of the asked type for the asked company that match most of the
    task's own words — the brand name or "Malaysia" alone does not count. */
export function coverage(task: { query: string; company?: string; note_type?: string }, notes: Note[]): Note[] {
  const co = task.company?.toLowerCase();
  const brand = new Set((co ?? '').split(/[^a-z0-9]+/));
  const words = [...new Set(task.query.toLowerCase().split(/[^a-z0-9]+/))].filter(w => w.length > 1 && !FILLER.has(w) && !brand.has(w) && !/^20\d\d$/.test(w));
  if (!words.length) return [];
  const need = Math.max(1, Math.ceil(words.length / 2));
  const byId = new Map(notes.map(n => [n.id, n]));
  return index(notes).search(words.join(' '))
    .filter(r => r.queryTerms.length >= need)
    .map(r => byId.get(r.id as string)!)
    .filter(n => n && (!co || n.company.toLowerCase() === co) && (!task.note_type || n.type === task.note_type));
}
