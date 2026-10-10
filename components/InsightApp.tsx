'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import GraphView from './GraphView';
import { citedSources, toMarkdown } from '@/lib/cite';
import type { AgentEvent, Answer, Claim, Note, Run, Sentence, Task } from '@/lib/types';

type View = 'chat' | 'graph' | 'report' | 'sources';
interface Live { question: string; mode: Run['mode']; tasks: Task[]; step: string; run?: Run; error?: string; running: boolean }

const SUGGESTIONS = [
  'How is BYD pricing against Toyota hybrids?',
  'What did Perodua change on the QV-E this year?',
  'Which brands are running promotions right now?',
  'Mercedes-Benz',
];
const ALL_COMPANIES_REPORT = 'Competitor brief on Toyota, Mercedes-Benz and Tesla in Malaysia: prices, models and current promotions';

const Ava = () => (
  <span className="ava"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0" /><circle cx="12" cy="15" r="2.6" fill="#fff" /></svg></span>
);
const Warn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
);
const Send = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const NAV: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'chat', label: 'Chat', icon: <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-5A8 8 0 1 1 21 12z" /> },
  { view: 'graph', label: 'Knowledge graph', icon: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="10" cy="18" r="2.5" /><path d="M8.2 7l7.4 1M7 8.3l2.3 7.4M16.6 10l-4.8 6.3" /></> },
  { view: 'report', label: 'Reports', icon: <><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></> },
  { view: 'sources', label: 'Sources', icon: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></> },
];

