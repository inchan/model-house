/* ======================= 상단 툴바 ======================= */
import { $, $$ } from '../core/dom';
import { ui, redo, refresh, type LayerKey, type Tool } from '../core/state';
import { clearLayout, undoOrToast } from '../core/actions';
import { setTool } from '../plan2d/tools';
import { fitView, zoomCenter, setRatio } from '../plan2d/view';
import { showDims } from '../plan2d/render';
import { lang, t } from '../i18n';
import { drawer } from './layout';
import { setView, type ViewMode } from './mode';
import { bindFullscreen } from './fullscreen';
import { exportPNG, exportJSON, importFile, resetPlan } from './io';
import { toast } from './toast';

export const syncLangBtn = () => { $('#langBtn span').textContent = lang === 'ko' ? 'EN' : '한국어'; $('#langBtn').title = t('tb.langTitle'); };

export function bindToolbar(onLang: () => void){
  const menu = $<HTMLDetailsElement>('details.menu');
  $$('.menu-pop .btn').forEach(b => b.addEventListener('click', () => { menu.open = false; }));
  // 터치에서 메뉴 밖을 누르면 「파일」 메뉴를 닫는다
  document.addEventListener('pointerdown', e => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });

  $$('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view as ViewMode));
  $$('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool as Tool));
  $$('#layers .btn').forEach(b => b.onclick = () => {
    const k = b.dataset.layer as LayerKey; ui.layers[k] = !ui.layers[k]; b.classList.toggle('on', ui.layers[k]);
    if (k === 'dims') showDims();
    else if (k !== 'wallSnap') refresh();
  });
  $('#zoomIn').onclick = () => zoomCenter(1.25);
  $('#zoomOut').onclick = () => zoomCenter(.8);
  $('#fit').onclick = fitView;
  $$('[data-ratio]').forEach(b => b.onclick = () => { const r = +b.dataset.ratio!; setRatio(r); toast(t('toast.scale', {r})); });
  $('#undo').onclick = undoOrToast;
  $('#redo').onclick = redo;
  $('#clearAll').onclick = clearLayout;
  $('#tgLib').onclick = () => drawer('lib');
  $('#tgPanel').onclick = () => drawer('panel');
  bindFullscreen();

  $('#exportPng').onclick = exportPNG;
  $('#exportJson').onclick = exportJSON;
  const fileIn = $<HTMLInputElement>('#fileIn');
  $('#importJson').onclick = () => fileIn.click();
  fileIn.onchange = () => { const file = fileIn.files?.[0]; if (file) importFile(file); fileIn.value = ''; };
  $('#reset').onclick = resetPlan;
  $('#langBtn').onclick = onLang;
}
