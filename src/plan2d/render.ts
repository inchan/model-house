/* ======================= 2D 평면도 그리기 ======================= */
import { $, esc, COARSE } from '../core/dom';
import { state, ui, view, getF, roleColor } from '../core/state';
import { aabb } from '../core/geometry';
import { plan, aptType, roomMat, roomArea, visibleRooms } from '../core/plan';
import { roomName, furnName, fmtArea } from '../core/names';
import type { Rect, WallKind } from '../data/apt/schema';
import type { FurnType } from '../data/library';
import { furnSVG } from './symbols';
import { t } from '../i18n';

const ptsAttr = (poly: [number, number][]) => poly.map(p => p.join(',')).join(' ');
const setVisible = (g: Element, on: boolean) => g.setAttribute('display', on ? 'inline' : 'none');
const rectEl = ([a, b, c, d]: Rect, attrs: string) => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" ${attrs}/>`;
const NS = 'vector-effect="non-scaling-stroke"';

export function renderRooms(){
  const p = plan();
  let s = '';
  p.rooms.forEach(r => {
    const bal = r.kind === 'balcony' && r.target === r.id;
    s += `<polygon class="room" data-room="${r.target}" points="${ptsAttr(r.poly)}" fill="url(#m-${roomMat(r.id)})"${bal ? ' opacity=".85"' : ''}><title>${esc(roomName(r.target))} ${fmtArea(roomArea(r.target))}</title></polygon>`;
    if ((r.level ?? 0) < 0) s += `<polygon points="${ptsAttr(r.poly)}" fill="#6d5f4d" opacity=".08" pointer-events="none"/>`;   // 현관: 한 단 낮은 바닥
  });
  // 문턱
  const sill = (rc: Rect) => rectEl(rc, `fill="#e4dccd" stroke="#bcb3a3" stroke-width="1" ${NS} pointer-events="none"`);
  [...p.doors, ...p.slides, ...p.gaps].forEach(d => s += sill(d.rect));
  $('#gRooms').innerHTML = s;
}

// 붙박이 설비: 주방 가구·욕실 도기·신발장·옵션 품목 (선택·이동 불가)
export function renderFixtures(){
  $('#gFix').innerHTML = plan().fixtures.map(f => {
    const c = roleColor(state.style, f.role, f.type);
    return `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot ?? 0})"${f.type === 'ceilingac' ? ' opacity=".75"' : ''}>${furnSVG(f.type, f.w, f.d, c)}</g>`;
  }).join('');
}