function Composer({ onAsk, autoFocus }: { onAsk: (q: string) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  return (
    <form className="composer" onSubmit={e => { e.preventDefault(); if (q.trim()) { onAsk(q.trim()); setQ(''); } }}>
      <label htmlFor="ask" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Ask Insight</label>
      <input id="ask" type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus={autoFocus} autoComplete="off"
        placeholder="Ask about a competitor, a model or a price move…" />
      <button className="send" type="submit" aria-label="Send"><Send /></button>
    </form>
  );
}

export default function InsightApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [view, setView] = useState<View>('chat');
  const [chat, setChat] = useState<string>('new'); // run id, 'new' or 'live'
  const [reportId, setReportId] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const loadNotes = useCallback(async () => setNotes((await (await fetch('/api/graph')).json()).notes), []);
  const loadRuns = useCallback(async () => {
    const r: Run[] = (await (await fetch('/api/runs')).json()).runs;
    setRuns(r);
    return r;
  }, []);
  useEffect(() => {
    loadNotes();
    loadRuns().then(r => setChat(c => (c === 'new' ? r.find(x => x.mode === 'answer')?.id ?? 'new' : c)));
  }, [loadNotes, loadRuns]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); } }, [toast]);

  const byId = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes]);
  const claims = useMemo(() => new Map(notes.flatMap(n => n.claims.map(c => [c.id, c] as [string, Claim]))), [notes]);
  const sources = notes.filter(n => n.type === 'Source');
  const companies = notes.filter(n => n.type === 'Company').map(n => n.company);

  const openSource = (id: string) => { setSelected(id); setView('graph'); };
  const openRun = (r: Run) => {
    if (r.mode === 'report') { setReportId(r.id); setView('report'); } else { setChat(r.id); setView('chat'); }
  };

  async function ask(question: string, mode: Run['mode'] = 'answer') {
    if (live?.running) { setToast('The agent is still working on the last question.'); return; }
    const state: Live = { question, mode, tasks: [], step: 'Starting', running: true };
    setLive(state); setChat('live'); setView('chat');
    const update = (p: Partial<Live>) => setLive(l => (l ? { ...l, ...p } : l));
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, mode }) });
      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).replace(/^data: /, '');
          buf = buf.slice(i + 2);
          const e = JSON.parse(line) as AgentEvent;
          if (e.type === 'step') update({ step: e.label });
          else if (e.type === 'tasks') update({ tasks: e.tasks });
          else if (e.type === 'notes') { await loadNotes(); setFresh(new Set(e.ids)); setTimeout(() => setFresh(new Set()), 9000); }
          else if (e.type === 'error') update({ error: e.message });
          else if (e.type === 'answer') {
            update({ run: e.run });
            await Promise.all([loadNotes(), loadRuns()]);
            if (mode === 'report') { setReportId(e.run.id); setView('report'); }
          }
        }
      }
    } catch (e) {
      update({ error: e instanceof Error ? e.message : String(e) });
    }
    update({ running: false });
  }

  const chatRun = chat !== 'new' && chat !== 'live' ? runs.find(r => r.id === chat) : undefined;
  const reportRun = runs.find(r => r.id === reportId) ?? runs.find(r => r.mode === 'report');
  const title = chat === 'live' && live ? live.question : chatRun?.answer?.title ?? 'New question';

  const Chips = ({ s, order }: { s: Sentence; order: string[] }) => {
    const bySrc = new Map<string, Claim[]>();
    for (const id of s.cites) { const c = claims.get(id); if (c) bySrc.set(c.source_id, [...(bySrc.get(c.source_id) ?? []), c]); }
    return <>{[...bySrc].map(([src, cs]) => (
      <button key={src} className={`cite${cs.some(c => c.status !== 'verified') ? ' w' : ''}`} onClick={() => openSource(src)}
        title={`${byId.get(src)?.title ?? src}${cs.some(c => c.status !== 'verified') ? ` — ${cs.map(c => c.status).join(', ')}` : ''}`}>
        {order.indexOf(src) + 1}
      </button>
    ))}{cs(s).some(c => c.status === 'conflicting') && <span className="flag conf">conflicting</span>}</>;
  };
  const cs = (s: Sentence) => s.cites.map(id => claims.get(id)).filter((c): c is Claim => !!c);
  const Line = ({ s, order }: { s: Sentence; order: string[] }) => (
    <>{s.inference && <span className="flag inf" style={{ marginLeft: 0, marginRight: 6 }}>Inference</span>}{s.text}<Chips s={s} order={order} /></>
  );

  const AnswerCard = ({ a, run }: { a: Answer; run?: Run }) => {
    const order = citedSources(a, claims);
    const flagged = [a.lead, ...a.sections.flatMap(x => x.sentences)].flatMap(cs).filter(c => c.status !== 'verified');
    return (
      <article className="card ans">
        <div className="cap">Short answer</div>
        <p className="lead"><Line s={a.lead} order={order} /></p>
        {a.sections.map((sec, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sec.heading && <div className="cap">{sec.heading}</div>}
            {sec.sentences.map((s, j) => <p key={j}><Line s={s} order={order} /></p>)}
          </div>
        ))}
        {a.not_found.length > 0 && <div className="nf"><b>Not found in the sources read:</b><ul>{a.not_found.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {flagged.length > 0 && (
          <div className="callout"><Warn /><span>{flagged.length} cited claim{flagged.length === 1 ? ' is' : 's are'} marked conflicting or stale — orange chips. Check them before acting.</span></div>
        )}
        <div className="acts">
          {run && <button className="btn pri" onClick={() => ask(run.question, 'report')}>Turn into report</button>}
          <button className="btn" onClick={() => { const first = order[0]; setSelected(first ? claims.get(a.lead.cites[0])?.note_id ?? null : null); setView('graph'); }}>See it on the graph</button>
        </div>
      </article>
    );
  };

  const Plan = ({ tasks, step, state }: { tasks: Task[]; step?: string; state: 'run' | 'done' | 'fail' | 'example' }) => (
    <div className="card plan">
      <div className="top">
        <div className="who"><Ava />{state === 'example' ? 'Example run from the demo graph' : `Agent plan · ${tasks.length} task${tasks.length === 1 ? '' : 's'}`}</div>
        <div className={`state${state === 'run' ? ' run' : state === 'fail' ? ' fail' : ''}`}>{state === 'run' ? 'Working' : state === 'fail' ? 'Stopped' : 'Done'}</div>
      </div>
      {tasks.length > 0 && (
        <ol className="tasks">
          {tasks.map(t => (
            <li key={t.id}><span className={`tdot ${t.status}`} aria-label={t.status} />
              <span><span className="tt">{t.title}</span>{t.detail && <span className="dt" style={{ display: 'block' }}>{t.detail}</span>}</span></li>
          ))}
        </ol>
      )}
      {state === 'run' && step && <div className="stepline"><span className="tdot running" />{step}…</div>}
    </div>
  );

  const Rail = ({ a }: { a: Answer }) => {
    const order = citedSources(a, claims);
    return (
      <aside className="rail" aria-label="Sources used">
        <div className="cap">Sources used</div>
        {order.map((id, i) => {
          const s = byId.get(id);
          return (
            <button key={id} className="src-card" onClick={() => openSource(id)}>
              <span className="no">{i + 1}</span>
              <span><span className="tt">{s?.title ?? id}</span><br /><span className="st">{s?.source_type} · {s?.published_date || 'undated'}</span></span>
            </button>
          );
        })}
      </aside>
    );
  };

  let thread: React.ReactNode;
  if (chat === 'live' && live) {
    const r = live.run;
    thread = (
      <div className="chat-wrap">
        <section className="thread" aria-label="Conversation">
          <div className="u-msg">{live.question}</div>
          <Plan tasks={live.tasks} step={live.step} state={live.running ? 'run' : live.error ? 'fail' : 'done'} />
          {live.error && <div className="err">{live.error}{/ANTHROPIC_API_KEY/.test(live.error) ? ' — add the key to .env.local (or the Vercel project settings) to run the live agent. The demo graph and example runs still work.' : ''}</div>}
          {r?.answer && <AnswerCard a={r.answer} run={r} />}
          <Composer onAsk={q => ask(q)} />
        </section>
        {r?.answer && <Rail a={r.answer} />}
      </div>
    );
  } else if (chatRun?.answer) {
    thread = (
      <div className="chat-wrap">
        <section className="thread" aria-label="Conversation">
          <div className="u-msg">{chatRun.question}</div>
          <Plan tasks={chatRun.tasks} state={chatRun.example ? 'example' : 'done'} />
          <AnswerCard a={chatRun.answer} run={chatRun} />
          <Composer onAsk={q => ask(q)} />
        </section>
        <Rail a={chatRun.answer} />
      </div>
    );
  } else {
    thread = (
      <div className="chat-wrap">
        <section className="thread" aria-label="New conversation">
          <div className="card blank">
            <div className="cap">New question</div>
            <h2>What do you want to know about your competitors?</h2>
            <p>Ask about a brand, a model, a price move or a whole strategy. The agent plans the research, checks the graph first, reads public sources for anything missing, and answers with a source on every claim.</p>
            <div className="sugs">{SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}</div>
          </div>
          <Composer onAsk={q => ask(q)} autoFocus />
        </section>
      </div>
    );
  }

  const report = reportRun?.answer;
  const reportOrder = report ? citedSources(report, claims) : [];
  const md = report ? toMarkdown(report, claims, byId) : '';

  return (
    <div className="app">
      <nav className="side" aria-label="Main">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/insight-logo.png" alt="Insight" width={168} height={56} style={{ width: 168, height: 'auto' }} />
        </div>
        <button className="newq" onClick={() => { setChat('new'); setView('chat'); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          New question
        </button>
        <div className="nav">
          {NAV.map(n => (
            <button key={n.view} aria-current={view === n.view ? 'page' : undefined} onClick={() => setView(n.view)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{n.icon}</svg>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <div className="recent">
          <div className="cap">Recent</div>
          {runs.slice(0, 8).map(r => (
            <button key={r.id} aria-current={(r.mode === 'answer' ? chat === r.id && view === 'chat' : reportRun?.id === r.id && view === 'report') || undefined} onClick={() => openRun(r)}>
              {r.mode === 'report' ? 'Report · ' : ''}{r.answer?.title ?? r.question}
            </button>
          ))}
        </div>
        <div className="market">
          <div className="cap">Market</div>
          <div className="v">Malaysia · Automotive</div>
          <div className="s">{companies.join(' · ')}</div>
        </div>
        <div className="ingest">{notes.length - sources.length} notes · {sources.length} sources · <a href="/api/export">export notes (.md)</a></div>
      </nav>

      <main className="main">
        <section className="view" hidden={view !== 'chat'}>
          <header className="hd">
            <div>
              <h1>{title}</h1>
              <div className="sub">{chat === 'new' ? 'Ask anything. Every answer is built from cited sources.' : chatRun?.example ? 'Example run on the demo graph' : 'Answered from the knowledge graph'}</div>
            </div>
            <div className="pills" role="tablist" aria-label="View">
              <button role="tab" aria-selected="true">Chat</button>
              <button role="tab" aria-selected="false" onClick={() => setView('graph')}>Graph</button>
            </div>
          </header>
          {thread}
          <p className="foot-note">Demo graph gathered from public Malaysian sources on 10 Oct 2026; its extracts were condensed, not copied verbatim. Notes the live agent adds carry exact snippets checked against the fetched page. Prices change often — confirm with the brand before acting.</p>
        </section>

        <section className="view" hidden={view !== 'graph'}>
          {notes.length > 0 && <GraphView notes={notes} selected={selected} onSelect={setSelected} fresh={fresh} />}
        </section>

        <section className="view" hidden={view !== 'report'}>
          <header className="hd">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--mut)' }}>
              <span>Reports</span><span aria-hidden="true">/</span><span style={{ color: 'var(--ink)', fontWeight: 600 }}>{report?.title ?? 'None yet'}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn" disabled={!report} onClick={() => navigator.clipboard.writeText(md).then(() => setToast('Report Markdown copied'), () => setToast('Copy blocked — use Download instead'))}>Copy Markdown</button>
              <a className="btn" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`} download="insight-report.md" aria-disabled={!report}>Download .md</a>
              <button className="btn pri" disabled={live?.running} onClick={() => ask(ALL_COMPANIES_REPORT, 'report')}>New report: all companies</button>
            </div>
          </header>
          {report && reportRun ? (
            <div className="rep-wrap">
              <article className="paper">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="eyebrow">Competitor brief · Malaysia automotive</div>
                  <h1>{report.title}</h1>
                  <div className="byline">Prepared from the knowledge graph · {new Date(reportRun.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {reportOrder.length} sources cited</div>
                </div>
                <section className="reco">
                  <div className="cap">Recommendation</div>
                  <p>{report.lead.text}<Chips s={report.lead} order={reportOrder} /></p>
                  <div className="tagline">{report.lead.inference ? 'Judgment call by the agent — every fact behind it is cited below.' : 'Drawn from the cited claims below.'}</div>
                </section>
                {report.sections.map((sec, i) => (
                  <section className="sec" key={i}>
                    {sec.heading && <h2>{i + 1}. {sec.heading}</h2>}
                    <ul>{sec.sentences.map((s, j) => <li key={j}><Line s={s} order={reportOrder} /></li>)}</ul>
                  </section>
                ))}
                {report.not_found.length > 0 && <section className="sec"><h2>Not found</h2><ul>{report.not_found.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
                <section className="src-sec">
                  <div className="cap">Sources</div>
                  <ol>{reportOrder.map(id => <li key={id}>{byId.get(id)?.title} — <a href={byId.get(id)?.url} target="_blank" rel="noopener noreferrer">{byId.get(id)?.url}</a></li>)}</ol>
                </section>
              </article>
              <aside className="runlog" aria-label="How this report was made">
                <div className="cap">How the agent built this</div>
                {reportRun.tasks.length ? (
                  <div className="list">{reportRun.tasks.map(t => (
                    <div className="it" key={t.id}><span className={`tdot ${t.status}`} /><span>{t.title}{t.detail && <span className="dt" style={{ display: 'block', fontSize: 12, color: 'var(--mut)' }}>{t.detail}</span>}</span></div>
                  ))}</div>
                ) : <div className="note-box">Example report written from the demo graph.</div>}
                <div className="note-box">Every sentence carries a citation chip. Chips open the matching Source note in the graph.</div>
              </aside>
            </div>
          ) : <p className="foot-note" style={{ paddingTop: 26 }}>No report yet.</p>}
        </section>

        <section className="view" hidden={view !== 'sources'}>
          <header className="hd"><div><h1>Sources</h1><div className="sub">{sources.length} source notes</div></div></header>
          <div className="srcs-wrap">
            {sources.map(s => {
              const n = notes.filter(o => o.claims.some(c => c.source_id === s.id)).length;
              return (
                <div className="src-row" key={s.id}>
                  <span className="tt">{s.title}</span>
                  <span className="meta">{s.source_type} · pub {s.published_date || 'undated'} · supports {n} note{n === 1 ? '' : 's'}{s.has_cache ? ' · cached' : ''}</span>
                  <a className="open" href={s.url} target="_blank" rel="noopener noreferrer">Open ↗</a>
                  <button className="ingraph" onClick={() => openSource(s.id)}>View in graph</button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
