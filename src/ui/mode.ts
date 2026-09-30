/* ======================= 2D / 3D 전환 ======================= *
 * 3D 엔진(three.js)은 별도 청크로 나눠 두고, 첫 화면이 뜬 뒤 여유 시간에 미리 받거나 3D로 처음 들어갈 때 받는다 */
import { $, COARSE } from '../core/dom';
import { ui } from '../core/state';
import { t } from '../i18n';
import { setTool } from '../plan2d/tools';
import { applyView } from '../plan2d/view';
import { toast } from './toast';
import type { View3D } from '../view3d';

export type ViewMode = '2d' | '3d';
let viewMode: ViewMode = '2d', switching = false;
export const is3D = () => viewMode === '3d';

let api: View3D | null = null, loading: Promise<View3D> | null = null;
export const get3D = () => api;
export function load3D(): Promise<View3D> {
  loading ??= import('../view3d').then(m => (api = m.createView3D())).catch(err => { loading = null; throw err; });
  return loading;
}

export const tips = (): Record<ViewMode, string> => COARSE
  ? {'2d': t('tip.2dTouch'), '3d': t('tip.3dTouch')}
  : {'2d': t('tip.2d'), '3d': t('tip.3d')};
export const syncTip = () => { $('#tip').textContent = tips()[viewMode]; };

export async function setView(m: ViewMode){
  if (m === viewMode || switching) return;
  switching = true; document.body.classList.add('busy');
  try {
    if (m === '3d'){
      if (!api) toast(t('toast.loading3d'));
      const v = await load3D();
      if (ui.tool !== 'select') setTool('select');
      ui.mA = null;
      viewMode = '3d'; document.body.classList.add('m3d');
      await v.enter();
    } else {
      viewMode = '2d'; document.body.classList.remove('m3d');
      await api?.exit(); applyView();
    }
  } catch (err){
    // WebGL을 쓸 수 없거나 청크를 받지 못한 경우: 2D로 되돌리고 다시 시도할 수 있게 둔다
    console.error(err);
    viewMode = '2d'; document.body.classList.remove('m3d');
    $('#stage').classList.remove('is3d', 'animating');
    applyView();
    toast(t('toast.fail3d'), 4000);
  } finally {
    switching = false; document.body.classList.remove('busy');
    syncTip();
  }
}
