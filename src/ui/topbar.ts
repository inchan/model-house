/* ======================= 상단 바 ======================= */
import { $, $$ } from '../core/dom';
import { state, redo } from '../core/state';
import { clearLayout, undoOrToast, switchType, restage } from '../core/actions';
import { TYPES, TYPE_IDS } from '../data/apt';
import type { TypeId } from '../data/apt/schema';
import { typeCode, pyeong } from '../core/names';
import { lang, t } from '../i18n';
import { setView, type ViewMode } from './mode';
import { bindFullscreen } from './fullscreen';
import { exportPNG, exportJSON, importFile } from './io';
import { toast } from './toast';

export const syncLangBtn = () => { $('#langBtn span').textContent = lang === 'ko' ? 'EN' : '한국어'; $('#langBtn').title = t('tb.langTitle'); };

export function renderTypeSeg(){
  $('#typeSeg').innerHTML = TYPE_IDS.map(id =>
    `<button class="btn ${state.type === id ? 'on' : ''}" data-type="${id}" role="tab" aria-selected="${state.type === id}">${typeCode(id)}<span class="sub">${t('spec.pyeong', {p: pyeong(TYPES[id].supply)})}</span></button>`).join('')
    + (state.custom ? `<button class="btn ${state.type === 'custom' ? 'on' : ''}" data-type="custom" role="tab" aria-selected="${state.type === 'custom'}">${t('type.custom')}</button>` : '');
  $$('#typeSeg .btn').forEach(b => b.onclick = () => switchType(b.dataset.type as TypeId));
}

export function bindTopbar(onLang: () => void, onHome: () => void){
  const menu = $<HTMLDetailsElement>('details.menu');
  $$('.menu-pop .btn').forEach(b => b.addEventListener('click', () => { menu.open = false; }));
  // 메뉴 밖을 누르면 닫는다
  document.addEventListener('pointerdown', e => { if (menu.open && !menu.contains(e.target as Node)) menu.open = false; });

  $$('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view as ViewMode));
  $('#undo').onclick = undoOrToast;
  $('#redo').onclick = redo;
  $('#homeBtn').onclick = onHome;
  bindFullscreen();

  $('#exportPng').onclick = exportPNG;
  $('#exportJson').onclick = exportJSON;
  const fileIn = $<HTMLInputElement>('#fileIn');
  $('#importJson').onclick = () => fileIn.click();
  fileIn.onchange = () => { const file = fileIn.files?.[0]; if (file) importFile(file); fileIn.value = ''; };
  $('#restage').onclick = () => { if (confirm(t('confirm.restage'))){ restage(); toast(t('toast.restaged')); } };
  $('#clearAll').onclick = clearLayout;
  $('#langBtn').onclick = onLang;
}
