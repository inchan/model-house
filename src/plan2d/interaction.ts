/* ======================= 2D 포인터 조작 (마우스 · 펜 · 손가락) ======================= */
import { TAP } from '../core/dom';
import { state, ui, view, getF, snap, commit, mutate, select } from '../core/state';
import { rotateSel } from '../core/actions';
import { norm } from '../core/geometry';
import { closeDrawers, closeMenu } from '../ui/layout';
import { svg, toMM } from './svg';
import { applyView, clampScale, zoomAt } from './view';
import { snapMove, snapPoint } from './snap';
import { renderFurn, renderSel, renderMeasure } from './render';

type Drag =
  | {kind: 'measure'; sx: number; sy: number; moved: boolean}
  | {kind: 'pan'; sx: number; sy: number; x0: number; y0: number; room: string | null; moved: boolean}
  | {kind: 'move' | 'rot' | 'size'; id: string; sx: number; sy: number; ox: number; oy: number; before: string; moved: boolean};

let drag: Drag | null = null;
let pinch: {d: number; s: number; px: number; py: number} | null = null;
const touches = new Map<number, {x: number; y: number}>();     // 지금 평면도에 닿아 있는 손가락
const svgXY = (x: number, y: number): [number, number] => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function pinchInfo(){
  const [a, b] = [...touches.values()];
  return {d: Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c: svgXY((a.x+b.x)/2, (a.y+b.y)/2)};
}

// 끌기 끝: 움직인 가구는 실행 취소 기록에 남긴다
function endDrag(cancel: boolean){
  const d = drag; drag = null; svg.classList.remove('panning');
  if (!d) return;
  if (d.kind === 'measure'){
    if (cancel){ ui.mA = ui.mCur = null; renderMeasure(); return; }
    if (d.moved && ui.mA && ui.mCur && Math.hypot(ui.mCur.x-ui.mA.x, ui.mCur.y-ui.mA.y) > 20){
      const a = ui.mA, b = ui.mCur; ui.mA = ui.mCur = null; mutate(() => { state.measures.push({a, b}); });
    }
    renderMeasure(); return;                   // 끌지 않았으면 시작점을 남겨 두고 두 번째 클릭을 기다린다
  }
  if (d.kind === 'pan'){
    if (!cancel && !d.moved && ui.tool === 'select') select(d.room ? {kind: 'room', id: d.room} : null);
    return;
  }
  if (d.moved) commit(d.before);
}

export function bindPlanPointer(){
  svg.addEventListener('pointerdown', e => {
    if (e.button === 1 || e.button === 2) return;
    closeDrawers(); closeMenu();
    if (e.pointerType !== 'mouse'){
      touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
      svg.setPointerCapture(e.pointerId);
      if (touches.size >= 2){                    // 두 번째 손가락: 한 손가락 동작을 취소하고 두 손가락 확대·이동으로
        endDrag(drag?.kind === 'measure' || drag?.kind === 'pan');
        const {d, c} = pinchInfo();
        pinch = {d, s: view.s, px: view.x0 + c[0]/view.s, py: view.y0 + c[1]/view.s};
        return;
      }
    }
    if (pinch) return;
    const p = toMM(e), target = e.target as Element;
    if (ui.tool === 'measure'){
      const q = snapPoint(p, e.shiftKey);
      if (!ui.mA){ ui.mA = q; ui.mCur = q; drag = {kind: 'measure', sx: e.clientX, sy: e.clientY, moved: false}; svg.setPointerCapture(e.pointerId); }
      else { const a = ui.mA; ui.mA = null; ui.mCur = null; if (Math.hypot(q.x-a.x, q.y-a.y) > 20) mutate(() => { state.measures.push({a, b: q}); }); }
      renderMeasure(); return;
    }
    const h = target.closest<SVGElement>('[data-handle]'), fe = target.closest<SVGElement>('[data-fid]');
    if (h && ui.sel?.kind === 'furn'){
      drag = {kind: h.dataset.handle as 'rot' | 'size', id: ui.sel.id, sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, before: snap(), moved: false};
    } else if (ui.tool === 'select' && fe && getF(fe.dataset.fid!)){
      const f = getF(fe.dataset.fid!)!;
      if (ui.sel?.id !== f.id) select({kind: 'furn', id: f.id});
      drag = {kind: 'move', id: f.id, sx: e.clientX, sy: e.clientY, ox: p.x-f.cx, oy: p.y-f.cy, before: snap(), moved: false};
    } else {
      const room = target.closest<SVGElement>('[data-room]');
      drag = {kind: 'pan', sx: e.clientX, sy: e.clientY, x0: view.x0, y0: view.y0, room: room?.dataset.room ?? null, moved: false};
    }
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (pinch){
      if (touches.size < 2) return;
      const {d, c} = pinchInfo(), ns = clampScale(pinch.s * d / pinch.d);
      view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; applyView();
      return;
    }
    const p = toMM(e);
    if (!drag){
      if (ui.tool === 'measure' && ui.mA){ ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); }
      return;
    }
    const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
    if (drag.kind === 'measure'){
      if (far) drag.moved = true;
      ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); return;
    }
    if (drag.kind === 'pan'){
      if (!drag.moved && !far) return;
      drag.moved = true; svg.classList.add('panning');
      view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; applyView(); return;
    }
    const f = getF(drag.id); if (!f) return;
    if (!drag.moved && !far) return;             // 가구를 톡 누르기만 했을 때 흔들리지 않게
    drag.moved = true;
    if (drag.kind === 'move'){
      [f.cx, f.cy] = snapMove(f, p.x-drag.ox, p.y-drag.oy);
    } else if (drag.kind === 'rot'){
      const a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
      f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
    } else {
      const a = f.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
      const dx = p.x-f.cx, dy = p.y-f.cy, lx = dx*c + dy*s, ly = -dx*s + dy*c;
      const ax = -f.w/2, ay = -f.d/2;
      const nw = Math.max(100, Math.round((lx-ax)/10)*10), nd = Math.max(100, Math.round((ly-ay)/10)*10);
      const mx = ax + nw/2, my = ay + nd/2;
      f.cx += mx*c - my*s; f.cy += mx*s + my*c; f.w = nw; f.d = nd;
    }
    renderFurn(); renderSel();
  });

  const onEnd = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    if (pinch){ if (touches.size < 2) pinch = null; return; }   // 두 손가락이 끝난 뒤 남은 손가락은 아무 동작도 하지 않는다
    endDrag(e.type === 'pointercancel');
  };
  svg.addEventListener('pointerup', onEnd);
  svg.addEventListener('pointercancel', onEnd);
  // iPad Safari가 두 손가락 제스처를 페이지 전체 확대로 처리하지 않게 막는다
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(view.s*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .0015)), e.clientX-r.left, e.clientY-r.top);
  }, {passive: false});
  svg.addEventListener('dblclick', e => { if (ui.tool === 'select' && (e.target as Element).closest('[data-fid]')) rotateSel(90); });
  svg.addEventListener('contextmenu', e => { if (ui.tool === 'measure'){ e.preventDefault(); ui.mA = null; renderMeasure(); } });
}
