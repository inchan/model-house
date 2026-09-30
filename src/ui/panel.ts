/* ======================= 오른쪽 패널 · 하단 도구 막대 ======================= */
import { $, $$, esc, COARSE } from '../core/dom';
import { state, ui, mutate, getF, select, type Furniture } from '../core/state';
import { area, perim, bbox, fmt, norm } from '../core/geometry';
import { roomName, furnName, matName, fmtArea, customName, libName } from '../core/names';
import { rotateSel, duplicateSel, deleteSel, reorderSel, clearLayout } from '../core/actions';
import { ROOMS, WALLS, type Room } from '../data/plan';
import { MATS, MAT_KEYS, WASTE, type MatKey } from '../data/materials';
import { t, tKey, fmtKRW, type Key } from '../i18n';
import { drawer, closeDrawers } from './layout';
import { icon } from './icons';
import { is3D, get3D } from './mode';

const unitArea = () => t('unit.area');
const kbdList = (rows: [string, string][]) => `<div class="kbd">${rows.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('')}</div>`;

export function renderPanel(){
  renderFab();
  const p = $('#panel');
  if (ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ p.innerHTML = furnPanel(f); bindFurnPanel(f); return; } }
  if (ui.sel?.kind === 'room'){ const r = ROOMS.find(r => r.id === ui.sel!.id); if (r){ p.innerHTML = roomPanel(r); bindRoomPanel(r); return; } }
  p.innerHTML = overviewPanel(); bindOverview();
}

function overviewPanel(){
  const rows = ROOMS.map(r => {
    const st = state.rooms[r.id];
    return `<tr class="click" data-room="${r.id}"><td><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(roomName(r.id))}${r.counted === false ? ' <span class="muted">*</span>' : ''}</td>
      <td class="r">${fmtArea(area(r.poly))}</td></tr>`;
  }).join('');
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a, r) => a + area(r.poly), 0);
  const byMat: Partial<Record<MatKey, number>> = {};
  ROOMS.forEach(r => { const m = state.rooms[r.id].mat; byMat[m] = (byMat[m] ?? 0) + area(r.poly); });
  let cost = 0;
  const matRows = (Object.entries(byMat) as [MatKey, number][]).map(([m, a]) => {
    const c = a*MATS[m].price*WASTE; cost += c;
    return `<tr><td><span class="sw" style="background:${MATS[m].sw}"></span>${esc(matName(m))}</td><td class="r">${fmtArea(a, 1)}</td><td class="r">${fmtKRW(c)}</td></tr>`;
  }).join('');
  const demLen = state.demolished.map(id => WALLS[+id.slice(1)]).reduce((a, w) => a + Math.max(w[2]-w[0], w[3]-w[1]), 0) / 1000;
  const help = COARSE
    ? `<section><h3>${t('ov.touchTitle')}</h3>${kbdList([
        [t('help.kOneFinger'), t('help.onePan')], [t('help.kTwoFingers'), t('help.twoZoom')], [t('help.kLibrary'), t('help.library')],
        [t('help.kTapItem'), t('help.tapItem')], [t('help.kToolbar'), t('help.toolbar')], [t('help.kMeasure'), t('help.measureTouch')],
        [t('help.kWalk'), t('help.walkTouch')]])}</section>`
    : '';
  return `
  <section><h3>${t('ov.rooms')} <small>${t('ov.roomsSub')}</small></h3>
    <table>${rows}</table>
    <div class="total"><span>${t('ov.netTotal')}</span><b>${fmtArea(tot)}</b></div>
    <div class="muted" style="font-size:11px;margin-top:4px">${t('ov.note')}</div></section>
  <section><h3>${t('ov.flooring')} <small>${t('ov.flooringSub')}</small></h3>
    <table>${matRows}</table>
    <div class="total"><span>${t('ov.flooringTotal')}</span><b>${fmtKRW(cost)}</b></div></section>
  <section><h3>${t('ov.stats')}</h3>
    <div class="stats"><div><small>${t('ov.furnCount')}</small><span class="big">${state.furniture.length}</span></div>
      <div><small>${t('ov.wallsRemoved')}</small><span class="big">${fmt(demLen, 1)}</span> m</div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${t('ov.clearMeasures')} (${state.measures.length})</button>
      <button class="btn danger" id="clearFurn">${t('ov.clearLayout')}</button></div></section>
  ${help}
  <section><h3>${t('ov.keysTitle')}</h3>${kbdList([
    [t('help.kDrag'), t('help.drag')], ['V', t('help.select')], ['M', t('help.measure')], ['X', t('help.demolish')], ['R', t('help.rotate')],
    [t('help.kArrows'), t('help.nudge')], ['⌘/Ctrl D', t('help.duplicate')], ['Delete', t('help.delete')], ['⌘/Ctrl Z', t('help.undo')],
    ['T', t('help.toggle3d')], ['F', t('help.fit')], ['Esc', t('help.deselect')]])}</section>`;
}
function bindOverview(){
  $$('#panel tr[data-room]').forEach(row => row.onclick = () => {
    const id = row.dataset.room!;
    select({kind: 'room', id});
    if (is3D()) get3D()?.flyToRoom(id);
  });
  $('#clearMeasure').onclick = () => { if (state.measures.length) mutate(() => { state.measures = []; }); };
  $('#clearFurn').onclick = clearLayout;
}

