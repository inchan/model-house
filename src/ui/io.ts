/* ======================= 가져오기 · 내보내기 ======================= */
import { download } from '../core/dom';
import { state, ui, sanitizeState, replaceState, defaultState } from '../core/state';
import { BOUNDS } from '../data/plan';
import { svg } from '../plan2d/svg';
import { t } from '../i18n';
import { is3D, get3D } from './mode';
import { toast } from './toast';

export function exportPNG(){
  if (is3D()){ get3D()?.shot(); return; }
  const clone = svg.cloneNode(true) as SVGSVGElement, W = 3200, H = Math.round(W*BOUNDS.h/BOUNDS.w);
  clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
  clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H));
  clone.querySelector('#gSel')!.innerHTML = '';
  clone.querySelector('#gGrid')!.innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : '#f7f4ee'}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  Object.entries({x: -20000, y: -20000, width: 55000, height: 55000, fill: '#f7f4ee'}).forEach(([k, v]) => bg.setAttribute(k, String(v)));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d')!.drawImage(img, 0, 0, W, H);
    cv.toBlob(b => { if (b) download(t('file.base') + '.png', b); });
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}

export const exportJSON = () => download(t('file.base') + '.json', new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'}));

export async function importFile(file: File){
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch { return toast(t('toast.invalidFile')); }
  const res = sanitizeState(parsed);
  if (!res) return toast(t('toast.invalidFile'));
  replaceState(res.state);
  toast(res.skipped ? t('toast.importedSkipped', {n: res.skipped}) : t('toast.imported'));
}

export function resetPlan(){ if (confirm(t('confirm.reset'))) replaceState(defaultState()); }
