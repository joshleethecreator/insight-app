/* Shared validation: used by the agent at run time and by `npm run check`. */
import type { Answer, Note } from './types.ts';

const squash = (s: string) => s.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ').trim().toLowerCase();

/** True when the evidence snippet appears in the fetched page text (ignoring whitespace and quote style). */
export function snippetFound(snippet: string, pageText: string) {
  const s = squash(snippet);
  return s.length >= 12 && squash(pageText).includes(s);
}

export const NOT_FOUND = 'Not found: the graph and the sources the agent could read do not cover this.';

/** Every sentence must cite at least one claim that exists. */
export function answerProblems(a: Answer, claimIds: Set<string>): string[] {
  const out: string[] = [];
  const all = [a.lead, ...a.sections.flatMap(s => s.sentences)];
  for (const s of all) {
    if (s.text === NOT_FOUND) continue;
    if (!s.cites.length) out.push(`uncited sentence: "${s.text.slice(0, 80)}"`);
    for (const c of s.cites) if (!claimIds.has(c)) out.push(`unknown claim id ${c}`);
  }
  return out;
}

/** Graph integrity. Snippets whose source has no cached copy are warnings, not errors. */
export function graphProblems(notes: Note[], cachedText: (sourceId: string) => string | null) {
  const errors: string[] = [], warnings: string[] = [];
  const byId = new Map(notes.map(n => [n.id, n]));
  for (const n of notes) {
    if (n.type !== 'Source' && !n.claims.length) errors.push(`${n.id}: note with zero claims`);
    for (const l of n.links) if (!byId.has(l.to)) errors.push(`${n.id}: link to missing note ${l.to}`);
    for (const c of n.claims) {
      const src = byId.get(c.source_id);
      if (!src || src.type !== 'Source') { errors.push(`${c.id}: cites missing source ${c.source_id}`); continue; }
      const text = cachedText(c.source_id);
      if (text == null) warnings.push(`${c.id}: no cached copy of ${c.source_id}, snippet not checked`);
      else if (!snippetFound(c.evidence_snippet, text)) errors.push(`${c.id}: evidence snippet not found in cached ${c.source_id}`);
    }
  }
  return { errors, warnings };
}
