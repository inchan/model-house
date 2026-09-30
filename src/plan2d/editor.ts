/* ============================================================
 *  평면 편집기 — "내 평면"의 벽·문·창을 그리고 고친다
 *  - 벽: 클릭으로 시작점, 다시 클릭으로 끝점(연속 그리기). 수평·수직만, 끝점·벽선·50mm 격자에 붙는다.
 *        그리는 중 숫자를 치고 Enter를 누르면 그 길이로 정확히 그린다. Esc · 오른쪽 클릭 · 더블클릭으로 끝.
 *  - 문·창·미닫이·개구부: 벽 위를 클릭해 놓는다. 선택 도구로 벽을 따라 끌어 옮긴다.
 *  - 선택: 벽 끝점 손잡이로 길이 조절, 가운데 손잡이로 평행 이동(모서리로 이어진 벽도 함께 늘어난다).
 *  방은 벽으로 둘러싸인 영역을 자동으로 찾는다 (data/apt/faces.ts)
 * ============================================================ */
import { esc } from '../core/dom';
import { state, view, mutate, snap, commit } from '../core/state';
import { plan } from '../core/plan';
import { fmtArea } from '../core/names';
import { normalizeCustom, WALL_T, type CustomPlan } from '../data/apt/custom';
import type { OpeningSpec, Pt2, WallKind, WallSpec } from '../data/apt/schema';
import { t } from '../i18n';
import { svg, toMM } from './svg';
import { applyView, viewHooks } from './view';

export type EdTool = 'select' | 'wall' | 'door' | 'window' | 'slide' | 'gap';
export type EdSel = {kind: 'wall'; i: number} | {kind: 'open'; i: number; j: number} | {kind: 'room'; id: string} | null;
export const editor = {on: false, tool: 'wall' as EdTool, wallKind: 'n' as WallKind, sel: null as EdSel, typed: ''};
let draw: {start: Pt2; cur: Pt2} | null = null, hover: Pt2 | null = null;
let drag: {mode: 'end' | 'move' | 'open' | 'pan'; i: number; j?: number; which?: 0 | 1; start: Pt2; orig: string; sx: number; sy: number; x0?: number; y0?: number; moved: boolean} | null = null;
let onChange: () => void = () => {};
export const setEditorListener = (fn: () => void) => { onChange = fn; };

const OPEN_W: Record<Exclude<EdTool, 'select' | 'wall'>, number> = {door: 900, window: 1500, slide: 1800, gap: 900};
const cust = () => state.custom as CustomPlan;
const hz = (w: WallSpec) => w.a[1] === w.b[1];
const span = (w: WallSpec): [number, number] => (hz(w) ? [Math.min(w.a[0], w.b[0]), Math.max(w.a[0], w.b[0])] : [Math.min(w.a[1], w.b[1]), Math.max(w.a[1], w.b[1])]);
const fixedOf = (w: WallSpec) => (hz(w) ? w.a[1] : w.a[0]);
const len = (a: Pt2, b: Pt2) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const eqPt = (a: Pt2, b: Pt2) => a[0] === b[0] && a[1] === b[1];

// 편집 결과 반영: 방 다시 찾기 + 변경 번호 올리기 (3D·평면 계산 캐시 무효화)
function edit(fn: (c: CustomPlan) => void){
  mutate(() => { const c = cust(); fn(c); clampOpenings(c); c.rev++; normalizeCustom(c); });
  onChange();
}
function clampOpenings(c: CustomPlan){
  for (const w of c.walls){
    const [s0, s1] = span(w);
    w.open = (w.open ?? []).filter(o => o.w <= s1 - s0).map(o => ({...o, at: Math.max(s0, Math.min(s1 - o.w, o.at))}));
  }
  c.walls = c.walls.filter(w => len(w.a, w.b) >= 100);
}

