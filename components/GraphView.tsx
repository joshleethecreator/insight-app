'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { H, W, layoutGraph } from '@/lib/graphLayout';
import { NOTE_TYPES, type Note, type NoteType } from '@/lib/types';

const RAD: Record<NoteType, number> = { Company: 34, Event: 8, Product: 8, Campaign: 8, Price: 5, Source: 3.5 };
const TYPE_COLOR: Record<NoteType, string> = { Company: '#4A5A7A', Product: '#2456C7', Price: '#17716A', Campaign: '#9A5A0C', Event: '#8A3B55', Source: '#556075' };
const PALETTE = ['#F2CFA5', '#6FD3F5', '#D6A9E0', '#F5D77A', '#B48CF2', '#9EE0B4', '#F5A9A0', '#A9C8F5'];
const SHORT: Record<string, string> = { 'Mercedes-Benz': 'Mercedes' };
const BADGE = { verified: 'Verified', conflicting: 'Conflicting', stale: 'Stale' };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

interface Edge { a: string; b: string; rel: string; src?: boolean }

export default function GraphView({ notes, selected, onSelect, fresh }: {
  notes: Note[]; selected: string | null; onSelect: (id: string | null) => void; fresh: Set<string>;
}) {
  const [types, setTypes] = useState<Set<NoteType>>(new Set(NOTE_TYPES));
  const [company, setCompany] = useState('');
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const canvas = useRef<HTMLElement>(null);

  const byId = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes]);
  const pos = useMemo(() => layoutGraph(notes), [notes]);
  const companies = useMemo(() => notes.filter(n => n.type === 'Company').map(n => n.company), [notes]);
  const color = (n: Note) => n.type === 'Source' ? '#AEB7C6' : n.company && companies.includes(n.company) ? PALETTE[companies.indexOf(n.company) % PALETTE.length] : '#E9B8C0';

  const edges = useMemo(() => {
    const seen = new Set<string>(), out: Edge[] = [];
    const add = (e: Edge) => { const k = [e.a, e.b].sort().join('|') + (e.src ? 's' : ''); if (!seen.has(k)) { seen.add(k); out.push(e); } };
    for (const n of notes) {
      for (const l of n.links) if (byId.has(l.to)) add({ a: n.id, b: l.to, rel: l.relation });
      for (const c of n.claims) if (byId.has(c.source_id)) add({ a: c.source_id, b: n.id, rel: 'supports', src: true });
    }
    return out;
  }, [notes, byId]);

  const nb = useMemo(() => {
    const s = new Set<string>();
    if (selected) for (const e of edges) { if (e.a === selected) s.add(e.b); if (e.b === selected) s.add(e.a); }
    return s;
  }, [edges, selected]);

  const visible = (n: Note) => types.has(n.type) && (!company || n.company === company);

  useEffect(() => {
    const p = selected && pos.get(selected);
    const cv = canvas.current;
    if (p && cv) cv.scrollTo({ left: Math.max(0, p.x - cv.clientWidth / 2), top: Math.max(0, p.y - 300), behavior: 'smooth' });
  }, [selected, pos]);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = notes.find(n => n.title.toLowerCase() === q) ?? notes.find(n => n.title.toLowerCase().includes(q)) ?? notes.find(n => n.company.toLowerCase().includes(q));
    if (hit) { setTypes(new Set(NOTE_TYPES)); setCompany(''); onSelect(hit.id); }
  };

  const counts = Object.fromEntries(NOTE_TYPES.map(t => [t, notes.filter(n => n.type === t).length]));
  const sel = selected ? byId.get(selected) : undefined;
  const hov = hover ? byId.get(hover) : undefined;

  return (
    <>
      <div className="g-head">
        <div className="row">
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Knowledge graph</h1>
            <div className="sub">{notes.length} notes · click any node to trace what it links to</div>
          </div>
          <div className="g-tools">
            <form onSubmit={find} role="search">
              <input list="note-titles" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a note…" aria-label="Find a note" />
              <datalist id="note-titles">{notes.filter(n => n.type !== 'Source').map(n => <option key={n.id} value={n.title} />)}</datalist>
            </form>
            <select value={company} onChange={e => setCompany(e.target.value)} aria-label="Filter by company">
              <option value="">All companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="filters" role="group" aria-label="Note types">
          <span className="cap">Show</span>
          {NOTE_TYPES.map(t => (
            <button key={t} className="tchip" aria-pressed={types.has(t)}
              onClick={() => setTypes(s => { const x = new Set(s); if (x.has(t)) x.delete(t); else x.add(t); return x; })}>
              <span className="sw" style={{ background: TYPE_COLOR[t] }} />{t}<span className="ct">{counts[t]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="g-stage">
        <section className="g-canvas" aria-label="Graph" ref={canvas}>
          <div className="g-inner">
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              {edges.map(e => {
                const a = byId.get(e.a)!, b = byId.get(e.b)!;
                if (!visible(a) || !visible(b)) return null;
                const pa = pos.get(e.a)!, pb = pos.get(e.b)!;
                const hot = !!selected && (e.a === selected || e.b === selected) || (!!hover && (e.a === hover || e.b === hover));
                const dim = !!selected && !hot;
                return (
                  <g key={e.a + e.b + e.rel}>
                    <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={hot ? '#9DB8F7' : '#4A5260'} strokeWidth={hot ? 1.8 : e.src ? 0.7 : 1.1}
                      opacity={dim ? 0.12 : e.src ? 0.55 : 0.8} strokeDasharray={e.src ? '3 3' : undefined} />
                    {hot && !e.src && (
                      <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 4} fill="#9DB8F7" fontSize={10} fontFamily="JetBrains Mono,monospace"
                        textAnchor="middle" paintOrder="stroke" stroke="#1E222A" strokeWidth={3}>{e.rel}</text>
                    )}
                  </g>
                );
              })}
            </svg>
            {notes.filter(visible).map(n => {
              const p = pos.get(n.id)!, r = RAD[n.type], c = color(n);
              const dim = !!selected && selected !== n.id && !nb.has(n.id);
              const size = n.type === 'Source' ? 14 : r * 2;
              const style: React.CSSProperties = { left: p.x, top: p.y, width: size, height: size, background: n.type === 'Source' || n.type === 'Price' ? 'transparent' : c };
              if (n.type === 'Price') style.border = `2px solid ${c}`;
              if (n.type === 'Company' && selected !== n.id) style.boxShadow = '0 0 0 6px rgba(255,255,255,.06),0 6px 24px rgba(0,0,0,.45)';
              // Few labels by default (companies, products, market-wide events); the rest show on hover or when selected.
              const focus = !!selected && (selected === n.id || nb.has(n.id)) && n.type !== 'Source';
              const label = n.type === 'Company' ? 'glab' : n.type === 'Product' || (n.type === 'Event' && !n.company) || focus ? 'glab small' : null;
              return (
                <span key={n.id}>
                  <button className={`gn${dim ? ' dim' : ''}${selected === n.id ? ' sel' : ''}${fresh.has(n.id) ? ' new' : ''}`} style={style}
                    aria-label={`${n.type}: ${n.title}`} onClick={() => onSelect(selected === n.id ? null : n.id)}
                    onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
                    {n.type === 'Source' && <span style={{ width: r * 2, height: r * 2, borderRadius: '50%', background: c, display: 'block' }} />}
                    {n.type === 'Company' && <span style={{ fontSize: 12, fontWeight: 800, color: '#1B2230', lineHeight: 1 }}>{SHORT[n.company] ?? n.company}</span>}
                  </button>
                  {label && <div className={label + (dim ? ' dim' : '')} style={{ left: p.x, top: p.y + r + 5 }}>{n.title}</div>}
                </span>
              );
            })}
            {hov && (
              <div className="gtip" style={{ left: pos.get(hov.id)!.x, top: pos.get(hov.id)!.y }}>
                {hov.title}<small>{hov.type}{hov.company ? ` · ${hov.company}` : ''}</small>
              </div>
            )}
          </div>
          <div className="legend">
            <span><i style={{ width: 15, height: 15 }} />Company</span>
            <span><i style={{ width: 11, height: 11 }} />Event</span>
            <span><i style={{ width: 9, height: 9 }} />Product · Campaign</span>
            <span><i style={{ width: 8, height: 8, background: 'none', border: '1.5px solid var(--nav-fg)' }} />Price</span>
            <span><i style={{ width: 6, height: 6 }} />Source</span>
          </div>
        </section>
        <aside className="g-side" aria-label="Selected note">
          {sel ? <Panel n={sel} notes={notes} byId={byId} nbCount={nb.size} color={color} onSelect={onSelect} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2>Pick a node</h2>
              <p className="empty-p">Big circles are companies. Each sits beside a cloud of the sources the agent read about it. Click anything to light up what it connects to.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {notes.filter(n => n.type === 'Company').map(h => (
                  <button key={h.id} className="lchip" onClick={() => onSelect(h.id)}><span className="dot" style={{ background: color(h) }} /><span className="lb">{h.title}</span></button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Panel({ n, notes, byId, nbCount, color, onSelect }: {
  n: Note; notes: Note[]; byId: Map<string, Note>; nbCount: number; color: (n: Note) => string; onSelect: (id: string | null) => void;
}) {
  const chip = (id: string, extra?: React.ReactNode, compact = false) => {
    const o = byId.get(id);
    if (!o) return null;
    return (
      <button key={id + String(extra)} className="lchip" style={compact ? { minHeight: 34, width: 'auto', maxWidth: '100%' } : undefined} onClick={() => onSelect(id)}>
        <span className="dot" style={{ background: o.type === 'Source' ? TYPE_COLOR.Source : color(o) }} />{extra}<span className="lb">{o.title}</span>
      </button>
    );
  };
  const head = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span className="badge" style={{ background: TYPE_COLOR[n.type] }}>{n.type}</span>
        <button className="clear" onClick={() => onSelect(null)}>Clear</button>
      </div>
      <h2>{n.title}</h2>
      <div style={{ fontSize: 13, color: 'var(--g-mut)' }}>{n.company || 'Market-wide'} · {nbCount} direct link{nbCount === 1 ? '' : 's'}</div>
    </div>
  );

  if (n.type === 'Source') {
    const sup = notes.flatMap(o => o.claims.filter(c => c.source_id === n.id).map(c => ({ o, c })));
    return (
      <>
        {head}
        <div>
          <h3>Source</h3>
          <div className="meta-row"><span className="k">Type</span><span className="v">{n.source_type}</span></div>
          <div className="meta-row"><span className="k">Published</span><span className="v">{n.published_date || 'undated'}</span></div>
          <div className="meta-row"><span className="k">Fetched</span><span className="v">{fmt(n.fetched_at)}</span></div>
          <div className="meta-row"><span className="k">Cached copy</span><span className="v">{n.has_cache ? 'Yes — snippets checked' : 'No'}</span></div>
        </div>
        <a className="g-url" href={n.url} target="_blank" rel="noopener noreferrer">{n.url} ↗</a>
        <div>
          <h3>Supports {sup.length} claim{sup.length === 1 ? '' : 's'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sup.map(({ o, c }) => (
              <div className="claim-d" key={c.id}>
                <div className="tx">{c.text}</div>
                <div className="ev"><b>{n.has_cache ? 'Snippet' : 'Extract'}:</b> “{c.evidence_snippet}”</div>
                <div className="srcline"><span className={`sbdg ${c.status}`}>{BADGE[c.status]}</span>{chip(o.id, undefined, true)}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  const incoming = notes.flatMap(o => o.id === n.id ? [] : o.links.filter(l => l.to === n.id && !n.links.some(m => m.to === o.id)).map(l => ({ rel: `${l.relation} ←`, to: o.id })));
  const links = [...n.links.map(l => ({ rel: l.relation, to: l.to })), ...incoming];
  return (
    <>
      {head}
      {n.body_md && <p className="empty-p" style={{ color: 'var(--g-fg)' }}>{n.body_md}</p>}
      <div>
        <h3>Metadata</h3>
        <div className="meta-row"><span className="k">Created</span><span className="v">{fmt(n.created_at)}</span></div>
        <div className="meta-row"><span className="k">Last updated</span><span className="v">{fmt(n.updated_at)}</span></div>
        <div className="meta-row"><span className="k">Last verified</span><span className="v">{fmt(n.last_verified_at)}</span></div>
      </div>
      {n.claims.length > 0 && (
        <div>
          <h3>Claims ({n.claims.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {n.claims.map(c => {
              const s = byId.get(c.source_id);
              return (
                <div className="claim-d" key={c.id}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div className="tx">{c.text}</div><span className={`sbdg ${c.status}`}>{BADGE[c.status]}</span>
                  </div>
                  <div className="ev"><b>{s?.has_cache ? 'Snippet' : 'Extract'}:</b> “{c.evidence_snippet}”
                    {!s?.has_cache && <div className="ev-note">Condensed at ingestion — not yet checked against a cached copy of the page.</div>}
                  </div>
                  <div className="srcline">
                    {chip(c.source_id, undefined, true)}
                    {s?.url && <a href={s.url} target="_blank" rel="noopener noreferrer">open ↗</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div>
          <h3>Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {links.map(l => chip(l.to, <span className="rel">{l.rel}</span>))}
          </div>
        </div>
      )}
    </>
  );
}
