/* ======================= 무대 위 요소: 타입 정보 · 방 탭 · 미니맵 · 떠 있는 도구 · 선택 막대 ======================= */
import { $, $$, esc } from '../core/dom';
import { ui, view, select, getF, refresh, type LayerKey } from '../core/state';
import { plan, aptType, visibleRooms, roomG } from '../core/plan';
import { bbox } from '../core/geometry';
import { roomName, furnName, fmtArea, typeCode, typeForm, pyeong } from '../core/names';
import { rotateSel, duplicateSel, deleteSel } from '../core/actions';
import { planThumb } from '../plan2d/thumb';
import { applyView, fitView, zoomCenter } from '../plan2d/view';
import { showDims } from '../plan2d/render';
import { svg } from '../plan2d/svg';
import { t } from '../i18n';
import { icon } from './icons';
import { is3D, get3D } from './mode';
import { onBus } from './bus';
import { openSideTab } from './side';
import { toggleTour, touring, stopTour } from './tour';

export function renderStageInfo(){
  const a = aptType(), p = plan();
  $('#stageInfo').innerHTML = `<b>${typeCode(a.id)}</b><span>${typeForm(a)}</span><i></i>
    <span>${t('spec.exclusive', {a: fmtArea(p.exclusive)})} · ${t('spec.supply', {a: fmtArea(a.supply, 1)})} (${t('spec.pyeong', {p: pyeong(a.supply)})})</span>`;
}

/* ---------- 방 탭: 모델하우스처럼 방마다 정해 둔 시점으로 이동 ---------- */
const ROOM_ORDER = ['living', 'kitchen', 'master', 'bed2', 'bed3', 'alpha', 'pantry', 'dress', 'bath1', 'bath2', 'entry', 'utility'];
const KIND_ORDER = ['living', 'kitchen', 'master', 'bed', 'alpha', 'dress', 'bath', 'entry', 'utility', 'balcony', 'hall'];
let activeRoom: string | null = null;
export function renderRoomTabs(){
  const vis = visibleRooms().filter(r => r.kind !== 'hall' && (!r.service || r.kind === 'utility'));
  // 분양 타입은 정해 둔 순서, 내 평면처럼 모르는 id는 그 뒤에 (종류 순)
  const ids = [...ROOM_ORDER.filter(id => vis.some(r => r.id === id)), ...vis.filter(r => !ROOM_ORDER.includes(r.id)).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)).map(r => r.id)];
  $('#roomTabs').innerHTML = `<button id="tourBtn" class="tour-btn only3d">${icon('eye')}${t('tour.start')}</button><span class="sep only3d"></span>`
    + `<button data-room="__all" class="${activeRoom ? '' : 'on'}">${t('tabs.all')}</button><span class="sep"></span>`
    + ids.map(id => `<button data-room="${id}" class="${activeRoom === id ? 'on' : ''}">${esc(roomName(id))}</button>`).join('');
  $$('#roomTabs button[data-room]').forEach(b => b.onclick = () => { if (touring()) stopTour(); goRoom(b.dataset.room === '__all' ? null : b.dataset.room!); });
  $('#tourBtn').onclick = toggleTour;
}
function setActiveRoom(id: string | null){
  activeRoom = id;
  $$('#roomTabs button[data-room]').forEach(b => b.classList.toggle('on', (b.dataset.room === '__all' ? null : b.dataset.room) === id));
  $$('#minimap .mm-room').forEach(p => p.classList.toggle('on', p.getAttribute('data-room') === id));
}
onBus('roomView', setActiveRoom);

export function goRoom(id: string | null){
  setActiveRoom(id);
  if (is3D()){
    const v = get3D(); if (!v) return;
    if (id) v.flyToRoomView(id); else v.flyOverview();
    return;
  }
  // 2D: 그 방을 화면에 크게
  if (!id){ fitView(); select(null); return; }
  const polys = plan().rooms.filter(r => r.target === id).flatMap(r => r.poly), [x0, y0, x1, y1] = bbox(polys);
  const W = svg.clientWidth, H = svg.clientHeight, pad = 900;
  view.s = Math.min(W/(x1 - x0 + 2*pad), H/(y1 - y0 + 2*pad));
  view.x0 = (x0 + x1)/2 - W/2/view.s; view.y0 = (y0 + y1)/2 - H/2/view.s;
  applyView(); select({kind: 'room', id});
}