/* ---------- 붙이기 ---------- */
const tolMM = () => 12/view.s;
function snapPt(p: {x: number; y: number}, from?: Pt2): Pt2 {
  const c = cust(), tol = tolMM();
  let x = Math.round(p.x/50)*50, y = Math.round(p.y/50)*50;
  // 끝점에 딱 붙기
  let best = tol*1.3;
  for (const w of c.walls) for (const e of [w.a, w.b]){ const d = Math.hypot(e[0] - p.x, e[1] - p.y); if (d < best){ best = d; x = e[0]; y = e[1]; } }
  if (best < tol*1.3) return from ? ortho(from, [x, y]) : [x, y];
  // 벽선(연장선 포함)에 맞추기
  let bx = tol, by = tol;
  for (const w of c.walls){
    if (hz(w)){ const d = Math.abs(w.a[1] - p.y); if (d < by){ by = d; y = w.a[1]; } }
    else { const d = Math.abs(w.a[0] - p.x); if (d < bx){ bx = d; x = w.a[0]; } }
  }
  return from ? ortho(from, [x, y]) : [x, y];
}
// 시작점에서 수평 또는 수직으로만
const ortho = (a: Pt2, b: Pt2): Pt2 => (Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? [b[0], a[1]] : [a[0], b[1]]);

// 점에서 가장 가까운 벽(중심선 기준 거리 한도 안)
function wallAt(p: {x: number; y: number}, tol = Math.max(250, tolMM())): {i: number; along: number} | null {
  let best: {i: number; along: number; d: number} | null = null;
  cust().walls.forEach((w, i) => {
    const [s0, s1] = span(w), along = hz(w) ? p.x : p.y, off = Math.abs((hz(w) ? p.y : p.x) - fixedOf(w));
    if (along < s0 - 50 || along > s1 + 50 || off > tol) return;
    if (!best || off < best.d) best = {i, along, d: off};
  });
  return best;
}

/* ---------- 포인터 ---------- */
export function edPointerDown(e: PointerEvent): boolean {
  if (!editor.on) return false;
  const p = toMM(e), target = e.target as Element;
  svg.setPointerCapture(e.pointerId);
  if (e.button === 2){ endDraw(); return true; }
  if (editor.tool === 'wall'){
    const q = snapPt(p, draw?.start);
    if (!draw){ draw = {start: q, cur: q}; editor.typed = ''; }
    else if (len(draw.start, q) >= 100){ addWall(draw.start, q); draw = {start: q, cur: q}; editor.typed = ''; }
    render(); return true;
  }
  if (editor.tool !== 'select'){
    const hit = wallAt(p);
    if (hit) addOpening(hit.i, editor.tool, hit.along);
    return true;
  }
  // 선택 도구: 손잡이 → 문·창 → 벽 → 방 → 빈 곳(화면 이동)
  const h = target.closest<SVGElement>('[data-eh],[data-em]');
  if (h && editor.sel?.kind === 'wall'){
    const i = editor.sel.i;
    drag = {mode: h.dataset.em !== undefined ? 'move' : 'end', i, which: h.dataset.eh === '1' ? 1 : 0, start: [p.x, p.y], orig: JSON.stringify(cust().walls), sx: e.clientX, sy: e.clientY, moved: false};
    return true;
  }
  const oe = target.closest<SVGElement>('[data-op]');
  if (oe){
    const [i, j] = oe.dataset.op!.split(':').map(Number);
    editor.sel = {kind: 'open', i, j};
    drag = {mode: 'open', i, j, start: [p.x, p.y], orig: JSON.stringify(cust().walls), sx: e.clientX, sy: e.clientY, moved: false};
    onChange(); render(); return true;
  }
  const hit = wallAt(p, Math.max(120, tolMM()*.8));
  if (hit){ editor.sel = {kind: 'wall', i: hit.i}; onChange(); render(); return true; }
  const room = plan().rooms.find(r => pointIn([p.x, p.y], r.poly));
  editor.sel = room ? {kind: 'room', id: room.id} : null;
  drag = {mode: 'pan', i: -1, start: [p.x, p.y], orig: '', sx: e.clientX, sy: e.clientY, x0: view.x0, y0: view.y0, moved: false};
  onChange(); render();
  return true;
}

