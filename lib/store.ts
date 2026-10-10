/* SQLite storage: notes, claims, links, sources, runs and a cache for every external call.
   On Vercel the file lives in /tmp, so research added there lasts only as long as the instance. */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SEED_DATE, SEED_NOTES, SEED_RUNS, SEED_SOURCES } from './seed.ts';
import type { Claim, ClaimStatus, Note, NoteType, Run } from './types.ts';

type DB = Database.Database;

const SCHEMA = `
create table if not exists notes(id text primary key, type text not null, title text not null,
  company text not null default '', body_md text not null default '',
  created_at text not null, updated_at text not null, last_verified_at text not null);
create table if not exists sources(id text primary key references notes(id), url text not null unique,
  source_type text not null default 'news', published_date text not null default '',
  fetched_at text not null, cached_text text);
create table if not exists claims(id text primary key, note_id text not null references notes(id),
  text text not null, source_id text not null references sources(id),
  evidence_snippet text not null, status text not null);
create table if not exists links(from_id text not null, to_id text not null, relation text not null,
  primary key(from_id, to_id, relation));
create table if not exists runs(id text primary key, created_at text not null, data text not null);
create table if not exists cache(key text primary key, value text not null, created_at text not null);
`;

export function openDb(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  if (!(db.prepare('select count(*) n from notes').get() as { n: number }).n) seed(db);
  return db;
}

const g = globalThis as unknown as { insightDb?: DB };
export function getDb(): DB {
  if (!g.insightDb) {
    const file = process.env.DB_PATH || (process.env.VERCEL ? '/tmp/insight.db' : path.join(process.cwd(), 'data', 'insight.db'));
    g.insightDb = openDb(file);
  }
  return g.insightDb;
}

export const now = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

function seed(db: DB) {
  const t = SEED_DATE;
  db.transaction(() => {
    for (const s of SEED_SOURCES) {
      insertNote(db, { id: s.id, type: 'Source', title: s.title, company: s.company, body_md: '' }, t);
      db.prepare('insert into sources values (?,?,?,?,?,null)').run(s.id, s.url, s.type, s.published, t);
    }
    for (const n of SEED_NOTES) insertNote(db, { id: n.id, type: n.type, title: n.title, company: n.company, body_md: n.body }, t);
    for (const n of SEED_NOTES) {
      n.claims.forEach(([text, src, ev, st], i) =>
        db.prepare('insert into claims values (?,?,?,?,?,?)').run(`${n.id}.${i + 1}`, n.id, text, src, ev, st));
      for (const [rel, to] of n.links) addLink(db, n.id, to, rel, false);
    }
    for (const r of SEED_RUNS) {
      const run: Run = { id: r.id, question: r.question, mode: r.mode, created_at: t, example: true, tasks: [], answer: r.answer, new_note_ids: [] };
      db.prepare('insert into runs values (?,?,?)').run(r.id, t, JSON.stringify(run));
    }
  })();
}

function insertNote(db: DB, n: { id: string; type: NoteType; title: string; company: string; body_md: string }, t = now()) {
  db.prepare('insert into notes values (?,?,?,?,?,?,?,?)').run(n.id, n.type, n.title, n.company, n.body_md, t, t, t);
}

const INVERSE: Record<string, string> = {
  makes: 'made_by', made_by: 'makes', has_price: 'price_of', price_of: 'has_price', runs: 'run_by', run_by: 'runs',
  promotes: 'promoted_by', promoted_by: 'promotes', competes_with: 'competes_with', attends: 'involves', involves: 'attends',
};
function addLink(db: DB, from: string, to: string, rel: string, withInverse = true) {
  if (from === to) return;
  db.prepare('insert or ignore into links values (?,?,?)').run(from, to, rel);
  if (withInverse && INVERSE[rel]) db.prepare('insert or ignore into links values (?,?,?)').run(to, from, INVERSE[rel]);
}

/* ---------- reads ---------- */

