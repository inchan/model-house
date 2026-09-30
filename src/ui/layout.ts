/* 사이드바 열고 닫기: which = 'lib' | 'panel' | null, open을 생략하면 토글.
 * 넓은 화면: 레이아웃 안에서 접고 펼침(선택을 기억). 좁은 화면: 떠 있는 서랍, 한 번에 하나만 열림, which = null이면 모두 닫음 */
import { $, narrow, storeGet, storeSet } from '../core/dom';
import { t } from '../i18n';

type Pane = 'lib' | 'panel';
const PANES = 'floorplan-kr:panes';
const panes = storeGet<{hideLib?: boolean; hidePanel?: boolean}>(PANES) ?? {};
const els = () => ({lib: $('aside.lib'), panel: $('aside.right')});
const hideKey = (k: Pane) => (k === 'lib' ? 'hideLib' : 'hidePanel');

export function drawer(which: Pane | null, open?: boolean){
  const app = $('.app'), e = els();
  if (narrow()){
    (Object.entries(e) as [Pane, HTMLElement][]).forEach(([k, el]) => el.classList.toggle('open', k === which && (open ?? !el.classList.contains('open'))));
  } else {
    Object.values(e).forEach(el => el.classList.remove('open'));
    if (which){
      const k = hideKey(which);
      panes[k] = open === undefined ? !panes[k] : !open;
      storeSet(PANES, panes);
    }
  }
  app.classList.toggle('hide-lib', !!panes.hideLib); app.classList.toggle('hide-panel', !!panes.hidePanel);
  syncPaneBtns();
}

export function syncPaneBtns(){
  const e = els(), n = narrow();
  const vis = (k: Pane) => (n ? e[k].classList.contains('open') : !panes[hideKey(k)]);
  $('#tgLib').classList.toggle('on', vis('lib')); $('#tgPanel').classList.toggle('on', vis('panel'));
  $('#tgLib').title = vis('lib') ? t('tb.hideLib') : t('tb.showLib');
  $('#tgPanel').title = vis('panel') ? t('tb.hidePanel') : t('tb.showPanel');
  $('#stage').classList.toggle('drawer-panel', n && vis('panel'));   // 속성 서랍이 화면을 덮으면 아래 막대를 숨긴다
}

export function closeDrawers(){ if (narrow()) drawer(null); }
export function closeMenu(){ const m = $<HTMLDetailsElement>('details.menu'); m.open = false; }