// 하단 떠 있는 막대: 터치에는 키보드가 없으니 회전·복제·삭제를 여기에 둔다
function renderFab(){
  const fab = $('#fab'), f = ui.sel?.kind === 'furn' ? getF(ui.sel.id) : undefined, r = ui.sel?.kind === 'room' ? ROOMS.find(r => r.id === ui.sel!.id) : undefined;
  if (!f && !r){ fab.classList.remove('show'); return; }
  fab.innerHTML = f
    ? `<span class="name">${esc(furnName(f))}</span><button class="btn icon" data-a="rotL" title="${t('fab.rotateL')}">${icon('rotL')}</button><button class="btn" data-a="rotR">${icon('rotR')}${t('fab.rotate')}</button>
       <button class="btn" data-a="dup">${icon('copy')}${t('fab.duplicate')}</button><button class="btn danger" data-a="del">${icon('trash')}${t('fab.delete')}</button><span class="sep"></span>
       <button class="btn narrow-only" data-a="prop">${icon('props')}${t('fab.props')}</button><button class="btn" data-a="done">${icon('check')}${t('fab.done')}</button>`
    : `<span class="name">${esc(roomName(r!.id))}</span><button class="btn narrow-only" data-a="prop">${icon('props')}${t('fab.roomProps')}</button><button class="btn" data-a="done">${icon('check')}${t('fab.done')}</button>`;
  fab.classList.add('show');
  const acts: Record<string, () => void> = {
    rotL: () => rotateSel(-90), rotR: () => rotateSel(90), dup: duplicateSel, del: deleteSel,
    prop: () => drawer('panel', true), done: () => { select(null); closeDrawers(); },
  };
  $$('[data-a]', fab).forEach(b => b.onclick = () => acts[b.dataset.a!]?.());
}

