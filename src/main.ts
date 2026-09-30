import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles/app.css';
import { on, view } from './core/state';
import { applyStaticLang, setLang, lang } from './i18n';
import { buildDefs } from './plan2d/defs';
import { renderGrid, renderRooms, renderFurn, renderWalls, renderOpenings, renderLabels, renderDims, renderMeasure, renderSel } from './plan2d/render';
import { applyView, fitView } from './plan2d/view';
import { syncModeHint } from './plan2d/tools';
import { svg } from './plan2d/svg';
import { bindPlanPointer } from './plan2d/interaction';
import { renderPanel } from './ui/panel';
import { buildLib, bindLibDrag } from './ui/library';
import { updateHeader } from './ui/header';
import { drawer, syncPaneBtns } from './ui/layout';
import { bindToolbar, syncLangBtn } from './ui/toolbar';
import { syncFullscreen } from './ui/fullscreen';
import { bindKeyboard } from './ui/keyboard';
import { mountIcons } from './ui/icons';
import { get3D, load3D, syncTip } from './ui/mode';

function renderAll(){
  renderGrid(); renderRooms(); renderFurn(); renderWalls(); renderLabels(); renderMeasure(); renderSel(); renderPanel(); updateHeader();
  get3D()?.sync();
}

function relang(){
  setLang(lang === 'ko' ? 'en' : 'ko');
  applyStaticLang(); syncLangBtn(); syncFullscreen(); syncModeHint(); syncPaneBtns(); syncTip();
  buildLib(); renderOpenings(); renderAll();
  get3D()?.relang();
}

on('change', renderAll);
on('select', () => { renderSel(); renderPanel(); });

mountIcons();
applyStaticLang(); syncLangBtn(); syncFullscreen();
bindToolbar(relang); bindKeyboard(); bindPlanPointer(); bindLibDrag();
buildDefs(); buildLib(); renderOpenings(); renderDims();
syncTip();
matchMedia('(max-width:1100px)').addEventListener('change', () => drawer(null));
drawer(null);                                  // 지난번 패널 접힘 상태 복원

// 가로·세로 전환, 툴바 줄바꿈 등으로 캔버스 크기가 바뀐다. 크기가 0에서 처음 잡힐 때는 화면에 맞추고,
// 그 밖의 변화(패널 접기 등)에서는 화면 가운데를 유지한다
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
}).observe(svg);

fitView(); renderAll();

// 3D 엔진은 첫 화면이 뜬 뒤 여유 있을 때 미리 받아 둔다 (3D 전환 대기 시간 줄이기)
const preload3D = () => { load3D().catch(() => { /* 실제로 3D로 전환할 때 다시 시도하고 알림을 띄운다 */ }); };
if ('requestIdleCallback' in window) requestIdleCallback(preload3D, {timeout: 4000}); else setTimeout(preload3D, 1500);   // Safari에는 requestIdleCallback이 없다
