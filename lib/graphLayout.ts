/* Radial layout: companies are the big hubs in the middle; products, prices, campaigns
   and each brand's source cloud fan outward from their company. Market-wide notes
   (events, shared sources) sit in the gap at the bottom. */
import type { Note } from './types.ts';

export const W = 900, H = 820;
const CX = 450, CY = 410, deg = Math.PI / 180;
const at = (r: number, a: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });

export function layoutGraph(notes: Note[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const byId = new Map(notes.map(n => [n.id, n]));
  const hubs = notes.filter(n => n.type === 'Company');
  const k = Math.max(hubs.length, 1);
  const step = 360 / k;
  const fan = Math.min(18, step * 0.3); // degrees between siblings around a hub
  const clouds = new Map<string, { x: number; y: number }>();

  hubs.forEach((hub, i) => {
    const a = (-90 + i * step) * deg;
    pos.set(hub.id, hubs.length === 1 ? { x: CX, y: CY } : at(125, a));
    const mine = notes.filter(n => n.type !== 'Source' && n.type !== 'Company' && n.company === hub.company);
    const prods = mine.filter(n => n.type === 'Product');
    prods.forEach((p, j) => {
      const pa = a + (j - (prods.length - 1) / 2) * fan * deg;
      pos.set(p.id, at(215, pa));
      const pr = p.links.find(l => l.relation === 'has_price' && byId.get(l.to)?.type === 'Price');
      if (pr && !pos.has(pr.to)) pos.set(pr.to, at(275, pa));
    });
    let side = ((prods.length - 1) / 2) * fan + 18;
    for (const n of mine) {
      if (pos.has(n.id) || n.type === 'Product') continue;
      pos.set(n.id, at(n.type === 'Price' ? 255 : 185, a + side * deg));
      side += 12;
    }
    clouds.set(hub.company, at(345, a));
  });

  const market = (k % 2 ? 90 : 90 + step / 2) * deg;
  const loose = notes.filter(n => n.type !== 'Source' && !pos.has(n.id));
  loose.forEach((n, i) => pos.set(n.id, at(280, market + (i - (loose.length - 1) / 2) * 32 * deg)));
  const marketCloud = at(355, market);

  const count = new Map<string, number>();
  for (const s of notes.filter(n => n.type === 'Source')) {
    const key = clouds.has(s.company) ? s.company : '';
    const c = (count.get(key) ?? 0) + 1;
    count.set(key, c);
    const o = clouds.get(key) ?? marketCloud;
    const r = 10 * Math.sqrt(c - 0.4), th = c * 2.39996 + key.length;
    pos.set(s.id, { x: o.x + Math.cos(th) * r, y: o.y + Math.sin(th) * r });
  }
  for (const p of pos.values()) { p.x = Math.min(W - 12, Math.max(12, p.x)); p.y = Math.min(H - 12, Math.max(12, p.y)); }
  return pos;
}