export function allNotes(db = getDb()): Note[] {
  const notes = db.prepare('select * from notes order by created_at, rowid').all() as Note[];
  const claims = db.prepare('select * from claims order by rowid').all() as Claim[];
  const links = db.prepare('select * from links order by rowid').all() as { from_id: string; to_id: string; relation: string }[];
  const sources = db.prepare('select id, url, source_type, published_date, fetched_at, cached_text is not null as has_cache from sources').all() as
    { id: string; url: string; source_type: string; published_date: string; fetched_at: string; has_cache: number }[];
  const byId = new Map(notes.map(n => [n.id, Object.assign(n, { claims: [] as Claim[], links: [] as Note['links'] })]));
  for (const c of claims) byId.get(c.note_id)?.claims.push(c);
  for (const l of links) byId.get(l.from_id)?.links.push({ to: l.to_id, relation: l.relation });
  for (const s of sources) {
    const n = byId.get(s.id);
    if (n) Object.assign(n, { url: s.url, source_type: s.source_type, published_date: s.published_date, fetched_at: s.fetched_at, has_cache: !!s.has_cache });
  }
  return notes;
}

export function sourceText(id: string, db = getDb()): string | null {
  const r = db.prepare('select cached_text from sources where id = ?').get(id) as { cached_text: string | null } | undefined;
  return r?.cached_text ?? null;
}

export function listRuns(db = getDb()): Run[] {
  return (db.prepare('select data from runs order by created_at desc').all() as { data: string }[]).map(r => JSON.parse(r.data));
}
export function saveRun(run: Run, db = getDb()) {
  db.prepare('insert or replace into runs values (?,?,?)').run(run.id, run.created_at, JSON.stringify(run));
}

/* ---------- cache for search results, fetched pages and model calls ---------- */

export const hashKey = (...parts: unknown[]) => crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32);

/** Cache-first wrapper. With DEMO_MODE=1 nothing external is called: a cache miss throws. */
export async function cached<T>(key: string, fn: () => Promise<T>, db = getDb()): Promise<T> {
  const hit = db.prepare('select value from cache where key = ?').get(key) as { value: string } | undefined;
  if (hit) return JSON.parse(hit.value);
  if (process.env.DEMO_MODE === '1') throw new Error('Demo mode: not in cache');
  const value = await fn();
  db.prepare('insert or replace into cache values (?,?,?)').run(key, JSON.stringify(value), now());
  return value;
}

/* ---------- graph writer ---------- */

export interface CandidateNote {
  type: Exclude<NoteType, 'Source'>;
  title: string;
  company: string;
  body_md: string;
  claims: { text: string; evidence_snippet: string; status?: ClaimStatus }[];
  links: { relation: string; to_title: string }[];
}
export interface SourceInput { url: string; title: string; source_type: string; published_date: string; cached_text: string; company: string }

const norm = (s: string) => s.toLowerCase().replace(/\b(sdn bhd|malaysia|berhad|motor|price \(my\))\b/g, '').replace(/[^a-z0-9]/g, '');

/** Finds the note a candidate refers to: one note per real-world thing. */
export function findExisting(c: { type: string; title: string; company: string }, notes: Note[]): Note | undefined {
  const t = norm(c.title), co = c.company.toLowerCase();
  const sameCo = (n: Note) => !co || !n.company || n.company.toLowerCase() === co;
  if (c.type === 'Company') {
    const hit = notes.find(n => n.type === 'Company' && co && n.company.toLowerCase() === co);
    if (hit) return hit;
  }
  // Same type and same title is the same thing whatever company was guessed; looser matches need the same company.
  return notes.find(n => n.type === c.type && norm(n.title) === t) ?? notes.find(n => n.type === c.type && sameCo(n) &&
    t.length >= 4 && norm(n.title).length >= 4 && (norm(n.title).includes(t) || t.includes(norm(n.title))));
}

const ID_PREFIX: Record<string, string> = { Company: 'c', Product: 'p', Price: 'pr', Campaign: 'cm', Event: 'e' };

const amounts = (s: string) => new Set([...s.matchAll(/RM\s?([\d,]{3,})/gi)].map(m => m[1].replace(/,/g, '')));

/** Saves validated candidates from one source. Merges into existing notes instead of duplicating;
    notes left with zero claims are not saved. Returns ids of notes created or changed. */
