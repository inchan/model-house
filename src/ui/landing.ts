/* ======================= 첫 화면: 평면 타입 선택 ======================= */
import { $, $$, esc } from '../core/dom';
import { state } from '../core/state';
import { switchType } from '../core/actions';
import { TYPES, TYPE_IDS, getPlan } from '../data/apt';
import type { TypeId } from '../data/apt/schema';
import { planThumb } from '../plan2d/thumb';
import { fmtArea, typeCode, typeForm, pyeong } from '../core/names';
import { t, tKey } from '../i18n';
import { icon } from './icons';

let onEnter: (() => void) | null = null;

const countRooms = (id: TypeId) => {
  const rooms = TYPES[id].rooms;
  return {r: rooms.filter(r => r.kind === 'master' || r.kind === 'bed').length, b: rooms.filter(r => r.kind === 'bath').length};
};

export function openLanding(canContinue: boolean, enter: () => void){
  onEnter = enter;
  const el = $('#landing');
  const cards = TYPE_IDS.map(id => {
    const a = TYPES[id], p = getPlan(id, {ext: true}), {r, b} = countRooms(id);
    return `<button class="tcard ${canContinue && state.type === id ? 'cur' : ''}" data-type="${id}">
      <div class="thumb">${planThumb(p, {showFurniture: a.furniture.map(f => ({cx: f.cx, cy: f.cy, w: f.w, d: f.d, rot: f.rot ?? 0}))})}</div>
      <div class="body">
        <div class="name"><b>${typeCode(id)}</b><span>${typeForm(a)}</span></div>
        <div class="spec">${t('spec.exclusive', {a: fmtArea(p.exclusive)})} · ${t('spec.supply', {a: fmtArea(a.supply, 1)})} (${t('spec.pyeong', {p: pyeong(a.supply)})})<br>${t('spec.rooms', {r, b})} · ${t('spec.usable', {a: fmtArea(p.usable, 1)})}</div>
        <div class="tags">${a.tags.map(k => `<span>${esc(tKey(k))}</span>`).join('')}</div>
        <div class="go">${canContinue && state.type === id ? t('land.current') : t('land.enter')}${icon('arrowRight')}</div>
      </div></button>`;
  }).join('');
  el.innerHTML = `<div class="land">
    <div class="land-top"><div class="brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8"/><path d="M8 15.5 16 9l8 6.5V24h-5v-5h-6v5H8z"/></svg><span>${t('app.brand')}</span></div>
      ${canContinue ? `<button class="btn ghost" id="landBack">${t('land.continue')}${icon('arrowRight')}</button>` : ''}</div>
    <h1>${t('land.h1')}</h1>
    <p class="lead">${t('land.lead')}</p>
    <div class="cards">${cards}</div>
    <p class="foot">${t('land.foot')}</p></div>`;
  el.hidden = false;
  $$('.tcard', el).forEach(c => c.onclick = () => { switchType(c.dataset.type as TypeId); closeLanding(); });
  document.getElementById('landBack')?.addEventListener('click', closeLanding);
}

export function closeLanding(){
  $('#landing').hidden = true;
  const fn = onEnter; onEnter = null; fn?.();
}
export const landingOpen = () => !$('#landing').hidden;