function roomPanel(r: Room){
  const st = state.rooms[r.id], a = area(r.poly), [x0, y0, x1, y1] = bbox(r.poly);
  const inside = state.furniture.filter(f => f.cx > x0 && f.cx < x1 && f.cy > y0 && f.cy < y1);
  const mats = MAT_KEYS.map(k => `<button class="mat ${k === st.mat ? 'on' : ''}" data-mat="${k}"><i style="background:${MATS[k].sw}"></i><span>${esc(matName(k))}<small>${fmtKRW(MATS[k].price)}/${unitArea()}</small></span></button>`).join('');
  return `<section><h3>${t('room.panel')}</h3>
    <div class="form"><label class="full">${t('room.name')}<input id="rName" value="${esc(roomName(r.id))}" maxlength="60"></label></div>
    <div class="stats" style="margin-top:10px">
      <div><small>${t('room.area')}</small><span class="big">${fmt(a)}</span> ${unitArea()}</div>
      <div><small>${t('room.perimeter')}</small><span class="big">${fmt(perim(r.poly), 1)}</span> m</div>
      <div><small>${t('room.width')}</small><span class="big">${x1-x0}</span> mm</div>
      <div><small>${t('room.depth')}</small><span class="big">${y1-y0}</span> mm</div></div>
    <div class="muted">${t('room.wallArea', {a: fmtArea(perim(r.poly)*2.8, 1)})}</div></section>
  <section><h3>${t('room.flooring')}</h3><div class="mats">${mats}</div>
    <div class="total"><span>${t('room.cost')}</span><b>${fmtKRW(a*MATS[st.mat].price*WASTE)}</b></div></section>
  <section><h3>${t('room.furniture')} <small>${t('unit.count', {n: inside.length})}</small></h3>
    <table>${inside.map(f => `<tr class="click" data-fid="${esc(f.id)}"><td>${esc(furnName(f))}</td><td class="r muted">${f.w}×${f.d}</td></tr>`).join('') || `<tr><td class="muted">${t('room.none')}</td></tr>`}</table>
    <div class="actions"><button class="btn" id="back">${t('room.back')}</button></div></section>`;
}
function bindRoomPanel(r: Room){
  $<HTMLInputElement>('#rName').onchange = e => {
    const v = (e.target as HTMLInputElement).value;
    mutate(() => { const name = customName(v, tKey('room.' + r.id, r.id)); if (name) state.rooms[r.id].name = name; else delete state.rooms[r.id].name; });
  };
  $$('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => { state.rooms[r.id].mat = b.dataset.mat as MatKey; }));
  $$('#panel tr[data-fid]').forEach(row => row.onclick = () => select({kind: 'furn', id: row.dataset.fid!}));
  $('#back').onclick = () => select(null);
}

function furnPanel(f: Furniture){
  const num = (id: string, label: Key, v: number, extra: string) => `<label>${t(label)}${extra}<input type="number" id="${id}" value="${v}" ${id === 'fR' ? 'step="15"' : 'step="10"'} ${id === 'fW' || id === 'fD' ? 'min="50"' : ''}></label>`;
  return `<section><h3>${t('furnp.title')}</h3>
    <div class="form">
      <label class="full">${t('furnp.name')}<input id="fName" value="${esc(furnName(f))}" maxlength="60"></label>
      ${num('fW', 'furnp.width', f.w, ' (mm)')}${num('fD', 'furnp.depth', f.d, ' (mm)')}
      ${num('fX', 'furnp.center', Math.round(f.cx), ' X (mm)')}${num('fY', 'furnp.center', Math.round(f.cy), ' Y (mm)')}
      ${num('fR', 'furnp.rotation', f.rot, ' (°)')}
      <label>${t('furnp.color')}<input type="color" id="fC" value="${esc(f.color)}"></label>
    </div>
    <div class="muted" style="margin-top:8px">${t('furnp.footprint')} ${fmtArea(f.w*f.d/1e6)}</div>
    <div class="actions">
      <button class="btn" id="aRot">${icon('rotR')}${t('furnp.rotate90')}</button><button class="btn" id="aDup">${icon('copy')}${t('furnp.duplicate')}</button>
      <button class="btn" id="aTop">${t('furnp.toFront')}</button><button class="btn" id="aBot">${t('furnp.toBack')}</button>
      <button class="btn danger" id="aDel">${icon('trash')}${t('furnp.delete')}</button><button class="btn" id="back">${t('furnp.back')}</button>
    </div></section>
  <section class="muted" style="font-size:12px">${t('furnp.help')}</section>`;
}
function bindFurnPanel(f: Furniture){
  const upd = (fn: (g: Furniture) => void) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  const num = (id: string, fn: (g: Furniture, v: number) => void) => {
    $<HTMLInputElement>(id).onchange = e => { const v = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(v)) upd(g => fn(g, v)); };
  };
  $<HTMLInputElement>('#fName').onchange = e => {
    const v = (e.target as HTMLInputElement).value;
    upd(g => { g.name = customName(v, g.key ? libName(g.key) : ''); if (!g.name && !g.key) g.name = furnName(f); });
  };
  num('#fW', (g, v) => { g.w = Math.max(50, Math.round(v)); });
  num('#fD', (g, v) => { g.d = Math.max(50, Math.round(v)); });
  num('#fX', (g, v) => { g.cx = v; }); num('#fY', (g, v) => { g.cy = v; }); num('#fR', (g, v) => { g.rot = norm(v); });
  $<HTMLInputElement>('#fC').onchange = e => upd(g => { g.color = (e.target as HTMLInputElement).value; });
  $('#aRot').onclick = () => rotateSel(90);
  $('#aDup').onclick = duplicateSel;
  $('#aDel').onclick = deleteSel;
  $('#aTop').onclick = () => reorderSel(true);
  $('#aBot').onclick = () => reorderSel(false);
  $('#back').onclick = () => select(null);
}
