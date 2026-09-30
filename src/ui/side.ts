/* ======================= 오른쪽 꾸미기 패널: 옵션 · 스타일/마감 · 가구 ======================= */
import { $, $$, esc, narrow } from '../core/dom';
import { state, ui, mutate, getF, select, type Furniture } from '../core/state';
import { plan, aptType, roomMat, roomSpec, roomArea, visibleRooms, estimate } from '../core/plan';
import { bbox, fmt, norm, perim } from '../core/geometry';
import { roomName, baseRoomName, furnName, matName, styleName, wallName, optName, fmtArea, customName, libName } from '../core/names';
import { rotateSel, duplicateSel, deleteSel, reorderSel, setOption, applyStyle, setWallpaper, setRoomMat } from '../core/actions';
import { getPlan } from '../data/apt';
import { MATS, MAT_KEYS, WASTE, type MatKey } from '../data/materials';
import { OPTION_ORDER } from '../data/options';
import { STYLES, STYLE_IDS, WALLPAPERS, WALLPAPER_IDS } from '../data/styles';
import type { OptionId } from '../data/apt/schema';
import { t, fmtKRW, type Key } from '../i18n';
import { icon, type IconName } from './icons';
import { buildLibInto } from './library';
import { editor } from '../plan2d/editor';
import { renderEditPanel } from './editpanel';
import { stopEditing, resetBlank, startEditing } from './editmode';
import { toast } from './toast';

type Tab = 'options' | 'style' | 'furniture';
let tab: Tab = 'options', openRoom: string | null = null;

export function openSideTab(next: Tab, reveal = false){
  tab = next; renderSide();
  if (reveal && narrow()) $('#side').classList.add('open');
}
export function bindSide(){
  $$('.side-tabs .tab').forEach(b => b.onclick = () => { tab = b.dataset.tab as Tab; renderSide(); $('#sidePanel').scrollTop = 0; });
}
// 선택이 바뀌면 맞는 탭을 연다: 가구 → 가구 탭, 공간 → 스타일·마감 탭의 그 방 바닥재
export function followSelection(){
  if (ui.sel?.kind === 'furn') tab = 'furniture';
  else if (ui.sel?.kind === 'room'){ tab = 'style'; openRoom = ui.sel.id; }
  renderSide();
}

