/* ======================= 평면 편집 모드 들어가기 · 나가기 ======================= */
import { state, mutate, refresh, select } from '../core/state';
import { aptType } from '../core/plan';
import { switchType } from '../core/actions';
import { typeCode } from '../core/names';
import { blankCustom, customFromType } from '../data/apt/custom';
import { condOn } from '../data/apt/builder';
import { editor, setEdTool, endDraw } from '../plan2d/editor';
import { fitView } from '../plan2d/view';
import { t } from '../i18n';
import { is3D, setView } from './mode';
import { toast } from './toast';

// 지금 보는 타입을 복사하거나(분양 타입일 때) 기존 내 평면을 열어 편집을 시작한다
export async function startEditing(opts: {blank?: boolean} = {}){
  if (is3D()) await setView('2d');
  if (opts.blank){
    if (state.custom && state.type === 'custom' && !confirm(t('ed.confirmReset'))) return;
    mutate(() => { state.custom = blankCustom(); state.stash.custom = {furniture: [], rooms: {}, measures: []}; });
    if (state.type !== 'custom') switchType('custom'); else refresh();
  } else if (state.type !== 'custom'){
    if (state.custom && !confirm(t('ed.confirmReplace'))) switchType('custom');
    else {
      const base = aptType(), name = typeCode(state.type);
      mutate(() => {
        state.custom = customFromType(base, c => condOn(c as never, state.opts));
        state.stash.custom = {furniture: JSON.parse(JSON.stringify(state.furniture)), rooms: JSON.parse(JSON.stringify(state.rooms)), measures: []};
      });
      switchType('custom');
      toast(t('ed.copied', {name}), 2600);
    }
  }
  select(null);
  editor.on = true; editor.sel = null;
  document.body.classList.add('editing');
  setEdTool(state.custom && state.custom.walls.length <= 4 ? 'wall' : 'select');
  fitView(); refresh();
}

export function stopEditing(){
  if (!editor.on) return;
  endDraw(); editor.on = false; editor.sel = null;
  document.body.classList.remove('editing');
  refresh();
}

export async function resetBlank(){
  if (!confirm(t('ed.confirmReset'))) return;
  mutate(() => { state.custom = blankCustom(); });
  editor.sel = null; setEdTool('wall'); fitView(); refresh();
}