export function edPointerMove(e: PointerEvent): boolean {
  if (!editor.on) return false;
  const p = toMM(e);
  if (editor.tool === 'wall'){
    hover = snapPt(p, draw?.start);
    if (draw){ draw.cur = hover; editor.typed = ''; }
    render(); return true;
  }
  if (!drag){ hover = null; return true; }
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return true;
  drag.moved = true;
  if (drag.mode === 'pan'){ view.x0 = drag.x0! - (e.clientX - drag.sx)/view.s; view.y0 = drag.y0! - (e.clientY - drag.sy)/view.s; applyView(); return true; }
  const c = cust(), walls = JSON.parse(drag.orig) as WallSpec[], w = walls[drag.i];
  if (!w) return true;
  const dx = Math.round((p.x - drag.start[0])/50)*50, dy = Math.round((p.y - drag.start[1])/50)*50;
  if (drag.mode === 'end'){
    // 끝점은 벽 방향으로만 움직여 길이를 바꾼다
    const key = drag.which ? 'b' : 'a', pt = w[key];
    const moved: Pt2 = hz(w) ? [pt[0] + dx, pt[1]] : [pt[0], pt[1] + dy];
    const sn = snapPt({x: moved[0], y: moved[1]}, hz(w) ? [pt[0], pt[1]] : [pt[0], pt[1]]);
    w[key] = hz(w) ? [sn[0], pt[1]] : [pt[0], sn[1]];
  } else if (drag.mode === 'move'){
    // 벽을 수직 방향으로 평행 이동, 모서리로 이어진 직교 벽의 끝점도 따라온다
    const d = hz(w) ? dy : dx, oa = w.a, ob = w.b;
    const na: Pt2 = hz(w) ? [oa[0], oa[1] + d] : [oa[0] + d, oa[1]], nb: Pt2 = hz(w) ? [ob[0], ob[1] + d] : [ob[0] + d, ob[1]];
    walls.forEach((o, k) => { if (k === drag!.i || hz(o) === hz(w)) return; for (const key of ['a', 'b'] as const){ if (eqPt(o[key], oa)) o[key] = na; else if (eqPt(o[key], ob)) o[key] = nb; } });
    w.a = na; w.b = nb;
    // 벽에 붙은 개구부도 함께 (수직 이동이라 위치 좌표는 그대로)
  } else if (drag.mode === 'open' && drag.j !== undefined){
    const o = w.open?.[drag.j]; if (!o) return true;
    const [s0, s1] = span(w);
    o.at = Math.max(s0, Math.min(s1 - o.w, o.at + (hz(w) ? dx : dy)));
  }
  c.walls = walls;
  c.rev++;
  onPreview();
  return true;
}

export function edPointerUp(): boolean {
  if (!editor.on) return false;
  const d = drag; drag = null;
  if (!d || !d.moved || d.mode === 'pan') return true;
  // 끌기가 끝나면 원래 상태를 실행 취소 기록에 남기고 방을 다시 찾는다
  const now = JSON.stringify(cust().walls), c = cust();
  c.walls = JSON.parse(d.orig);
  const before = snap();
  c.walls = JSON.parse(now); clampOpenings(c); c.rev++; normalizeCustom(c);
  commit(before); onChange();
  return true;
}
// 끄는 중에는 기록 없이 화면만 다시 그린다
let onPreview: () => void = () => {};
export const setPreviewListener = (fn: () => void) => { onPreview = fn; };

export function edDoubleClick(): boolean { if (!editor.on) return false; endDraw(); return true; }

