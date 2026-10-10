/* search() and fetchPage(): the only ways the agent touches the web.
   Search uses Claude's web search tool; pages are fetched directly so the validator can check
   evidence against the exact text. robots.txt is honoured, logins and social sites are skipped,
   every call has a timeout, and results are cached. */
import { anthropic, MODELS } from './llm.ts';
import { cached, hashKey } from './store.ts';

const UA = 'InsightResearchBot/0.1 (hackathon demo; respects robots.txt)';
// LinkedIn: official API only, never fetched. Other sites here need logins.
const SKIP = /(^|\.)(linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com)$/i;

export interface SearchHit { url: string; title: string; page_age?: string }

export async function search(query: string): Promise<SearchHit[]> {
  return cached(hashKey('search', query), async () => {
    const msg = await anthropic().messages.create({
      model: MODELS.main,
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2, user_location: { type: 'approximate', country: 'MY' } }],
      messages: [{ role: 'user', content: `Search the web for: ${query}\nPrefer Malaysian official brand pages and Malaysian motoring news. Reply "done" when you have searched.` }],
    }, { timeout: 60_000 });
    const hits: SearchHit[] = [];
    for (const block of msg.content) {
      if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
      for (const r of block.content) if (r.type === 'web_search_result') hits.push({ url: r.url, title: r.title, page_age: r.page_age ?? undefined });
    }
    return hits;
  });
}

export function allowedHost(url: string) {
  try { return !SKIP.test(new URL(url).hostname); } catch { return false; }
}

async function get(url: string, ms: number) {
  return fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,text/plain' }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
}

/** Minimal robots.txt check for our agent and `*`: longest matching Allow/Disallow wins. */
export async function robotsAllows(url: string): Promise<boolean> {
  const u = new URL(url);
  const rules = await cached(hashKey('robots', u.origin), async () => {
    try {
      const res = await get(`${u.origin}/robots.txt`, 8000);
      return res.ok ? await res.text() : '';
    } catch { return ''; }
  });
  const groups: { agents: string[]; lines: [string, string][] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  for (const raw of rules.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') {
      if (!cur || cur.lines.length) groups.push(cur = { agents: [], lines: [] });
      cur.agents.push(v.toLowerCase());
    } else if (cur && (k === 'allow' || k === 'disallow')) cur.lines.push([k, v]);
  }
  const mine = groups.filter(g => g.agents.some(a => a !== '*' && UA.toLowerCase().includes(a)));
  const lines = (mine.length ? mine : groups.filter(g => g.agents.includes('*'))).flatMap(g => g.lines);
  const p = u.pathname + u.search;
  let best: [string, string] | null = null;
  for (const [k, v] of lines) {
    if (!v) continue;
    const re = new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(p) && (!best || v.length > best[1].length || (v.length === best[1].length && k === 'allow'))) best = [k, v];
  }
  return !best || best[0] === 'allow';
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(parseInt(e.slice(e[1] === 'x' || e[1] === 'X' ? 2 : 1), e[1] === 'x' || e[1] === 'X' ? 16 : 10)) : ENT[e.toLowerCase()] ?? m)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export interface Page { url: string; title: string; text: string }

/** Fetches a public page as text. Never throws: returns { error } when skipped, blocked by robots.txt or broken. */
export async function fetchPage(url: string): Promise<Page | { error: string }> {
  if (!allowedHost(url)) return { error: 'skipped: login or social site' };
  try {
    if (!(await robotsAllows(url))) return { error: 'blocked by robots.txt' };
    return await cached(hashKey('page', url), async () => {
      const res = await get(url, 15_000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (!/html|text\/plain/.test(type)) throw new Error(`unsupported ${type}`);
      const html = (await res.text()).slice(0, 1_500_000);
      const title = htmlToText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url).slice(0, 200);
      return { url: res.url || url, title, text: htmlToText(html).slice(0, 200_000) };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
