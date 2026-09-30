/* ======================= 가져오기 · 내보내기 ======================= */
import { download } from '../core/dom';
import { state, ui, sanitizeState, replaceState } from '../core/state';
import { plan } from '../core/plan';
import { svg } from '../plan2d/svg';
import { t } from '../i18n';
import { is3D, get3D } from './mode';
import { toast } from './toast';

export function exportPNG(){
  if (is3D()){ get3D()?.shot(); return; }
  const B = plan().bounds, clone = svg.cloneNode(true) as SVGSVGElement, W = 3200, H = Math.round(W*B.h/B.w);
  clone.setAttribute('viewBox', `${B.x} ${B.y} ${B.w} ${B.h}`);
  clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H));
  clone.querySelector('#gSel')!.innerHTML = '';
  clone.querySelector('#gGrid')!.innerHTML = `<rect x="-30000" y="-30000" width="80000" height="80000" fill="${ui.layers.grid ? 'url(#grid)' : '#faf7f0'}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  Object.entries({x: -30000, y: -30000, width: 80000, height: 80000, fill: '#faf7f0'}).forEach(([k, v]) => bg.setAttribute(k, String(v)));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d')!.drawImage(img, 0, 0, W, H);
    cv.toBlob(b => { if (b) download(`${t('file.base')}-${state.type}.png`, b); });
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}

export const exportJSON = () => download(`${t('file.base')}.json`, new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'}));

export async function importFile(file: File){
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch { return toast(t('toast.invalidFile')); }
  const res = sanitizeState(parsed);
  if (!res) return toast(t('toast.invalidFile'));
  replaceState(res.state);
  toast(res.skipped ? t('toast.importedSkipped', {n: res.skipped}) : t('toast.imported'));
}
