/* Automated checks (npm run check):
   1. graph integrity — every claim cites an existing source, no dangling links, no claimless notes,
      every evidence snippet is found in its source's cached text (when a cached copy exists);
   2. every answer/report sentence has a citation and every cited claim exists;
   3. duplicate test — writing the same fixture twice does not create duplicate notes. */
import path from 'node:path';
import { allNotes, listRuns, openDb, sourceText, writeNotes } from '../lib/store.ts';
import { answerProblems, graphProblems } from '../lib/checks.ts';

let failed = 0;
const report = (name: string, errors: string[], warnings: string[] = []) => {
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${name}${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
  for (const e of errors.slice(0, 20)) console.log('     ✗', e);
  if (process.argv.includes('-v')) for (const w of warnings) console.log('     !', w);
  failed += errors.length;
};

const db = openDb(process.env.DB_PATH || path.join(process.cwd(), 'data', 'insight.db'));
const notes = allNotes(db);
const g = graphProblems(notes, id => sourceText(id, db));
report(`graph integrity: ${notes.length} notes`, g.errors, g.warnings);

const ids = new Set(notes.flatMap(n => n.claims.map(c => c.id)));
const runs = listRuns(db).filter(r => r.answer);
report(`citations in ${runs.length} answers/reports`, runs.flatMap(r => answerProblems(r.answer!, ids).map(p => `${r.id}: ${p}`)));

// Fixture data is deliberately fake.
const mem = openDb(':memory:');
const fixtureSource = { url: 'https://example.invalid/fixture', title: 'FIXTURE — not a real page', source_type: 'news', published_date: '2099-01-01',
  cached_text: 'FIXTURE TEXT: Zzyzx Test Motors sells the Fakecar 9000 at RM1,234 in this fixture.', company: 'Zzyzx Test Motors' };
const fixture = [
  { type: 'Company' as const, title: 'Zzyzx Test Motors', company: 'Zzyzx Test Motors', body_md: 'Fixture company.', links: [{ relation: 'makes', to_title: 'Fakecar 9000' }],
    claims: [{ text: 'Zzyzx Test Motors sells the Fakecar 9000.', evidence_snippet: 'Zzyzx Test Motors sells the Fakecar 9000' }] },
  { type: 'Product' as const, title: 'Fakecar 9000', company: 'Zzyzx Test Motors', body_md: 'Fixture product.', links: [],
    claims: [{ text: 'The Fakecar 9000 costs RM1,234.', evidence_snippet: 'Fakecar 9000 at RM1,234' }] },
];
const before = allNotes(mem).length;
writeNotes(fixtureSource, fixture, mem);
const once = allNotes(mem).length;
writeNotes(fixtureSource, fixture, mem);
const twice = allNotes(mem);
const dup = [];
if (once !== before + 3) dup.push(`first write should add 3 notes (2 + source), added ${once - before}`);
if (twice.length !== once) dup.push(`second write added ${twice.length - once} duplicate notes`);
if (twice.find(n => n.title === 'Fakecar 9000')!.claims.length !== 1) dup.push('second write duplicated a claim');
report('duplicate test: same fixture researched twice', dup);

process.exit(failed ? 1 : 0);