/* ---------- 편집 동작 ---------- */
function addWall(a: Pt2, b: Pt2){
  const [p, q] = (a[0] + a[1] <= b[0] + b[1] ? [a, b] : [b, a]) as [Pt2, Pt2];
  // 같은 선 위에 이미 있는 벽과 완전히 겹치면 추가하지 않는다
  if (cust().walls.some(w => (eqPt(w.a, p) && eqPt(w.b, q)) || (eqPt(w.a, q) && eqPt(w.b, p)))) return;
  edit(c => { c.walls.push({a: p, b: q, t: WALL_T[editor.wallKind], kind: editor.wallKind, open: []}); });
  editor.sel = {kind: 'wall', i: cust().walls.length - 1};
}
function addOpening(i: number, tool: Exclude<EdTool, 'select' | 'wall'>, along: number){
  const w = cust().walls[i]; if (!w) return;
  const [s0, s1] = span(w), width = Math.min(OPEN_W[tool], s1 - s0 - 100);
  if (width < 400) return;
  const at = Math.round(Math.max(s0 + 50, Math.min(s1 - 50 - width, along - width/2))/10)*10;
  if ((w.open ?? []).some(o => at < o.at + o.w && at + width > o.at)) return;   // 기존 개구부와 겹치면 놓지 않는다
  const o: OpeningSpec = tool === 'door' ? {kind: 'door', at, w: width, side: 1, hinge: 'start'}
    : tool === 'window' ? {kind: 'window', at, w: width, sill: .9} : {kind: tool, at, w: width};
  edit(c => { (c.walls[i].open ??= []).push(o); });
  editor.sel = {kind: 'open', i, j: (cust().walls[i].open ?? []).length - 1};
  onChange();
}
export function deleteEdSel(){
  const s = editor.sel; if (!s || s.kind === 'room') return;
  editor.sel = null;   // 지운 뒤 다시 그릴 때 사라진 항목을 가리키지 않도록 먼저 비운다
  if (s.kind === 'wall') edit(c => { c.walls.splice(s.i, 1); });
  else edit(c => { c.walls[s.i]?.open?.splice(s.j, 1); });
}
export function updateWall(i: number, patch: Partial<WallSpec>){ edit(c => { Object.assign(c.walls[i], patch); if (patch.kind) c.walls[i].t = WALL_T[patch.kind]; }); }
export function setWallLength(i: number, mm: number){
  edit(c => { const w = c.walls[i]; if (!w || mm < 100) return; if (hz(w)) w.b = [w.a[0] + Math.sign(w.b[0] - w.a[0] || 1)*mm, w.b[1]]; else w.b = [w.b[0], w.a[1] + Math.sign(w.b[1] - w.a[1] || 1)*mm]; });
}
export function updateOpening(i: number, j: number, patch: Partial<OpeningSpec>){ edit(c => { const o = c.walls[i]?.open?.[j]; if (o) Object.assign(o, patch); }); }
export function setRoomKind(id: string, kind: CustomPlan['rooms'][number]['kind']){ edit(c => { const r = c.rooms.find(r => r.id === id); if (r) r.kind = kind; }); }

export function endDraw(){ draw = null; editor.typed = ''; render(); }
// 그리는 중 숫자 입력 → Enter로 정확한 길이
export function edKey(e: KeyboardEvent): boolean {
  if (!editor.on) return false;
  if (e.key === 'Escape'){ if (draw) endDraw(); else { editor.sel = null; onChange(); render(); } return true; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !draw){ e.preventDefault(); deleteEdSel(); return true; }
  if (draw && /^[0-9]$/.test(e.key)){ editor.typed += e.key; render(); return true; }
  if (draw && e.key === 'Backspace'){ editor.typed = editor.typed.slice(0, -1); render(); return true; }
  if (draw && e.key === 'Enter' && editor.typed){
    const L = +editor.typed, s = draw.start, c = draw.cur, horiz = Math.abs(c[0] - s[0]) >= Math.abs(c[1] - s[1]);
    const dir = horiz ? Math.sign(c[0] - s[0]) || 1 : Math.sign(c[1] - s[1]) || 1;
    const end: Pt2 = horiz ? [s[0] + dir*L, s[1]] : [s[0], s[1] + dir*L];
    if (L >= 100){ addWall(s, end); draw = {start: end, cur: end}; }
    editor.typed = ''; render(); return true;
  }
  const map: Record<string, EdTool> = {v: 'select', w: 'wall', d: 'door', n: 'window'};
  if (!e.metaKey && !e.ctrlKey && map[e.key.toLowerCase()]){ setEdTool(map[e.key.toLowerCase()]); return true; }
  return false;
}
export function setEdTool(tool: EdTool){ editor.tool = tool; draw = null; editor.typed = ''; if (tool !== 'select') editor.sel = null; svg.classList.toggle('ed-draw', tool !== 'select'); onChange(); render(); }

function pointIn(p: Pt2, poly: Pt2[]){
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi)*(p[1] - yi)/(yj - yi) + xi) r = !r;
  }
  return r;
}

