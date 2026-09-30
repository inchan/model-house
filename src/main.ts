import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/app.css';
import { $ } from './core/dom';
import { on, view, state, hadSavedState, undoStack, redoStack } from './core/state';
import { applyStaticLang, setLang, lang } from './i18n';
import { buildDefs } from './plan2d/defs';
import { renderPlan, renderSel } from './plan2d/render';
import { applyView, fitView } from './plan2d/view';
import { syncModeHint } from './plan2d/tools';
import { svg } from './plan2d/svg';
import { bindPlanPointer } from './plan2d/interaction';
import { bindLibDrag } from './ui/library';
import { bindTopbar, renderTypeSeg, syncLangBtn } from './ui/topbar';
import { syncFullscreen } from './ui/fullscreen';
import { bindKeyboard } from './ui/keyboard';
import { mountIcons } from './ui/icons';
import { get3D, load3D, setView, is3D, syncViewSeg } from './ui/mode';
import { renderStageInfo, renderRoomTabs, renderMinimap, bindStageTools, renderFab, syncRoomTabWithSelection, resetRoomTab } from './ui/stage';
import { bindSide, renderSide, followSelection } from './ui/side';
import { renderEstimateBar } from './ui/estimate';
import { openLanding } from './ui/landing';

let lastType = state.type;
function renderAll(){
  renderPlan(); renderTypeSeg(); renderStageInfo(); renderRoomTabs(); renderMinimap(); renderSide(); renderFab(); renderEstimateBar();
  $<HTMLButtonElement>('#undo').disabled = !undoStack.length;
  $<HTMLButtonElement>('#redo').disabled = !redoStack.length;
  get3D()?.sync();
  if (state.type !== lastType){
    lastType = state.type; resetRoomTab(); fitView();
    if (is3D()) get3D()?.flyOverview();
  }
}

function relang(){
  setLang(lang === 'ko' ? 'en' : 'ko');
  applyStaticLang(); syncLangBtn(); syncFullscreen(); syncModeHint();
  renderAll();
  get3D()?.relang();
}

on('change', renderAll);
on('select', () => { renderSel(); followSelection(); renderFab(); syncRoomTabWithSelection(); });

mountIcons();
applyStaticLang(); syncLangBtn(); syncFullscreen();
const enterModelHouse = () => { setView('3d'); };
bindTopbar(relang, () => openLanding(true, () => { if (!is3D()) enterModelHouse(); }));
bindKeyboard(); bindPlanPointer(); bindLibDrag(); bindStageTools(); bindSide();
buildDefs();

// 캔버스 크기가 0에서 처음 잡힐 때는 화면에 맞추고, 그 밖의 변화(패널 접기 등)에서는 화면 가운데를 유지한다
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
}).observe(svg);

fitView(); renderAll(); syncViewSeg();

// 처음 방문이면 타입 선택 화면, 다시 오면 보던 모델하우스로 바로 들어간다
if (!hadSavedState) openLanding(false, enterModelHouse);
else requestAnimationFrame(() => setTimeout(enterModelHouse, 250));

// 3D 엔진은 첫 화면이 뜬 뒤 여유 있을 때 미리 받아 둔다 (3D 전환 대기 시간 줄이기)
const preload3D = () => { load3D().catch(() => { /* 실제로 3D로 전환할 때 다시 시도하고 알림을 띄운다 */ }); };
if ('requestIdleCallback' in window) requestIdleCallback(preload3D, {timeout: 3000}); else setTimeout(preload3D, 1200);   // Safari에는 requestIdleCallback이 없다
