/* ======================= 평면 편집 패널 (오른쪽) ======================= */
import { $, $$, esc } from '../core/dom';
import { state, mutate } from '../core/state';
import { plan, roomArea } from '../core/plan';
import { roomName, baseRoomName, fmtArea, customName } from '../core/names';
import { editor, setEdTool, deleteEdSel, updateWall, setWallLength, updateOpening, setRoomKind, customSummary, type EdTool } from '../plan2d/editor';
import type { RoomKind, WallKind } from '../data/apt/schema';
import { t, tKey, type Key } from '../i18n';
import { icon, type IconName } from './icons';

const TOOLS: [EdTool, IconName, Key, string][] = [
  ['select', 'select', 'ed.tSelect', 'V'], ['wall', 'wall', 'ed.tWall', 'W'], ['door', 'door', 'ed.tDoor', 'D'],
  ['window', 'window', 'ed.tWindow', 'N'], ['slide', 'slide', 'ed.tSlide', ''], ['gap', 'gap', 'ed.tGap', ''],
];
const WALL_KINDS: [WallKind, Key][] = [['e', 'ed.kExt'], ['b', 'ed.kBearing'], ['n', 'ed.kLight']];
const ROOM_KINDS: RoomKind[] = ['living', 'kitchen', 'master', 'bed', 'bath', 'entry', 'hall', 'dress', 'alpha', 'utility', 'balcony'];

export function renderEditPanel(el: HTMLElement, onDone: () => void, onReset: () => void){
  const tools = TOOLS.map(([id, ic, label, key]) => `<button class="btn ${editor.tool === id ? 'on' : ''}" data-edtool="${id}" title="${t(label)}${key ? ` (${key})` : ''}">${icon(ic)}<span>${t(label)}</span></button>`).join('');
  const kinds = WALL_KINDS.map(([k, label]) => `<button class="btn chip ${editor.wallKind === k ? 'on' : ''}" data-wk="${k}">${t(label)}</button>`).join('');
  const rooms = plan().rooms.map(r => `<button class="edroom ${editor.sel?.kind === 'room' && editor.sel.id === r.id ? 'on' : ''}" data-room="${r.id}"><b>${esc(roomName(r.id))}</b><small>${fmtArea(roomArea(r.id), 1)}</small></button>`).join('');
  el.innerHTML = `
    <div class="sec"><div class="sec-h"><h3>${t('ed.title')}</h3><small>${customSummary()}</small></div>
      <div class="edtools">${tools}</div>
      <p class="note" style="margin:8px 0 0">${t(('ed.tip.' + editor.tool) as Key)}</p></div>
    ${editor.tool === 'wall' ? `<div class="sec"><div class="sec-h"><h3>${t('ed.newWall')}</h3></div><div class="grp" style="display:inline-flex">${kinds}</div></div>` : ''}
    ${selCard()}
    <div class="sec"><div class="sec-h"><h3>${t('ed.rooms.header')}</h3><small>${t('ed.rooms.sub')}</small></div><div class="edrooms">${rooms || `<p class="note">${t('ed.noRooms')}</p>`}</div></div>
    <div class="actions" style="margin-bottom:10px">
      <button class="btn primary" id="edDone">${icon('check')}${t('ed.done')}</button>
      <button class="btn" id="edReset">${icon('reset')}${t('ed.reset')}</button>
    </div>`;
  $$('[data-edtool]', el).forEach(b => b.onclick = () => setEdTool(b.dataset.edtool as EdTool));
  $$('[data-wk]', el).forEach(b => b.onclick = () => { editor.wallKind = b.dataset.wk as WallKind; renderEditPanel(el, onDone, onReset); });
  $$('[data-room]', el).forEach(b => b.onclick = () => { editor.sel = {kind: 'room', id: b.dataset.room!}; if (editor.tool !== 'select') setEdTool('select'); else renderEditPanel(el, onDone, onReset); });
  $('#edDone', el).onclick = onDone;
  $('#edReset', el).onclick = onReset;
  bindSel(el);
}

