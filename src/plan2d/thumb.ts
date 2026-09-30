/* 작은 평면 그림 (타입 카드 · 미니맵 · 견적 요약) — 공간 종류별 색 + 벽 */
import type { PlanGeom } from '../data/apt/builder';
import type { RoomKind } from '../data/apt/schema';

const KIND_FILL: Record<RoomKind, string> = {
  living: '#efe4cf', kitchen: '#efe4cf', master: '#e8dcc6', bed: '#ebe1cd', bath: '#dfe6e6', entry: '#e6e1d8', hall: '#f1e9da',
  dress: '#e8dcc6', alpha: '#ebe1cd', utility: '#e0e4e3', balcony: '#e6e9e4',
};

interface ThumbOpts { pad?: number; labels?: (id: string) => string; roomClass?: string; showFurniture?: {cx: number; cy: number; w: number; d: number; rot: number}[] }

export function planThumb(p: PlanGeom, o: ThumbOpts = {}){
  const [x0, y0, x1, y1] = p.box, pad = o.pad ?? 300, vb = `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2*pad} ${y1 - y0 + 2*pad}`;
  const pts = (poly: [number, number][]) => poly.map(q => q.join(',')).join(' ');
  let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">`;
  // 합쳐진 공간은 대상 방의 색으로
  const kindOf = (id: string) => p.rooms.find(r => r.id === id)?.kind ?? 'hall';
  p.rooms.forEach(r => s += `<polygon ${o.roomClass ? `class="${o.roomClass}" data-room="${r.target}"` : ''} points="${pts(r.poly)}" fill="${KIND_FILL[kindOf(r.target)]}"/>`);
  (o.showFurniture ?? []).forEach(f => s += `<rect x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" rx="40" fill="#d6c7ad" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})" pointer-events="none"/>`);
  p.wins.forEach(w => s += `<rect x="${w.rect[0]}" y="${w.rect[1]}" width="${w.rect[2]-w.rect[0]}" height="${w.rect[3]-w.rect[1]}" fill="#bcd3dd" pointer-events="none"/>`);
  p.walls.forEach(w => s += `<rect x="${w.rect[0]}" y="${w.rect[1]}" width="${w.rect[2]-w.rect[0]}" height="${w.rect[3]-w.rect[1]}" fill="${w.kind === 'n' ? '#8e877a' : '#2e2b26'}" pointer-events="none"/>`);
  if (o.labels) p.rooms.filter(r => r.target === r.id && !r.service && r.kind !== 'hall').forEach(r => {
    s += `<text x="${r.at[0]}" y="${r.at[1]}" font-size="330" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#3b403c" pointer-events="none" font-family="Pretendard,-apple-system,sans-serif">${o.labels!(r.id)}</text>`;
  });
  return s + '</svg>';
}