export function renderSide(){
  $$('.side-tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const el = $('#sidePanel');
  if (editor.on){ renderEditPanel(el, stopEditing, resetBlank); return; }
  if (tab === 'options'){ el.innerHTML = optionsTab(); bindOptions(); }
  else if (tab === 'style'){ el.innerHTML = styleTab(); bindStyle(); }
  else { el.innerHTML = furnitureTab(); bindFurniture(); }
}

/* ---------- 옵션 ---------- */
const OPT_ICON: Record<OptionId, IconName> = {ext: 'layers', sysac: 'ac', builtin: 'cube', dress: 'furniture', midDoor: 'home', merge: 'grid'};
const priceText = (p: number) => (p ? fmtKRW(p) : t('opt.free'));
function optionsTab(){
  const a = aptType(), est = estimate();
  const pe = getPlan(a, {...state.opts, ext: true}), extGain = pe.usable - pe.exclusive;
  const desc = (id: OptionId) => t(`opt.${id}.desc` as Key, {a: fmtArea(extGain, 1), n: a.sysacUnits ?? 0});
  const cards = OPTION_ORDER.filter(id => a.options.includes(id)).map(id => {
    const on = !!state.opts[id];
    return `<button class="opt ${on ? 'on' : ''}" data-opt="${id}" role="switch" aria-checked="${on}">
      <span class="ic">${icon(OPT_ICON[id])}</span>
      <span><b>${optName(id)}</b><p>${esc(desc(id))}</p></span>
      <span class="price">${priceText(a.price[id] ?? 0)}<span class="switch"></span></span></button>`;
  }).join('');
  if (a.id === 'custom') return `<div class="sec"><div class="sec-h"><h3>${t('opt.header')}</h3></div>
    <p class="note">${t('opt.customNote')}</p><div class="actions"><button class="btn primary" id="optEdit">${icon('edit')}${t('tb.editPlan')}</button></div></div>`;
  return `<div class="sec"><div class="sec-h"><h3>${t('opt.header')}</h3><small>${t('opt.selected', {n: est.options.length, sum: fmtKRW(est.optionSum)})}</small></div>
    <p class="note" style="margin:-4px 0 12px">${t('opt.sub')}</p>${cards}
    <p class="note">${t('sum.note')}</p></div>`;
}
function bindOptions(){
  document.getElementById('optEdit')?.addEventListener('click', () => startEditing());
  $$('#sidePanel [data-opt]').forEach(b => b.onclick = () => {
    const id = b.dataset.opt as OptionId, on = !state.opts[id], price = aptType().price[id] ?? 0;
    setOption(id, on);
    toast(on ? t('toast.optionOn', {name: optName(id), price: priceText(price)}) : t('toast.optionOff', {name: optName(id)}));
  });
}

/* ---------- 스타일 · 마감 ---------- */
function styleTab(){
  const styles = STYLE_IDS.map(id => `<button class="style ${state.style === id ? 'on' : ''}" data-style="${id}">
      <span class="sw">${STYLES[id].swatch.map(c => `<i style="background:${c}"></i>`).join('')}</span>
      <b>${styleName(id)}</b><small>${t(`style.${id}.desc` as Key)}</small></button>`).join('');
  const walls = WALLPAPER_IDS.map(id => `<button class="swatch ${state.wall === id ? 'on' : ''}" data-wall="${id}"><i style="background:${WALLPAPERS[id]}"></i>${wallName(id)}</button>`).join('');
  const rows = floorRooms().map(id => floorRow(id)).join('');
  const est = estimate();
  return `${selRoomCard()}
    <div class="sec"><div class="sec-h"><h3>${t('style.header')}</h3><small>${t('style.sub')}</small></div><div class="styles">${styles}</div></div>
    <div class="sec"><div class="sec-h"><h3>${t('wall.header')}</h3></div><div class="swatches">${walls}</div></div>
    <div class="sec"><div class="sec-h"><h3>${t('floor.header')}</h3><small>${est.finishSum ? signed(est.finishSum) : t('floor.same')}</small></div>
      <p class="note" style="margin:-4px 0 10px">${t('floor.sub')}</p>${rows}</div>`;
}
const signed = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtKRW(Math.abs(v));
// 바닥재를 고를 수 있는 공간: 다른 방에 합쳐지지 않은 공간
const floorRooms = () => {
  const order = ['living', 'kitchen', 'master', 'bed2', 'bed3', 'alpha', 'pantry', 'dress', 'hall', 'entry', 'bath1', 'bath2', 'utility'];
  const vis = visibleRooms().map(r => r.id);
  return [...order.filter(id => vis.includes(id)), ...vis.filter(id => !order.includes(id))];
};
function floorRow(id: string){
  const mat = roomMat(id), base = roomSpec(id)?.mat ?? mat, area = roomArea(id);
  const diff = area*(MATS[mat].price - MATS[base].price)*WASTE;
  const mats = MAT_KEYS.map(k => {
    const d = area*(MATS[k].price - MATS[base].price)*WASTE;
    return `<button class="mat ${k === mat ? 'on' : ''}" data-room="${id}" data-mat="${k}"><i style="background:${MATS[k].sw}"></i>
      <span>${matName(k)}<small>${k === base ? t('floor.same') : signed(d)}</small></span>${k === base ? `<em class="base">${t('floor.base')}</em>` : ''}</button>`;
  }).join('');
  const open = openRoom === id, sel = ui.sel?.kind === 'room' && ui.sel.id === id;
  return `<div class="floor-row ${open ? 'open' : ''} ${sel ? 'sel' : ''}" data-row="${id}"><button data-toggle="${id}">
      <span class="mat-dot" style="background:${MATS[mat].sw}"></span>
      <span><b>${esc(roomName(id))}</b><small>${matName(mat)} · ${fmtArea(area, 1)}</small></span>
      <span class="delta ${diff > 0 ? 'up' : ''}">${diff ? signed(diff) : ''}</span>${icon('chevronRight')}</button>
    <div class="mats">${mats}</div></div>`;
}
function selRoomCard(){
  if (ui.sel?.kind !== 'room') return '';
  const id = ui.sel.id, polys = plan().rooms.filter(r => r.target === id), [x0, y0, x1, y1] = bbox(polys.flatMap(r => r.poly));
  const inside = state.furniture.filter(f => f.cx > x0 && f.cx < x1 && f.cy > y0 && f.cy < y1);
  return `<div class="sel-card"><div class="sec-h"><h3>${t('room.panel')}</h3><button class="btn icon" id="selClose" title="${t('furnp.done')}">${icon('close')}</button></div>
    <div class="form"><label class="full">${t('room.name')}<input id="rName" value="${esc(roomName(id))}" maxlength="60"></label></div>
    <div class="stats"><div><small>${t('room.area')}</small><b>${fmtArea(roomArea(id))}</b></div>
      <div><small>${t('room.perimeter')}</small><b>${fmt(polys.reduce((a, r) => a + perim(r.poly), 0), 1)} m</b></div>
      <div><small>${t('room.width')}</small><b>${x1 - x0}</b> mm</div><div><small>${t('room.depth')}</small><b>${y1 - y0}</b> mm</div></div>
    <div class="note">${t('room.furniture')}: ${inside.length ? inside.map(f => esc(furnName(f))).join(', ') : t('room.none')}</div></div>`;
}
function bindStyle(){
  $$('#sidePanel [data-style]').forEach(b => b.onclick = () => applyStyle(b.dataset.style as typeof state.style));
  $$('#sidePanel [data-wall]').forEach(b => b.onclick = () => setWallpaper(b.dataset.wall as typeof state.wall));
  $$('#sidePanel [data-toggle]').forEach(b => b.onclick = () => {
    const id = b.dataset.toggle!; openRoom = openRoom === id ? null : id;
    $$('#sidePanel .floor-row').forEach(r => r.classList.toggle('open', r.dataset.row === openRoom));
  });
  $$('#sidePanel .mat').forEach(b => b.onclick = () => { openRoom = b.dataset.room!; setRoomMat(b.dataset.room!, b.dataset.mat as MatKey); });
  const rName = document.querySelector<HTMLInputElement>('#rName');
  if (rName && ui.sel?.kind === 'room'){
    const id = ui.sel.id;
    rName.onchange = () => mutate(() => { const name = customName(rName.value, baseRoomName(id)); if (name) state.rooms[id].name = name; else delete state.rooms[id].name; });
    $('#selClose').onclick = () => select(null);
  }
  if (openRoom) document.querySelector(`#sidePanel [data-row="${openRoom}"]`)?.scrollIntoView({block: 'nearest'});
}

/* ---------- 가구 ---------- */
function furnitureTab(){
  const f = ui.sel?.kind === 'furn' ? getF(ui.sel.id) : undefined;
  return `${f ? furnCard(f) : ''}<div class="sec lib"><div class="sec-h"><h3>${t('furn.header')}</h3><small>${t('furn.sub')}</small></div><div id="lib"></div></div>
    <div class="sec"><div class="sec-h"><h3>${t('keys.title')}</h3></div><div class="kv" style="grid-template-columns:auto 1fr">${[
      [t('help.kDrag'), t('help.drag')], ['R', t('help.rotate')], [t('help.kArrows'), t('help.nudge')], ['⌘/Ctrl D', t('help.duplicate')],
      ['Delete', t('help.delete')], ['⌘/Ctrl Z', t('help.undo')], ['T', t('help.toggle3d')], ['F', t('help.fit')], ['Esc', t('help.deselect')],
    ].map(([k, v]) => `<dt><kbd>${esc(k)}</kbd></dt><dd style="text-align:left">${esc(v)}</dd>`).join('')}</div></div>`;
}
function furnCard(f: Furniture){
  const num = (id: string, label: Key, v: number, extra: string, step = 10) => `<label>${t(label)}${extra}<input type="number" id="${id}" value="${v}" step="${step}" ${id === 'fW' || id === 'fD' ? 'min="50"' : ''}></label>`;
  return `<div class="sel-card"><div class="sec-h"><h3>${t('furnp.title')}</h3><button class="btn icon" id="selClose" title="${t('furnp.done')}">${icon('close')}</button></div>
    <div class="form">
      <label class="full">${t('furnp.name')}<input id="fName" value="${esc(furnName(f))}" maxlength="60"></label>
      ${num('fW', 'furnp.width', f.w, ' (mm)')}${num('fD', 'furnp.depth', f.d, ' (mm)')}
      ${num('fR', 'furnp.rotation', f.rot, ' (°)', 15)}
      <label>${t('furnp.color')}<input type="color" id="fC" value="${esc(f.color)}"></label>
    </div>
    <div class="actions">
      <button class="btn" id="aRot">${icon('rotR')}${t('furnp.rotate90')}</button><button class="btn" id="aDup">${icon('copy')}${t('furnp.duplicate')}</button>
      <button class="btn" id="aTop">${t('furnp.toFront')}</button><button class="btn" id="aBot">${t('furnp.toBack')}</button>
      <button class="btn danger" id="aDel">${icon('trash')}${t('furnp.delete')}</button>
    </div></div>`;
}
function bindFurniture(){
  buildLibInto($('#lib'));
  const f = ui.sel?.kind === 'furn' ? getF(ui.sel.id) : undefined;
  if (!f) return;
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
  num('#fR', (g, v) => { g.rot = norm(v); });
  $<HTMLInputElement>('#fC').onchange = e => upd(g => { g.color = (e.target as HTMLInputElement).value; delete g.role; });
  $('#aRot').onclick = () => rotateSel(90);
  $('#aDup').onclick = duplicateSel;
  $('#aDel').onclick = deleteSel;
  $('#aTop').onclick = () => reorderSel(true);
  $('#aBot').onclick = () => reorderSel(false);
  $('#selClose').onclick = () => select(null);
}
