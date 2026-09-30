/* ======================= 가구 목록 ======================= */
import { $, $$, esc, COARSE, TAP, narrow } from '../core/dom';
import { ui, view } from '../core/state';
import { bbox } from '../core/geometry';
import { catName, libName } from '../core/names';
import { addItem } from '../core/actions';
import { LIB, type LibItem } from '../data/library';
import { ROOMS } from '../data/plan';
import { furnSVG } from '../plan2d/symbols';
import { toMM } from '../plan2d/svg';
import { viewCenter } from '../plan2d/view';
import { t } from '../i18n';
import { drawer, closeDrawers } from './layout';
import { is3D, get3D } from './mode';
import { toast } from './toast';

const itemOf = (el: HTMLElement): LibItem => { const [ci, ii] = el.dataset.key!.split(':').map(Number); return LIB[ci].items[ii]; };

export function buildLib(){
  const how = COARSE ? t('lib.howTouch') : t('lib.how');
  $('#lib').innerHTML = LIB.map((c, ci) => `<h4>${esc(catName(c.cat))}</h4><div class="lib-grid">${c.items.map((it, ii) => {
    const pad = Math.max(it.w, it.d)*.08;
    return `<div class="item" data-key="${ci}:${ii}" title="${t('lib.itemTitle')}">
      <svg viewBox="${-it.w/2-pad} ${-it.d/2-pad} ${it.w+2*pad} ${it.d+2*pad}">${furnSVG(it.type, it.w, it.d, it.color)}</svg><b>${esc(libName(it.key))}</b><small>${it.w}×${it.d}</small></div>`;
  }).join('')}</div>`).join('') + `<div class="hint">${esc(t('lib.hint', {how}))}</div>`;
  $$('#lib .item').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.button) return;
    libDrag = {el, id: e.pointerId, sx: e.clientX, sy: e.clientY, it: itemOf(el), ghost: null};
  }));
}

/* 가구 목록 끌어 놓기: pointer 이벤트로 구현 (iPad에서 HTML5 드래그 앤 드롭이 불안정).
 * 목록은 touch-action:pan-y 라서 세로로 밀면 브라우저가 스크롤(pointercancel 발생)하고, 가로로 끌어야 끌어 놓기가 시작된다 */
let libDrag: {el: HTMLElement; id: number; sx: number; sy: number; it: LibItem; ghost: HTMLDivElement | null} | null = null;

// 화면 좌표 → 도면 좌표(mm). 2D는 평면도 좌표, 3D는 시선과 바닥의 교점. s = 그 지점에서 mm당 화면 픽셀
function dropPoint(x: number, y: number): {x: number; y: number; s: number} | null {
  const r = $('#stage').getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (document.elementFromPoint(x, y)?.closest('aside.open,#fab,#walkOverlay,#joy,#walkExit')) return null;
  if (is3D()) return get3D()?.groundAt(x, y) ?? null;
  const p = toMM({clientX: x, clientY: y}); return {x: p.x, y: p.y, s: view.s};
}

export function bindLibDrag(){
  addEventListener('pointermove', e => {
    if (!libDrag || e.pointerId !== libDrag.id) return;
    const {it} = libDrag;
    if (!libDrag.ghost){
      if (Math.hypot(e.clientX-libDrag.sx, e.clientY-libDrag.sy) < TAP) return;
      const g = libDrag.ghost = document.createElement('div'); g.id = 'ghost';
      g.innerHTML = `<svg viewBox="${-it.w/2} ${-it.d/2} ${it.w} ${it.d}">${furnSVG(it.type, it.w, it.d, it.color)}</svg>`;
      document.body.appendChild(g); libDrag.el.classList.add('dragging');
    }
    // 끌고 있는 모양을 놓일 지점의 축척에 맞춰 실제 크기로 보여 준다 (3D에서는 멀수록 작게)
    const g = libDrag.ghost, s = Math.max(dropPoint(e.clientX, e.clientY)?.s || (is3D() ? .05 : view.s), .02);
    Object.assign(g.style, {width: Math.max(28, it.w*s) + 'px', height: Math.max(20, it.d*s) + 'px', left: e.clientX + 'px', top: e.clientY + 'px'});
    const lib = $('aside.lib');
    if (narrow() && lib.classList.contains('open') && e.clientX > lib.getBoundingClientRect().right) drawer(null);   // 서랍 밖으로 끌면 자동으로 닫는다
  });
  const end = (e: PointerEvent, ok: boolean) => {
    if (!libDrag || e.pointerId !== libDrag.id) return;
    const d = libDrag; libDrag = null;
    d.el.classList.remove('dragging');
    if (d.ghost){
      d.ghost.remove();
      if (!ok) return;
      const p = dropPoint(e.clientX, e.clientY);
      if (p) addItem(d.it, p.x, p.y);
      else if (is3D() && e.clientX > $('#stage').getBoundingClientRect().left) toast(t('toast.dropOnFloor'));
      return;
    }
    if (!ok) return;
    // 그냥 누른 경우: 선택한 방이 있으면 그 방 가운데, 없으면 화면 가운데 (3D는 화면 가운데가 가리키는 바닥)
    let p: {x: number; y: number} | null = null;
    const room = ui.sel?.kind === 'room' ? ROOMS.find(r => r.id === ui.sel!.id) : undefined;
    if (room){ const b = bbox(room.poly); p = {x: (b[0]+b[2])/2, y: (b[1]+b[3])/2}; }
    else if (is3D()){ const r = $('#stage').getBoundingClientRect(); p = get3D()?.groundAt(r.left + r.width/2, r.top + r.height/2) ?? null; }
    p ??= viewCenter();
    addItem(d.it, p.x, p.y);
    closeDrawers();
  };
  addEventListener('pointerup', e => end(e, true));
  addEventListener('pointercancel', e => end(e, false));
}