// 너무 작은 가구에는 이름을 쓰지 않는다
const NOLABEL: FurnType[] = ['plant', 'floorlamp', 'sidetable', 'barstool', 'beanbag', 'chair', 'officechair', 'nightstand'];
export function renderFurn(){
  const g = $('#gFurn');
  setVisible(g, ui.layers.furn);
  g.innerHTML = state.furniture.map(f => {
    const fs = Math.max(80, Math.min(160, Math.min(f.w, f.d)*.2));
    const label = Math.min(f.w, f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="#3f3a33" opacity=".75" pointer-events="none">${esc(furnName(f))}</text>` : '';
    return `<g class="furn" data-fid="${esc(f.id)}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type, f.w, f.d, f.color)}${label}</g>`;
  }).join('');
}

const WALL_FILL: Record<WallKind, string> = {b: '#2b2824', e: '#57524a', n: '#9a9387', low: '#e6dfd3'};
export function renderWalls(){
  $('#gWalls').innerHTML = plan().walls.map(w => {
    const fill = w.kind === 'b' && ui.layers.bearing ? '#1f5a44' : WALL_FILL[w.kind];
    const ex = w.kind === 'low' ? `stroke="#8f897d" stroke-width="1" ${NS}` : '';
    return rectEl(w.rect, `class="wall" data-kind="${w.kind}" fill="${fill}" ${ex}`);
  }).join('');
}

export function renderOpenings(){
  const p = plan(), WS = `stroke="#5b7f96" stroke-width="1" ${NS}`, DS = `stroke="#3d3a34" stroke-width="1" ${NS}`;
  let s = '';
  p.wins.forEach(({rect: [x0, y0, x1, y1], horiz}) => {
    const w = x1-x0, h = y1-y0;
    s += rectEl([x0, y0, x1, y1], `fill="#f4f9fb" ${WS}`);
    if (horiz) [1/3, 2/3].forEach(k => s += `<line x1="${x0}" y1="${y0+h*k}" x2="${x1}" y2="${y0+h*k}" ${WS}/>`);
    else [1/3, 2/3].forEach(k => s += `<line x1="${x0+w*k}" y1="${y0}" x2="${x0+w*k}" y2="${y1}" ${WS}/>`);
  });
  p.doors.forEach(d => {
    const [hx, hy] = d.h, L = d.len, T = 40;
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#1f5a44' : '#3d3a34';
    s += `<polygon points="${hx},${hy} ${ox},${oy} ${ox+d.c[0]*T},${oy+d.c[1]*T} ${hx+d.c[0]*T},${hy+d.c[1]*T}" fill="#fff" stroke="${col}" stroke-width="${d.entry ? 1.8 : 1}" ${NS}/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  p.slides.forEach(({rect: [x0, y0, x1, y1], v}) => {
    const G = `fill="#eef6f9" ${WS}`;
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += rectEl([m-30, y0, m, y0+L*.55], G) + rectEl([m, y1-L*.55, m+30, y1], G); }
    else { const L = x1-x0, m = (y0+y1)/2; s += rectEl([x0, m-30, x0+L*.55, m], G) + rectEl([x1-L*.55, m, x1, m+30], G); }
  });
  // 현관 표시
  const a = aptType().entry.arrow, dir = Math.sign(a.y1 - a.y0) || 1;
  s += `<path d="M${a.x} ${a.y0}V${a.y1}M${a.x-150} ${a.y1-dir*220}L${a.x} ${a.y1}L${a.x+150} ${a.y1-dir*220}" fill="none" stroke="#1f5a44" stroke-width="2" ${NS}/>
        <text x="${a.x+220}" y="${(a.y0+a.y1)/2}" font-size="190" fill="#1f5a44" font-weight="600" dominant-baseline="central">${t('plan.entry')}</text>`;
  $('#gOpen').innerHTML = s;
}

export function renderLabels(){
  const g = $('#gLabels');
  setVisible(g, ui.layers.labels);
  g.innerHTML = visibleRooms().map(r => {
    const [x, y] = r.at, small = r.service || r.kind === 'bath' || r.kind === 'dress' || r.kind === 'entry';
    const halo = 'stroke="#fbf9f4" stroke-width="45" paint-order="stroke" stroke-linejoin="round"';
    return `<text x="${x}" y="${y}" font-size="${small ? 190 : 240}" font-weight="600" text-anchor="middle" fill="#27241f" ${halo}>${esc(roomName(r.id))}</text>
      <text x="${x}" y="${y + (small ? 210 : 250)}" font-size="${small ? 140 : 165}" text-anchor="middle" fill="#6f665a" ${halo}>${fmtArea(roomArea(r.id))}</text>`;
  }).join('');
}

// 치수선: 한국 평면도처럼 벽 중심선 사이 치수를 위쪽·왼쪽에 체인으로
export function renderDims(){
  const DC = '#7d7160', LS = `stroke="${DC}" stroke-width="1" ${NS}`, TK = `stroke="${DC}" stroke-width="2" ${NS}`;
  const txt = (x: number, y: number, v: number, rot = false) => `<text x="${x}" y="${y}" font-size="${v < 600 ? 140 : 190}" text-anchor="middle" fill="${DC}" ${rot ? `transform="rotate(-90 ${x} ${y})"` : ''}>${Math.round(v)}</text>`;
  const chain = (horiz: boolean, at: number, pts: number[]) => {
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-150}" x2="${p}" y2="${at+150}" ${LS}/><line x1="${p-70}" y1="${at+70}" x2="${p+70}" y2="${at-70}" ${TK}/>`
      : `<line x1="${at-150}" y1="${p}" x2="${at+150}" y2="${p}" ${LS}/><line x1="${at-70}" y1="${p+70}" x2="${at+70}" y2="${p-70}" ${TK}/>`);
    pts.slice(1).forEach((p, i) => { const mid = (pts[i] + p)/2; s += horiz ? txt(mid, at-60, p - pts[i]) : txt(at-60, mid, p - pts[i], true); });
    return s;
  };
  const {dims} = aptType(), [bx0, by0] = plan().box;
  const g = $('#gDims');
  g.innerHTML = chain(true, by0 - 650, dims.x) + chain(true, by0 - 1150, [dims.x[0], dims.x.at(-1)!])
    + chain(false, bx0 - 650, dims.y) + chain(false, bx0 - 1150, [dims.y[0], dims.y.at(-1)!]);
  setVisible(g, ui.layers.dims);
}
export const showDims = () => setVisible($('#gDims'), ui.layers.dims);

export function renderGrid(){
  $('#gGrid').innerHTML = `<rect x="-30000" y="-30000" width="80000" height="80000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

export function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a: {x: number; y: number}, b: {x: number; y: number}, tmp = false) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#2f6f8a' : '#1f5a44', S = `stroke="${col}" stroke-width="1.5" ${NS}`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="#fff" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a, m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#2f6f8a"/>`;
  $('#gMeasure').innerHTML = s;
}

export function renderSel(){
  const k = 1/view.s; let s = '';
  if (ui.sel?.kind === 'furn'){
    const f = getF(ui.sel.id);
    if (f){
      // 터치에서는 손잡이를 더 크고 멀리 두고, 투명한 큰 누름 영역을 함께 둔다
      const p = 5*k, A = `stroke="#1f5a44" ${NS}`, hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2 + p, sy = f.d/2 + p;
      s += `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${t('plan.rotateHandle')}</title></circle>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect data-handle="size" x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="#1f5a44"><title>${t('plan.sizeHandle')}</title></rect></g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="#1f5a44" font-weight="600" pointer-events="none"
        stroke="#fff" stroke-width="${3*k}" paint-order="stroke">${f.w} × ${f.d}</text>`;
    }
  } else if (ui.sel?.kind === 'room'){
    plan().rooms.filter(r => r.target === ui.sel!.id).forEach(r => {
      s += `<polygon points="${ptsAttr(r.poly)}" fill="rgba(31,90,68,.08)" stroke="#1f5a44" stroke-width="2" ${NS} pointer-events="none"/>`;
    });
  }
  $('#gSel').innerHTML = s;
}

export function renderPlan(){
  renderGrid(); renderRooms(); renderFixtures(); renderFurn(); renderWalls(); renderOpenings(); renderLabels(); renderDims(); renderMeasure(); renderSel();
}
