/* Agent pipeline:
   Planner → Retriever → (gaps) Researcher → Extractor → Validator → Graph writer → Retriever → Answerer.
   Each step streams its status to the UI through `emit`. */
import { callJSON, MODELS, requireLlmKey } from './llm.ts';
import { allNotes, newId, now, saveRun, writeNotes, type CandidateNote } from './store.ts';
import { coverage, expand, searchNotes } from './retrieve.ts';
import { allowedHost, fetchPage, search, type Page } from './web.ts';
import { answerProblems, NOT_FOUND, snippetFound } from './checks.ts';
import type { AgentEvent, Answer, Note, Run, Sentence, Task, WebPage } from './types.ts';

type Emit = (e: AgentEvent) => void;
const MAX_RESEARCH_TASKS = 3, PAGES_PER_TASK = 2;
const CONTENT_TYPES = ['Company', 'Product', 'Price', 'Campaign', 'Event'];
const RELATIONS = ['makes', 'made_by', 'has_price', 'price_of', 'runs', 'run_by', 'promotes', 'promoted_by', 'attends', 'involves', 'competes_with'];

export async function runAgent(question: string, mode: Run['mode'], emit: Emit): Promise<Run> {
  const run: Run = { id: newId('run'), question, mode, created_at: now(), tasks: [], answer: null, new_note_ids: [], web: [] };
  emit({ type: 'run', run_id: run.id });
  const tasks = () => emit({ type: 'tasks', tasks: run.tasks.map(t => ({ ...t })) });
  try {
    requireLlmKey(); // fails fast when no key is configured
    let notes = allNotes();

    emit({ type: 'step', label: 'Planning research tasks' });
    run.tasks = (await plan(question, mode, notes)).slice(0, 6).map((t, i) => ({ ...t, id: `t${i + 1}`, status: 'planned' }));
    tasks();

    emit({ type: 'step', label: 'Searching the graph' });
    const gaps: Task[] = [];
    const seen = new Set<string>(); // pages already handled in this run
    for (const t of run.tasks) {
      const hits = coverage(t, notes);
      if (hits.length) Object.assign(t, { status: 'done', detail: `${hits.length} note${hits.length === 1 ? '' : 's'} already in the graph` });
      else gaps.push(t);
    }
    tasks();

    for (const [i, t] of gaps.entries()) {
      if (i >= MAX_RESEARCH_TASKS) { Object.assign(t, { status: 'failed', detail: 'Skipped: research limit for one run' }); continue; }
      t.status = 'running'; t.detail = 'Researching public sources'; tasks();
      emit({ type: 'step', label: `Researching: ${t.title}` });
      try {
        const ids = await research(t, notes, seen, label => { t.detail = label; tasks(); },
          p => { run.web!.push(p); emit({ type: 'web', pages: [...run.web!] }); });
        run.new_note_ids.push(...ids.filter(id => !run.new_note_ids.includes(id)));
        notes = allNotes();
        Object.assign(t, ids.length ? { status: 'done', detail: `${ids.length} note${ids.length === 1 ? '' : 's'} added or updated` }
          : { status: 'failed', detail: 'No claims survived validation — not found' });
      } catch (e) {
        Object.assign(t, { status: 'failed', detail: msg(e) });
      }
      tasks();
    }
    // Notes travel with the events: on Vercel the next request may reach an instance without them.
    if (run.new_note_ids.length) emit({ type: 'notes', ids: run.new_note_ids, notes });

    emit({ type: 'step', label: mode === 'report' ? 'Writing the report' : 'Writing the answer' });
    const seeds = new Map<string, Note>();
    for (const n of searchNotes(question, notes, 8)) seeds.set(n.id, n);
    for (const t of run.tasks) for (const n of coverage(t, notes).slice(0, 4)) seeds.set(n.id, n);
    for (const id of run.new_note_ids) { const n = notes.find(x => x.id === id && x.type !== 'Source'); if (n) seeds.set(n.id, n); }
    const context = expand([...seeds.values()], notes, mode === 'report' ? 2 : 1).slice(0, 45);
    run.answer = await answer(question, mode, context, notes);
    saveRun(run);
    emit({ type: 'answer', run, notes: allNotes() });
  } catch (e) {
    run.error = msg(e);
    emit({ type: 'error', message: run.error });
  }
  return run;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ---------- Planner ---------- */

async function plan(question: string, mode: Run['mode'], notes: Note[]) {
  const companies = [...new Set(notes.filter(n => n.type === 'Company').map(n => n.company))];
  const r = await callJSON<{ tasks: Omit<Task, 'id' | 'status'>[] }>({
    name: 'plan',
    system: 'You plan competitor research for a car dealership owner in Malaysia. Split the request into 2–6 concrete research tasks. ' +
      'Each task targets one company and one note type where possible. Never plan research on individual people or employees.',
    prompt: `Request (${mode}): ${question}\nCompanies already in the knowledge graph: ${companies.join(', ')}\nNote types: ${CONTENT_TYPES.join(', ')}`,
    schema: { type: 'object', required: ['tasks'], properties: { tasks: { type: 'array', items: { type: 'object', required: ['title', 'query'], properties: {
      title: { type: 'string', description: 'short task name shown to the user' },
      query: { type: 'string', description: 'web search query, e.g. "Tesla Model Y price Malaysia 2026"' },
      company: { type: 'string', description: 'brand name as used in the graph, e.g. "Toyota"' },
      note_type: { type: 'string', enum: CONTENT_TYPES },
    } } } } },
  });
  return r.tasks;
}

/* ---------- Researcher → Extractor → Validator → Graph writer ---------- */

async function research(task: Task, notes: Note[], seen: Set<string>, status: (s: string) => void, log: (p: WebPage) => void): Promise<string[]> {
  const hits = (await search(task.query)).filter(h => allowedHost(h.url));
  status(`Found ${hits.length} results`);
  const ids: string[] = [];
  let read = 0;
  for (const h of hits) {
    if (read >= PAGES_PER_TASK) break;
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    const host = new URL(h.url).hostname;
    const entry = { url: h.url, title: h.title || host, task: task.title };
    const page = await fetchPage(h.url, { title: h.title, text: h.raw });
    if ('error' in page) {
      status(`Skipped ${host}: ${page.error}`);
      log({ ...entry, status: /HTTP 4|robots|skipped/.test(page.error) ? 'blocked' : 'error', detail: page.error });
      continue;
    }
    read++;
    status(`Reading ${host}`);
    const via = page.via ? ' (site blocked our server; used the search provider’s copy of the page)' : '';
    try {
      const ex = await extract(task, page, notes);
      const valid = await validate(ex.notes, page, ex.published_date);
      if (!valid.length) { log({ ...entry, status: 'no_claims', detail: 'Read, but no claim passed validation' + via }); continue; }
      const res = writeNotes({ url: page.url, title: ex.source_title || page.title || h.title, source_type: ex.source_type || 'news',
        published_date: ex.published_date || h.page_age || '', cached_text: page.text, company: task.company ?? '' }, valid);
      ids.push(...res.created, ...res.updated);
      const n = valid.reduce((k, c) => k + c.claims.length, 0);
      log({ ...entry, title: ex.source_title || entry.title, status: 'saved', detail: `${n} verified claim${n === 1 ? '' : 's'} saved` + via, source_id: res.source_id });
      notes = allNotes();
    } catch (e) {
      status(`Could not use ${host}: ${msg(e)}`); // one failing source never stops the run
      log({ ...entry, status: 'error', detail: msg(e) });
    }
  }
  return ids;
}

interface Extraction { source_title: string; source_type: string; published_date: string; notes: CandidateNote[] }

async function extract(task: Task, page: Page, notes: Note[]): Promise<Extraction> {
  const titles = notes.filter(n => n.type !== 'Source').map(n => `${n.type}: ${n.title}${n.company ? ` (${n.company})` : ''}`).join('\n');
  return callJSON<Extraction>({
    name: 'extract',
    maxTokens: 6000,
    system: 'You extract facts about the Malaysian car market from one web page into atomic knowledge-graph notes. Rules:\n' +
      '- Only facts stated on the page. Never add facts from memory.\n' +
      '- Only facts that clearly apply to Malaysia (RM prices, Malaysian outlets, a .my or Malaysia page). If the page is about another country (e.g. USD prices, US-only offers), return no notes.\n' +
      '- evidence_snippet must be copied character-for-character from the page text: one contiguous span, 20–300 characters.\n' +
      '- Note types: Company (a brand\'s Malaysian operation), Product (a model), Price (one model\'s price in Malaysia, title "<model> price (MY)"), Campaign (a promotion), Event (a motor show).\n' +
      '- No notes about people, employees or general statistics.\n' +
      '- Reuse the exact title of an existing note when the page talks about the same thing.\n' +
      `- Links use these relations: ${RELATIONS.join(', ')}; to_title names an existing note or another note you return.`,
    prompt: `Task: ${task.title} (${task.company ?? 'any company'}, ${task.note_type ?? 'any type'})\n\nExisting notes:\n${titles}\n\n` +
      `Page URL: ${page.url}\nPage title: ${page.title}\nPage text:\n"""\n${page.text.slice(0, 24_000)}\n"""`,
    schema: { type: 'object', required: ['source_title', 'source_type', 'published_date', 'notes'], properties: {
      source_title: { type: 'string', description: 'publisher — headline' },
      source_type: { type: 'string', enum: ['official_site', 'news', 'social'] },
      published_date: { type: 'string', description: 'YYYY-MM-DD, YYYY-MM or YYYY as shown on the page; empty if absent' },
      notes: { type: 'array', items: { type: 'object', required: ['type', 'title', 'company', 'body_md', 'claims', 'links'], properties: {
        type: { type: 'string', enum: CONTENT_TYPES },
        title: { type: 'string' },
        company: { type: 'string', description: 'the car brand this note is about, e.g. "Tesla" — never a bank, dealer or media outlet; empty for events' },
        body_md: { type: 'string', description: 'one or two sentences summarising the claims' },
        claims: { type: 'array', items: { type: 'object', required: ['text', 'evidence_snippet'], properties: {
          text: { type: 'string' }, evidence_snippet: { type: 'string' } } } },
        links: { type: 'array', items: { type: 'object', required: ['relation', 'to_title'], properties: {
          relation: { type: 'string', enum: RELATIONS }, to_title: { type: 'string' } } } },
      } } },
    } },
  });
}

/** Keeps a claim only if its snippet is in the fetched text and supports the claim. */
async function validate(cands: CandidateNote[], page: Page, published: string): Promise<CandidateNote[]> {
  const flat = cands.flatMap((n, i) => n.claims.filter(c => snippetFound(c.evidence_snippet, page.text)).map(c => ({ i, c })));
  if (!flat.length) return [];
  const r = await callJSON<{ supported: boolean[] }>({
    model: MODELS.fast,
    name: 'judge',
    system: 'For each numbered claim, answer whether its evidence snippet alone supports the claim. Be strict.',
    prompt: flat.map(({ c }, k) => `${k + 1}. Claim: ${c.text}\n   Snippet: ${c.evidence_snippet}`).join('\n'),
    schema: { type: 'object', required: ['supported'], properties: { supported: { type: 'array', items: { type: 'boolean' } } } },
  });
  const year = parseInt(published.slice(0, 4), 10);
  const stale = !!year && year < new Date().getFullYear() - 1;
  const keep = cands.map(n => ({ ...n, claims: [] as CandidateNote['claims'] }));
  flat.forEach(({ i, c }, k) => { if (r.supported[k]) keep[i].claims.push({ ...c, status: stale ? 'stale' : 'verified' }); });
  return keep.filter(n => n.claims.length); // a note with zero claims is not saved
}

/* ---------- Answerer / Reporter ---------- */

async function answer(question: string, mode: Run['mode'], context: Note[], notes: Note[]): Promise<Answer> {
  const byId = new Map(notes.map(n => [n.id, n]));
  const lines = context.map(n => [`NOTE ${n.type} · ${n.title}${n.company ? ` · ${n.company}` : ''}`,
    ...n.claims.map(c => `  [${c.id}] (${c.status}) ${c.text} — source: ${byId.get(c.source_id)?.title ?? '?'} (${byId.get(c.source_id)?.published_date || 'undated'})`)].join('\n'));
  const sentence = { type: 'object', required: ['text', 'cites'], properties: {
    text: { type: 'string' }, cites: { type: 'array', items: { type: 'string' }, description: 'claim ids in square brackets from the notes' },
    inference: { type: 'boolean', description: 'true when this is your judgment drawn from the cited claims rather than a stated fact' } } };
  const a = await callJSON<Answer>({
    name: 'answer',
    maxTokens: 4000,
    system: 'You answer a Malaysian car dealership owner using ONLY the claims provided. Every sentence must cite one or more claim ids in its cites field (not in the text). ' +
      'Mark judgments as inference and still cite the claims they rest on. Say when claims are conflicting or stale. ' +
      'Anything the claims do not cover goes in not_found — never fill gaps from memory. Plain, short sentences. ' +
      (mode === 'report'
        ? 'Write a competitor brief: title, lead = one-sentence recommendation, one section per company covered, then a "Risks to watch" section.'
        : 'Write a short answer: title = the question in a few words, lead = the direct answer, then one section of supporting sentences.'),
    prompt: `Question: ${question}\n\nNotes and claims:\n${lines.join('\n\n')}`,
    schema: { type: 'object', required: ['title', 'lead', 'sections', 'not_found'], properties: {
      title: { type: 'string' }, lead: sentence,
      sections: { type: 'array', items: { type: 'object', required: ['sentences'], properties: { heading: { type: 'string' }, sentences: { type: 'array', items: sentence } } } },
      not_found: { type: 'array', items: { type: 'string' } } } },
  });
  return enforceCitations(a, new Set(context.flatMap(n => n.claims.map(c => c.id))));
}

/** Drops cites to claims that weren't retrieved and sentences left with none. */
export function enforceCitations(a: Answer, ids: Set<string>): Answer {
  const fix = (s: Sentence): Sentence | null => {
    const cites = [...new Set((s.cites ?? []).map(c => c.replace(/[[\]]/g, '')).filter(c => ids.has(c)))];
    // Chips show the sources, so drop any ids the model wrote into the text.
    const text = s.text.replace(/\s*\[[a-z0-9_.]+\]/gi, '').trim();
    return cites.length ? { ...s, text, cites } : null;
  };
  const sections = a.sections.map(s => ({ ...s, sentences: s.sentences.map(fix).filter((x): x is Sentence => !!x) })).filter(s => s.sentences.length);
  let lead = fix(a.lead);
  if (!lead) lead = sections[0]?.sentences.shift() ?? { text: NOT_FOUND, cites: [] };
  const out = { ...a, lead, sections: sections.filter(s => s.sentences.length), not_found: a.not_found ?? [] };
  if (answerProblems(out, ids).length) throw new Error('Answer failed the citation check');
  return out;
}
