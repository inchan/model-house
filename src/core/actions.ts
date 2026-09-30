/* ======================= 편집 동작 ======================= */
import { state, ui, mutate, getF, uid, F, undo } from './state';
import { norm } from './geometry';
import { libName } from './names';
import { WALLS } from '../data/plan';
import type { LibItem } from '../data/library';
import { pushOut } from '../plan2d/snap';
import { toast } from '../ui/toast';
import { t } from '../i18n';

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

export function toggleWall(id: string){
  const w = WALLS[+id.slice(1)]; if (!w) return;
  if (w[4] === 'b') return toast(t('toast.bearing'));
  if (w[4] === 'e') return toast(t('toast.exterior'));
  const on = state.demolished.includes(id);
  mutate(() => { state.demolished = on ? state.demolished.filter(x => x !== id) : [...state.demolished, id]; });
  toast(on ? t('toast.wallRestored') : t('toast.wallRemoved', {len: Math.max(w[2]-w[0], w[3]-w[1])}));
}

export function clearLayout(){
  const n = state.furniture.length;
  if (!n) return toast(t('toast.noFurniture'));
  if (!confirm(t('confirm.clear', {n}))) return;
  ui.sel = null; mutate(() => { state.furniture = []; });
  toast(t('toast.cleared'));
}