/* ---------- 미니맵 ---------- */
export function renderMinimap(){
  const p = plan();
  $('#minimap').innerHTML = planThumb(p, {pad: 250, roomClass: 'mm-room'}).replace('</svg>',
    `<g id="mmCam" pointer-events="none"><path d="M0 0 L-900 -1500 A1750 1750 0 0 1 900 -1500 Z" fill="#1f5a44" opacity=".2"/><circle r="260" fill="#1f5a44" stroke="#fff" stroke-width="80"/></g></svg>`);
  $$('#minimap .mm-room').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); goRoom(el.getAttribute('data-room')); }));
  setActiveRoom(activeRoom && roomG(activeRoom) ? activeRoom : null);
}
onBus('camera', ({x, y, dx, dy}) => {
  const g = document.getElementById('mmCam'); if (!g) return;
  const ang = Math.atan2(dx, -dy)*180/Math.PI;     // 기본 모양은 위쪽(-y)을 바라본다
  g.setAttribute('transform', `translate(${Math.round(x)} ${Math.round(y)}) rotate(${ang.toFixed(1)})`);
});

/* ---------- 떠 있는 도구 ---------- */
export function bindStageTools(){
  $$('#layers .btn').forEach(b => b.onclick = () => {
    const k = b.dataset.layer as LayerKey; ui.layers[k] = !ui.layers[k]; b.classList.toggle('on', ui.layers[k]);
    if (k === 'dims') showDims(); else refresh();
  });
  $('#zoomIn').onclick = () => zoomCenter(1.25);
  $('#zoomOut').onclick = () => zoomCenter(.8);
  $('#fit').onclick = fitView;
  $('#minimap').addEventListener('click', () => goRoom(null));
}

/* ---------- 선택 후 하단 막대: 터치에는 키보드가 없으니 회전·복제·삭제를 여기에 ---------- */
export function renderFab(){
  const fab = $('#fab'), f = ui.sel?.kind === 'furn' ? getF(ui.sel.id) : undefined, r = ui.sel?.kind === 'room' ? ui.sel.id : undefined;
  if (!f && !r){ fab.classList.remove('show'); return; }
  fab.innerHTML = f
    ? `<span class="name">${esc(furnName(f))}</span><button class="btn icon" data-a="rotL" title="${t('fab.rotateL')}">${icon('rotL')}</button><button class="btn" data-a="rotR">${icon('rotR')}${t('fab.rotate')}</button>
       <button class="btn" data-a="dup">${icon('copy')}${t('fab.duplicate')}</button><button class="btn danger" data-a="del">${icon('trash')}${t('fab.delete')}</button><span class="sep"></span>
       <button class="btn" data-a="done">${icon('check')}${t('fab.done')}</button>`
    : `<span class="name">${esc(roomName(r!))}</span><button class="btn" data-a="floor">${icon('paint')}${t('fab.floor')}</button><button class="btn" data-a="done">${icon('check')}${t('fab.done')}</button>`;
  fab.classList.add('show');
  const acts: Record<string, () => void> = {
    rotL: () => rotateSel(-90), rotR: () => rotateSel(90), dup: duplicateSel, del: deleteSel,
    floor: () => openSideTab('style', true), done: () => select(null),
  };
  $$('[data-a]', fab).forEach(b => b.onclick = () => acts[b.dataset.a!]?.());
}

export const currentRoomTab = () => activeRoom;
export function resetRoomTab(){ setActiveRoom(null); }
// 방 탭을 누르지 않고 2D에서 방을 고른 경우에도 탭 표시를 맞춘다
export function syncRoomTabWithSelection(){ if (!is3D()) setActiveRoom(ui.sel?.kind === 'room' ? ui.sel.id : null); }
