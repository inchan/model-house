/* ======================= 2D 평면도 그리기 ======================= */
import { $, esc, COARSE } from '../core/dom';
import { state, ui, view, getF } from '../core/state';
import { area, aabb } from '../core/geometry';
import { roomName, furnName, fmtArea } from '../core/names';
import { ROOMS, WALLS, WINS, DOORS, SLIDES, DIM_CHAINS, ENTRY, type Rect } from '../data/plan';
import type { FurnType } from '../data/library';
import { furnSVG } from './symbols';
import { t } from '../i18n';

const ptsAttr = (poly: [number, number][]) => poly.map(p => p.join(',')).join(' ');
const setVisible = (g: Element, on: boolean) => g.setAttribute('display', on ? 'inline' : 'none');

export function renderRooms(){
  let s = '';
  ROOMS.forEach(r => s += `<polygon class="room" data-room="${r.id}" points="${ptsAttr(r.poly)}" fill="url(#m-${state.rooms[r.id].mat})"/>`);
  const sill = ([a, b, c, d]: Rect) => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="#e2dacb" stroke="#b9b0a0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  DOORS.forEach(d => s += sill(d.rect)); SLIDES.forEach(d => s += sill(d.rect));
  $('#gRooms').innerHTML = s;
}

// 너무 작은 가구에는 이름을 쓰지 않는다
const NOLABEL: FurnType[] = ['plant', 'floorlamp', 'sidetable', 'barstool', 'beanbag'];
export function renderFurn(){
  const g = $('#gFurn');
  setVisible(g, ui.layers.furn);
  g.innerHTML = state.furniture.map(f => {
    const fs = Math.max(80, Math.min(170, Math.min(f.w, f.d)*.2));
    const label = Math.min(f.w, f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="#4a443c" opacity=".8" pointer-events="none">${esc(furnName(f))}</text>` : '';
    return `<g class="furn" data-fid="${esc(f.id)}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type, f.w, f.d, f.color)}${label}</g>`;
  }).join('');
}

export function renderWalls(){
  $('#gWalls').innerHTML = WALLS.map((w, i) => {
    const [x0, y0, x1, y1, k] = w, id = 'w' + i, dem = state.demolished.includes(id);
    let fill = k === 'b' ? (ui.layers.bearing ? '#b8412c' : '#26241f') : k === 'low' ? '#e9e3d8' : k === 'e' ? '#8f897d' : '#a7a195';
    let ex = k === 'low' ? 'stroke="#8f897d" stroke-width="1" vector-effect="non-scaling-stroke"' : '';
    if (dem){ fill = 'rgba(198,91,58,.12)'; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    return `<rect class="wall" data-wall="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${fill}" ${ex}/>`;
  }).join('');
}

export function renderOpenings(){
  const WS = 'stroke="#4f7394" stroke-width="1" vector-effect="non-scaling-stroke"';
  let s = '';
  WINS.forEach(([x0, y0, x1, y1]) => {
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f7fbfd" ${WS}/>`;
    if (w >= h) [1/3, 2/3].forEach(k => s += `<line x1="${x0}" y1="${y0+h*k}" x2="${x1}" y2="${y0+h*k}" ${WS}/>`);
    else [1/3, 2/3].forEach(k => s += `<line x1="${x0+w*k}" y1="${y0}" x2="${x0+w*k}" y2="${y1}" ${WS}/>`);
  });
  const DS = 'stroke="#3d3a34" stroke-width="1" vector-effect="non-scaling-stroke"';
  DOORS.forEach(d => {
    const [hx, hy] = d.h, L = d.len, T = 40;
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#b5653a' : '#3d3a34';
    s += `<polygon points="${hx},${hy} ${ox},${oy} ${ox+d.c[0]*T},${oy+d.c[1]*T} ${hx+d.c[0]*T},${hy+d.c[1]*T}" fill="#fff" stroke="${col}" stroke-width="${d.entry ? 1.8 : 1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  SLIDES.forEach(({rect: [x0, y0, x1, y1], v}) => {
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += `<rect x="${m-45}" y="${y0}" width="40" height="${L*.55}" fill="#fff" ${DS}/><rect x="${m+5}" y="${y1-L*.55}" width="40" height="${L*.55}" fill="#fff" ${DS}/>`; }
    else { const L = x1-x0, m = (y0+y1)/2; s += `<rect x="${x0}" y="${m-45}" width="${L*.55}" height="40" fill="#fff" ${DS}/><rect x="${x1-L*.55}" y="${m+5}" width="${L*.55}" height="40" fill="#fff" ${DS}/>`; }
  });
  // 현관 표시
  const {arrow: A, label: Lb} = ENTRY;
  s += `<path d="M${A.x0} ${A.y}H${A.x1}M${A.x1-200} ${A.y-155}L${A.x1+50} ${A.y}L${A.x1-200} ${A.y+155}" fill="none" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke"/>
        <text x="${Lb.x}" y="${Lb.y}" font-size="200" fill="#b5653a">${t('plan.entry')}</text>`;
  $('#gOpen').innerHTML = s;
}

export function renderLabels(){
  const g = $('#gLabels');
  setVisible(g, ui.layers.labels);
  g.innerHTML = ROOMS.filter(r => r.at).map(r => {
    const [x, y] = r.at!, halo = 'stroke="#fbf9f4" stroke-width="45" paint-order="stroke" stroke-linejoin="round"';
    return `<text x="${x}" y="${y}" font-size="250" font-weight="600" text-anchor="middle" fill="#2b2824" ${halo}>${esc(roomName(r.id))}</text>
      <text x="${x}" y="${y+260}" font-size="175" text-anchor="middle" fill="#7d7366" ${halo}>${fmtArea(area(r.poly))}</text>`;
  }).join('');
}

export function renderDims(){
  const DC = '#7d7160', LS = `stroke="${DC}" stroke-width="1" vector-effect="non-scaling-stroke"`, TK = `stroke="${DC}" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const txt = (x: number, y: number, v: number, rot = false) => `<text x="${x}" y="${y}" font-size="${v < 400 ? 140 : 200}" text-anchor="middle" fill="${DC}" ${rot ? `transform="rotate(-90 ${x} ${y})"` : ''}>${v}</text>`;
  const chain = (horiz: boolean, at: number, start: number, segs: number[]) => {
    const pts = [start]; segs.forEach(v => pts.push(pts[pts.length-1] + v));
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-170}" x2="${p}" y2="${at+170}" ${LS}/><line x1="${p-80}" y1="${at+80}" x2="${p+80}" y2="${at-80}" ${TK}/>`
      : `<line x1="${at-170}" y1="${p}" x2="${at+170}" y2="${p}" ${LS}/><line x1="${at-80}" y1="${p+80}" x2="${at+80}" y2="${p-80}" ${TK}/>`);
    segs.forEach((v, i) => { const mid = (pts[i] + pts[i+1])/2; s += horiz ? txt(mid, at-70, v) : txt(at-70, mid, v, true); });
    return s;
  };
  const g = $('#gDims');
  g.innerHTML = DIM_CHAINS.map(([h, at, start, segs]) => chain(h, at, start, segs)).join('');
  setVisible(g, ui.layers.dims);
}
export const showDims = () => setVisible($('#gDims'), ui.layers.dims);

export function renderGrid(){
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

export function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a: {x: number; y: number}, b: {x: number; y: number}, tmp = false) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#2f5d62' : '#b5653a', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="#fff" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a, m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#2f5d62"/>`;
  $('#gMeasure').innerHTML = s;
}

export function renderSel(){
  const k = 1/view.s; let s = '';
  if (ui.sel?.kind === 'furn'){
    const f = getF(ui.sel.id);
    if (f){
      // 터치에서는 손잡이를 더 크고 멀리 두고, 투명한 큰 누름 영역을 함께 둔다
      const p = 5*k, A = 'stroke="#b5653a" vector-effect="non-scaling-stroke"', hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2 + p, sy = f.d/2 + p;
      s += `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${t('plan.rotateHandle')}</title></circle>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect data-handle="size" x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="#b5653a"><title>${t('plan.sizeHandle')}</title></rect></g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="#b5653a" font-weight="600" pointer-events="none"
        stroke="#fff" stroke-width="${3*k}" paint-order="stroke">${f.w} × ${f.d}</text>`;
    }
  } else if (ui.sel?.kind === 'room'){
    const r = ROOMS.find(r => r.id === ui.sel!.id);
    if (r) s += `<polygon points="${ptsAttr(r.poly)}" fill="rgba(181,101,58,.08)" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  $('#gSel').innerHTML = s;
}

// 방 이름 hover 표시용
export const roomAreaText = (id: string) => { const r = ROOMS.find(r => r.id === id); return r ? fmtArea(area(r.poly)) : ''; };
