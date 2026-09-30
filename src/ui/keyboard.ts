/* ======================= 키보드 ======================= */
import { ui, redo, select } from '../core/state';
import { rotateSel, deleteSel, duplicateSel, moveSel, undoOrToast } from '../core/actions';
import { setTool } from '../plan2d/tools';
import { fitView, zoomCenter } from '../plan2d/view';
import { renderMeasure } from '../plan2d/render';
import { is3D, get3D, setView } from './mode';
import { toggleFullscreen } from './fullscreen';
import { summaryOpen, closeSummary } from './estimate';
import { landingOpen } from './landing';
import { edKey, editor } from '../plan2d/editor';
import { stopEditing } from './editmode';

export function bindKeyboard(){
  document.addEventListener('keydown', e => {
    if ((e.target as Element).matches?.('input,select,textarea')) return;
    if (summaryOpen()){ if (e.key === 'Escape') closeSummary(); return; }
    if (landingOpen() || get3D()?.walking()) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (editor.on && !mod && edKey(e)) return;
    if (mod && k === 'z'){ e.preventDefault(); if (e.shiftKey) redo(); else undoOrToast(); return; }
    if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
    if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
    if (mod) return;
    if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
    if (k === 't'){ stopEditing(); setView(is3D() ? '2d' : '3d'); return; }
    if (k === 'r'){ rotateSel(e.shiftKey ? -90 : 90); return; }
    if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); return; }
    if (k === 'escape'){
      if (ui.mA){ ui.mA = null; renderMeasure(); }
      else { if (ui.tool !== 'select') setTool('select'); select(null); }
      return;
    }
    if (k.startsWith('arrow') && ui.sel?.kind === 'furn'){
      e.preventDefault(); const st = e.shiftKey ? 100 : 10;
      moveSel(k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0);
      return;
    }
    if (is3D()) return;
    if (k === 'v') setTool('select');
    else if (k === 'm') setTool('measure');
    else if (k === 'f') fitView();
    else if (k === '+' || k === '=') zoomCenter(1.25);
    else if (k === '-') zoomCenter(.8);
  });
}