function selCard(){
  const s = editor.sel, c = state.custom; if (!s || !c) return '';
  const head = (title: string) => `<div class="sec-h"><h3>${title}</h3><button class="btn icon danger" id="edDel" title="${t('furnp.delete')}">${icon('trash')}</button></div>`;
  if (s.kind === 'wall'){
    const w = c.walls[s.i]; if (!w) return '';
    const L = Math.abs(w.a[0] - w.b[0]) + Math.abs(w.a[1] - w.b[1]);
    const kinds = ([['e', 'ed.kExt'], ['b', 'ed.kBearing'], ['n', 'ed.kLight'], ['low', 'ed.kLow']] as [WallKind, Key][]).map(([k, l]) => `<option value="${k}" ${w.kind === k ? 'selected' : ''}>${t(l)}</option>`).join('');
    return `<div class="sel-card">${head(t('ed.wall'))}<div class="form">
      <label>${t('ed.wallKind')}<select id="edWk">${kinds}</select></label>
      <label>${t('ed.length')} (mm)<input type="number" id="edLen" value="${L}" min="100" step="10"></label>
      <label class="full note">${t('ed.wallTip')}</label></div></div>`;
  }
  if (s.kind === 'open'){
    const o = c.walls[s.i]?.open?.[s.j]; if (!o) return '';
    const isDoor = o.kind === 'door' || o.kind === 'entry';
    return `<div class="sel-card">${head(t(('ed.o.' + o.kind) as Key))}<div class="form">
      <label>${t('ed.width')} (mm)<input type="number" id="edOw" value="${o.w}" min="400" step="10"></label>
      ${o.kind === 'window' ? `<label>${t('ed.sill')} (m)<input type="number" id="edSill" value="${o.sill ?? .9}" min="0" max="2" step=".05"></label>` : '<span></span>'}
      </div>${isDoor ? `<div class="actions">
        <button class="btn" id="edFlipSide">${t('ed.flipSide')}</button><button class="btn" id="edFlipHinge">${t('ed.flipHinge')}</button>
        <button class="btn ${o.kind === 'entry' ? 'on' : ''}" id="edEntry">${t('ed.entryDoor')}</button></div>` : ''}</div>`;
  }
  const r = plan().rooms.find(r => r.id === s.id); if (!r) return '';
  const opts = ROOM_KINDS.map(k => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${esc(tKey('kind.' + k, k))}</option>`).join('');
  return `<div class="sel-card"><div class="sec-h"><h3>${t('ed.room')}</h3><small>${fmtArea(roomArea(r.id))}</small></div><div class="form">
    <label>${t('ed.roomKind')}<select id="edRk">${opts}</select></label>
    <label>${t('room.name')}<input id="edRn" value="${esc(roomName(r.id))}" maxlength="40"></label></div></div>`;
}

function bindSel(el: HTMLElement){
  const s = editor.sel, c = state.custom; if (!s || !c) return;
  document.getElementById('edDel')?.addEventListener('click', deleteEdSel);
  if (!el.querySelector('.sel-card')) return;   // 선택한 항목이 사라진 경우
  if (s.kind === 'wall'){
    $<HTMLSelectElement>('#edWk', el).onchange = e => updateWall(s.i, {kind: (e.target as HTMLSelectElement).value as WallKind});
    $<HTMLInputElement>('#edLen', el).onchange = e => setWallLength(s.i, Math.round(+(e.target as HTMLInputElement).value));
  } else if (s.kind === 'open'){
    const o = c.walls[s.i]?.open?.[s.j]; if (!o) return;
    $<HTMLInputElement>('#edOw', el).onchange = e => updateOpening(s.i, s.j, {w: Math.max(400, Math.round(+(e.target as HTMLInputElement).value))});
    document.querySelector<HTMLInputElement>('#edSill')?.addEventListener('change', e => updateOpening(s.i, s.j, {sill: +(e.target as HTMLInputElement).value}));
    document.getElementById('edFlipSide')?.addEventListener('click', () => updateOpening(s.i, s.j, {side: o.side === -1 ? 1 : -1}));
    document.getElementById('edFlipHinge')?.addEventListener('click', () => updateOpening(s.i, s.j, {hinge: o.hinge === 'end' ? 'start' : 'end'}));
    document.getElementById('edEntry')?.addEventListener('click', () => {
      // 현관문은 하나만: 다른 현관문은 일반 문으로
      mutate(() => { for (const w of c.walls) for (const x of w.open ?? []) if (x.kind === 'entry') x.kind = 'door'; });
      updateOpening(s.i, s.j, {kind: o.kind === 'entry' ? 'door' : 'entry'});
    });
  } else {
    $<HTMLSelectElement>('#edRk', el).onchange = e => setRoomKind(s.id, (e.target as HTMLSelectElement).value as RoomKind);
    $<HTMLInputElement>('#edRn', el).onchange = e => mutate(() => {
      const name = customName((e.target as HTMLInputElement).value, baseRoomName(s.id));
      state.rooms[s.id] = {...(state.rooms[s.id] ?? {mat: 'gangmaru'}), ...(name ? {name} : {})};
      if (!name) delete state.rooms[s.id].name;
    });
  }
}
