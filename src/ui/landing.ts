/* ======================= 첫 화면: 평면 타입 선택 ======================= */
import { $, $$, esc } from '../core/dom';
import { state } from '../core/state';
import { switchType } from '../core/actions';
import { TYPES, TYPE_IDS, getPlan } from '../data/apt';
import type { PresetId, TypeId } from '../data/apt/schema';
import { planThumb } from '../plan2d/thumb';
import { fmtArea, typeCode, typeForm, pyeong } from '../core/names';
import { t, tKey } from '../i18n';
import { icon } from './icons';
import { startEditing } from './editmode';

let onEnter: (() => void) | null = null;

const countRooms = (id: TypeId) => {
  const rooms = TYPES[id as PresetId].rooms;
  return {r: rooms.filter(r => r.kind === 'master' || r.kind === 'bed').length, b: rooms.filter(r => r.kind === 'bath').length};
};

export function openLanding(canContinue: boolean, enter: () => void){
  onEnter = enter;
  const el = $('#landing');
  const cards = TYPE_IDS.map(id => {
    const a = TYPES[id], p = getPlan(a, {ext: true}), {r, b} = countRooms(id);
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
    <div class="ccard"><div class="ic">${icon('edit', 26)}</div><div><b>${t('land.customTitle')}</b><p>${t('land.customDesc')}</p></div>
      <div class="acts">${state.custom ? `<button class="btn ghost" id="landCustomOpen">${t('land.customOpen')}</button>` : ''}<button class="btn primary" id="landCustomNew">${icon('plus')}${t('land.customNew')}</button></div></div>
    <p class="foot">${t('land.foot')}</p></div>`;
  el.hidden = false;
  $$('.tcard', el).forEach(c => c.onclick = () => { switchType(c.dataset.type as TypeId); closeLanding(); });
  document.getElementById('landBack')?.addEventListener('click', () => closeLanding());
  // 내 평면: 새로 그리기(빈 도면) 또는 기존 내 평면 열기 — 편집기는 2D에서 연다
  document.getElementById('landCustomNew')?.addEventListener('click', () => { closeLanding(false); startEditing({blank: true}); });
  document.getElementById('landCustomOpen')?.addEventListener('click', () => { closeLanding(false); switchType('custom'); startEditing(); });
}

export function closeLanding(enter = true){
  $('#landing').hidden = true;
  const fn = onEnter; onEnter = null; if (enter) fn?.();
}
export const landingOpen = () => !$('#landing').hidden;
