/* Radial layout: companies are the big hubs in the middle, each owning a slice of the circle sized
   by how many notes it has. Inside its slice: products fan out in an arc with their prices just
   beyond, and campaigns and company events sit in one tight cluster. The brand's source cloud is on
   the outside. Market-wide notes (events, shared sources) get their own slice. */
import type { Note } from './types.ts';

export const W = 900, H = 820;
const CX = 450, CY = 410, deg = Math.PI / 180;
const at = (r: number, a: number) => ({ x: CX + r * Math.cos(a * deg), y: CY + r * Math.sin(a * deg) });
const GOLDEN = 2.39996;

/** Packs `n` points tightly around a centre (sunflower pattern). */
function cluster(center: { x: number; y: number }, n: number, gap: number) {
  return Array.from({ length: n }, (_, k) => {
    const r = gap * Math.sqrt(k + 0.6), th = k * GOLDEN;
    return { x: center.x + Math.cos(th) * r, y: center.y + Math.sin(th) * r };
  });
}

export function layoutGraph(notes: Note[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const byId = new Map(notes.map(n => [n.id, n]));
  const hubs = notes.filter(n => n.type === 'Company');
  const owned = (co: string) => notes.filter(n => n.type !== 'Source' && n.type !== 'Company' && n.company === co);
  const marketNotes = notes.filter(n => n.type !== 'Source' && n.type !== 'Company' && !hubs.some(h => h.company === n.company));

  // Slices: every group gets a minimum, the rest is shared by note count.
  const groups: { hub: Note | null; key: string; items: Note[] }[] = hubs.map(h => ({ hub: h, key: h.company, items: owned(h.company) }));
  // Market-wide slice sits at the bottom, opposite the first company.
  if (marketNotes.length) groups.splice(Math.ceil(groups.length / 2), 0, { hub: null, key: '', items: marketNotes });
  const MIN = 40;
  const spare = Math.max(0, 360 - MIN * groups.length);
  const total = groups.reduce((s, g) => s + g.items.length, 0) || 1;
  let cursor = -90 - (MIN + spare * (groups[0]?.items.length ?? 0) / total) / 2; // first hub straight up
  const clouds = new Map<string, { x: number; y: number }>();

  for (const g of groups) {
    const share = MIN + spare * g.items.length / total;
    const a = cursor + share / 2;
    cursor += share;
    const half = share * 0.42;
    clouds.set(g.key, at(370, a));

    if (!g.hub) { // market-wide: a staggered arc so every label has room
      const fm = g.items.length > 1 ? Math.min(14, (half * 2) / (g.items.length - 1)) : 0;
      g.items.forEach((n, j) => pos.set(n.id, at(285 + (j % 3) * 32, a + (j - (g.items.length - 1) / 2) * fm)));
      continue;
    }
    pos.set(g.hub.id, hubs.length === 1 ? { x: CX, y: CY } : at(150, a));

    // Products: an arc over the first part of the slice; prices just outside their product.
    const prods = g.items.filter(n => n.type === 'Product');
    const rest = g.items.filter(n => n.type !== 'Product');
    const prodSpan = rest.length ? half * 1.2 : half * 2;
    const start = a - half * 0.85;
    const f = prods.length > 1 ? Math.min(16, prodSpan / (prods.length - 1)) : 0;
    const centre = prods.length > 1 && f < 16 ? start + prodSpan / 2 : rest.length ? a - half * 0.4 : a;
    prods.forEach((p, j) => {
      const pa = centre + (j - (prods.length - 1) / 2) * f;
      const r = 250 + (j % 2 ? 34 : 0); // stagger so labels don't collide
      pos.set(p.id, at(r, pa));
      const pr = p.links.find(l => l.relation === 'has_price' && byId.get(l.to)?.type === 'Price');
      if (pr && !pos.has(pr.to)) pos.set(pr.to, at(r + 30, pa + f * 0.35));
    });

    // Campaigns, company events and loose prices: one tight cluster at the end of the slice.
    const left = rest.filter(n => !pos.has(n.id));
    cluster(at(235, prods.length ? a + half * 0.6 : a), left.length, 9).forEach((p, j) => pos.set(left[j].id, p));
  }

  const count = new Map<string, number>();
  for (const s of notes.filter(n => n.type === 'Source')) {
    const key = clouds.has(s.company) ? s.company : '';
    const c = (count.get(key) ?? 0) + 1;
    count.set(key, c);
    const o = clouds.get(key) ?? at(370, 90);
    const r = 9 * Math.sqrt(c - 0.4), th = c * GOLDEN + key.length;
    pos.set(s.id, { x: o.x + Math.cos(th) * r, y: o.y + Math.sin(th) * r });
  }
  for (const p of pos.values()) { p.x = Math.min(W - 14, Math.max(14, p.x)); p.y = Math.min(H - 14, Math.max(14, p.y)); }
  return pos;
}
