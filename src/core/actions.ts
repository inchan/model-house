/* ======================= 편집 동작 ======================= */
import { state, ui, mutate, getF, uid, F, undo, defaultTypeState, styledRooms, stagedFurniture } from './state';
import { aptType } from './plan';
import { resolveType } from '../data/apt/custom';
import { norm } from './geometry';
import { libName } from './names';
import type { OptionId, TypeId } from '../data/apt/schema';
import type { LibItem } from '../data/library';
import type { MatKey } from '../data/materials';
import { STYLES, type StyleId, type WallpaperId } from '../data/styles';
import { pushOut } from '../plan2d/snap';
import { toast } from '../ui/toast';
import { t, tKey } from '../i18n';

export const undoOrToast = () => { if (!undo()) toast(t('toast.nothingToUndo')); };

const selFurn = () => (ui.sel?.kind === 'furn' ? getF(ui.sel.id) : undefined);

export function rotateSel(deg: number){
  const f = selFurn(); if (f) mutate(() => { f.rot = norm(f.rot + deg); });
}
export function deleteSel(){
  const f = selFurn(); if (!f) return;
  ui.sel = null; mutate(() => { state.furniture = state.furniture.filter(g => g.id !== f.id); });
}
export function duplicateSel(){
  const f = selFurn(); if (!f) return;
  const n = {...f, id: uid(), cx: f.cx + 200, cy: f.cy + 200};
  ui.sel = {kind: 'furn', id: n.id}; mutate(() => { state.furniture.push(n); });
}
export function moveSel(dx: number, dy: number){
  const f = selFurn(); if (f) mutate(() => { f.cx += dx; f.cy += dy; });
}
export function reorderSel(toFront: boolean){
  const f = selFurn(); if (!f) return;
  mutate(() => {
    const i = state.furniture.findIndex(g => g.id === f.id), [item] = state.furniture.splice(i, 1);
    if (toFront) state.furniture.push(item); else state.furniture.unshift(item);
  });
}

export function addItem(it: LibItem, x: number, y: number){
  const f = F(it.type, it.key, Math.round(x/10)*10, Math.round(y/10)*10, it.w, it.d, 0, it.color);
  pushOut(f);
  ui.sel = {kind: 'furn', id: f.id};
  mutate(() => { if (it.type === 'rug') state.furniture.unshift(f); else state.furniture.push(f); });   // 러그는 다른 가구 아래에
  toast(t('toast.added', {name: libName(it.key), w: it.w, d: it.d}));
}

export function clearLayout(){
  const n = state.furniture.length;
  if (!n) return toast(t('toast.noFurniture'));
  if (!confirm(t('confirm.clear', {n}))) return;
  ui.sel = null; mutate(() => { state.furniture = []; });
  toast(t('toast.cleared'));
}

/* ---------- 모델하우스 선택 사항 ---------- */
export function setOption(id: OptionId, on: boolean){
  mutate(() => { state.opts = {...state.opts, [id]: on}; });
}

// 스타일 패키지: 바닥재·벽지·가구 색(역할이 있는 가구만)을 한 번에 바꾼다. 가구 위치는 그대로
export function applyStyle(id: StyleId){
  if (id === state.style) return;
  mutate(() => {
    state.style = id; state.wall = STYLES[id].wall;
    state.rooms = styledRooms(aptType(), id, state.rooms);
    state.furniture.forEach(f => { if (f.role) f.color = STYLES[id].colors[f.role]; });
  });
  toast(t('toast.styleApplied', {name: tKey('style.' + id)}));
}

export function setWallpaper(id: WallpaperId){ if (id !== state.wall) mutate(() => { state.wall = id; }); }
export function setRoomMat(room: string, mat: MatKey){ mutate(() => { state.rooms[room] = {...state.rooms[room], mat}; }); }

// 타입 전환: 지금 타입의 배치를 보관하고, 다른 타입은 보관해 둔 배치 또는 현재 스타일의 기본 연출로 연다
export function switchType(id: TypeId){
  if (id === state.type) return;
  ui.sel = null; ui.mA = ui.mCur = null;
  mutate(() => {
    state.stash[state.type] = {furniture: state.furniture, rooms: state.rooms, measures: state.measures};
    const next = state.stash[id] ?? defaultTypeState(resolveType(id, state.custom), state.style);
    delete state.stash[id];
    state.type = id; state.furniture = next.furniture; state.rooms = next.rooms; state.measures = next.measures;
  });
}

// 지금 타입을 현재 스타일의 기본 연출로 되돌린다 (옵션·스타일은 유지)
export function restage(){
  ui.sel = null;
  mutate(() => { state.furniture = stagedFurniture(aptType(), state.style); state.rooms = styledRooms(aptType(), state.style); state.measures = []; });
}