/* ---------- 편집 표시 (선택 · 손잡이 · 그리는 선 · 길이) ---------- */
export function render(){
  const g = document.getElementById('gEdit'); if (!g) return;
  if (!editor.on){ g.innerHTML = ''; return; }
  const k = 1/view.s, c = cust(), NS = 'vector-effect="non-scaling-stroke"';
  let s = '';
  // 벽 중심선과 끝점
  c.walls.forEach((w, i) => {
    const sel = editor.sel?.kind === 'wall' && editor.sel.i === i;
    s += `<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${sel ? '#1f5a44' : '#2f6f8a'}" stroke-width="${sel ? 3 : 1}" stroke-dasharray="${sel ? '' : '6 4'}" ${NS} pointer-events="none"/>`;
    for (const e of [w.a, w.b]) s += `<circle cx="${e[0]}" cy="${e[1]}" r="${2.5*k}" fill="#2f6f8a" pointer-events="none"/>`;
    (w.open ?? []).forEach((o, j) => {
      const r = hz(w) ? [o.at, w.a[1] - w.t/2 - 60, o.w, w.t + 120] : [w.a[0] - w.t/2 - 60, o.at, w.t + 120, o.w];
      const on = editor.sel?.kind === 'open' && editor.sel.i === i && editor.sel.j === j;
      s += `<rect data-op="${i}:${j}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${on ? 'rgba(31,90,68,.18)' : 'rgba(47,111,138,.06)'}" stroke="${on ? '#1f5a44' : 'none'}" stroke-width="2" ${NS} style="cursor:ew-resize"/>`;
    });
    if (sel){
      const mid: Pt2 = [(w.a[0] + w.b[0])/2, (w.a[1] + w.b[1])/2], L = len(w.a, w.b);
      [w.a, w.b].forEach((e, n) => s += `<rect data-eh="${n}" x="${e[0] - 6*k}" y="${e[1] - 6*k}" width="${12*k}" height="${12*k}" fill="#fff" stroke="#1f5a44" stroke-width="2" ${NS} style="cursor:${hz(w) ? 'ew' : 'ns'}-resize"/>`);
      s += `<circle data-em="1" cx="${mid[0]}" cy="${mid[1]}" r="${7*k}" fill="#1f5a44" stroke="#fff" stroke-width="2" ${NS} style="cursor:${hz(w) ? 'ns' : 'ew'}-resize"/>`;
      s += label(mid, `${L} mm`, k, hz(w) ? [0, -16*k] : [18*k, 0]);
    }
  });
  const esel = editor.sel;
  if (esel?.kind === 'room'){
    const r = plan().rooms.find(r => r.id === esel.id);
    if (r) s += `<polygon points="${r.poly.map(p => p.join(',')).join(' ')}" fill="rgba(31,90,68,.10)" stroke="#1f5a44" stroke-width="2" ${NS} pointer-events="none"/>`;
  }
  // 그리는 중인 벽
  if (editor.tool === 'wall'){
    const hv = draw?.cur ?? hover;
    if (draw){
      const L = len(draw.start, draw.cur), mid: Pt2 = [(draw.start[0] + draw.cur[0])/2, (draw.start[1] + draw.cur[1])/2];
      s += `<line x1="${draw.start[0]}" y1="${draw.start[1]}" x2="${draw.cur[0]}" y2="${draw.cur[1]}" stroke="#1f5a44" stroke-width="${WALL_T[editor.wallKind]}" stroke-opacity=".35" pointer-events="none"/>`;
      s += `<line x1="${draw.start[0]}" y1="${draw.start[1]}" x2="${draw.cur[0]}" y2="${draw.cur[1]}" stroke="#1f5a44" stroke-width="2" ${NS} pointer-events="none"/>`;
      s += label(mid, editor.typed ? `${editor.typed}▌ mm` : `${L} mm`, k, [0, -16*k]);
    }
    if (hv) s += `<circle cx="${hv[0]}" cy="${hv[1]}" r="${5*k}" fill="none" stroke="#1f5a44" stroke-width="2" ${NS} pointer-events="none"/><path d="M${hv[0] - 10*k} ${hv[1]}H${hv[0] + 10*k}M${hv[0]} ${hv[1] - 10*k}V${hv[1] + 10*k}" stroke="#1f5a44" stroke-width="1" ${NS} pointer-events="none"/>`;
  }
  g.innerHTML = s;
}
viewHooks.push(() => render());   // 확대·이동 때 손잡이 크기 맞추기

const label = (p: Pt2, text: string, k: number, off: [number, number]) =>
  `<text x="${p[0] + off[0]}" y="${p[1] + off[1]}" font-size="${12*k}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1f5a44" stroke="#fff" stroke-width="${4*k}" paint-order="stroke" pointer-events="none">${esc(text)}</text>`;

// 편집 패널에 보여 줄 요약
export const customSummary = () => { const p = plan(); return `${t('spec.exclusive', {a: fmtArea(p.exclusive)})} · ${t('ed.rooms', {n: p.rooms.length})}`; };