export function writeNotes(source: SourceInput, candidates: CandidateNote[], db = getDb()): { created: string[]; updated: string[]; source_id?: string } {
  const created: string[] = [], updated: string[] = [];
  let sourceId: string | undefined;
  db.transaction(() => {
    const notes = allNotes(db);
    let src = notes.find(n => n.type === 'Source' && n.url === source.url);
    const t = now();
    const ensureSource = () => {
      if (src) {
        db.prepare('update sources set cached_text = ?, fetched_at = ? where id = ?').run(source.cached_text, t, src.id);
        return src.id;
      }
      const id = newId('s');
      insertNote(db, { id, type: 'Source', title: source.title, company: source.company, body_md: '' }, t);
      db.prepare('insert into sources values (?,?,?,?,?,?)').run(id, source.url, source.source_type, source.published_date, t, source.cached_text);
      src = { id } as Note;
      created.push(id);
      return id;
    };

    const touched: { note: Note | { id: string }; cand: CandidateNote }[] = [];
    for (const cand of candidates) {
      if (!cand.claims.length) continue;
      const srcId = sourceId = ensureSource();
      const existing = findExisting(cand, notes);
      let noteId: string;
      if (existing) {
        noteId = existing.id;
        const known = new Set(existing.claims.map(c => norm(c.evidence_snippet) + '|' + c.source_id));
        const fresh = cand.claims.filter(c => !known.has(norm(c.evidence_snippet) + '|' + srcId));
        for (const c of fresh) insertClaim(db, noteId, c, srcId, existing);
        db.prepare('update notes set updated_at = ?, last_verified_at = ? where id = ?').run(t, t, noteId);
        if (fresh.length && !updated.includes(noteId)) updated.push(noteId);
        existing.claims = (db.prepare('select * from claims where note_id = ?').all(noteId) as Claim[]);
      } else {
        noteId = newId(ID_PREFIX[cand.type]);
        insertNote(db, { id: noteId, type: cand.type, title: cand.title, company: cand.company, body_md: cand.body_md }, t);
        for (const c of cand.claims) insertClaim(db, noteId, c, srcId);
        const fresh: Note = { id: noteId, type: cand.type, title: cand.title, company: cand.company, body_md: cand.body_md,
          created_at: t, updated_at: t, last_verified_at: t, claims: db.prepare('select * from claims where note_id = ?').all(noteId) as Claim[], links: [] };
        notes.push(fresh);
        created.push(noteId);
      }
      touched.push({ note: { id: noteId }, cand });
    }
    // Links resolve against titles after every candidate from this source is in place.
    for (const { note, cand } of touched) {
      for (const l of cand.links) {
        const target = notes.find(n => n.type !== 'Source' && norm(n.title) === norm(l.to_title)) ?? notes.find(n => n.type === 'Company' && norm(n.company) === norm(l.to_title));
        if (target) addLink(db, note.id, target.id, l.relation);
      }
    }
  })();
  return { created, updated, source_id: sourceId };
}

function insertClaim(db: DB, noteId: string, c: CandidateNote['claims'][number], srcId: string, existing?: Note) {
  let status: ClaimStatus = c.status ?? 'verified';
  // Two prices for the same thing: keep both, mark both conflicting.
  if (existing?.type === 'Price') {
    const mine = amounts(c.text);
    for (const o of existing.claims) {
      const theirs = amounts(o.text);
      if (o.source_id !== srcId && mine.size && theirs.size && ![...mine].some(a => theirs.has(a))) {
        status = 'conflicting';
        db.prepare("update claims set status = 'conflicting' where id = ?").run(o.id);
      }
    }
  }
  db.prepare('insert into claims values (?,?,?,?,?,?)').run(newId('c'), noteId, c.text, srcId, c.evidence_snippet, status);
}

/* ---------- Markdown export with [[wikilinks]] ---------- */

export function notesMarkdown(db = getDb()): string {
  const notes = allNotes(db);
  const byId = new Map(notes.map(n => [n.id, n]));
  return notes.map(n => {
    const lines = [`## ${n.title}`, `type: ${n.type}${n.company ? ` · company: ${n.company}` : ''}`];
    if (n.url) lines.push(`url: ${n.url}`);
    if (n.body_md) lines.push('', n.body_md);
    for (const c of n.claims) lines.push(`- ${c.text} (${c.status}) — [[${byId.get(c.source_id)?.title ?? c.source_id}]]: “${c.evidence_snippet}”`);
    for (const l of n.links) lines.push(`- ${l.relation} → [[${byId.get(l.to)?.title ?? l.to}]]`);
    return lines.join('\n');
  }).join('\n\n');
}
