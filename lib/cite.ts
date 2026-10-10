import type { Answer, Claim, Note, Sentence } from './types.ts';

/** Source ids in order of first citation, so chips and the source list share numbers. */
export function citedSources(a: Answer, claims: Map<string, Claim>): string[] {
  const out: string[] = [];
  for (const s of [a.lead, ...a.sections.flatMap(x => x.sentences)])
    for (const c of s.cites) {
      const src = claims.get(c)?.source_id;
      if (src && !out.includes(src)) out.push(src);
    }
  return out;
}

export function toMarkdown(a: Answer, claims: Map<string, Claim>, notes: Map<string, Note>): string {
  const order = citedSources(a, claims);
  const refs = (s: Sentence) => [...new Set(s.cites.map(c => order.indexOf(claims.get(c)?.source_id ?? '') + 1).filter(Boolean))].map(n => `[${n}]`).join('');
  const line = (s: Sentence) => `${s.inference ? '_Inference:_ ' : ''}${s.text} ${refs(s)}`.trim();
  const md = [`# ${a.title}`, '', `> ${line(a.lead)}`, ''];
  for (const sec of a.sections) {
    if (sec.heading) md.push(`## ${sec.heading}`, '');
    md.push(...sec.sentences.map(s => `- ${line(s)}`), '');
  }
  if (a.not_found.length) md.push('## Not found', '', ...a.not_found.map(x => `- ${x}`), '');
  md.push('## Sources', '', ...order.map((id, i) => `${i + 1}. ${notes.get(id)?.title ?? id} — ${notes.get(id)?.url ?? ''}`));
  return md.join('\n');
}
