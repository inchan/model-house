/* ======================= 키보드 ======================= */
import { ui, redo, select } from '../core/state';
import { rotateSel, deleteSel, duplicateSel, moveSel, undoOrToast } from '../core/actions';
import { setTool } from '../plan2d/tools';
import { fitView, zoomCenter } from '../plan2d/view';
import { renderMeasure } from '../plan2d/render';
import { drawer } from './layout';
import { is3D, get3D, setView } from './mode';
import { toggleFullscreen } from './fullscreen';

export function bindKeyboard(){
  document.addEventListener('keydown', e => {
    if ((e.target as Element).matches?.('input,select,textarea')) return;
    if (get3D()?.walking()) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === 'z'){ e.preventDefault(); if (e.shiftKey) redo(); else undoOrToast(); return; }
    if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
    if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
    if (mod) return;
    if (k === '[' || k === ']'){ drawer(k === '[' ? 'lib' : 'panel'); return; }
    if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
    if (k === 't'){ setView(is3D() ? '2d' : '3d'); return; }
    if (is3D() && ['v', 'm', 'x', 'f', '+', '=', '-'].includes(k)) return;
    if (k === 'v') setTool('select');
    else if (k === 'm') setTool('measure');
    else if (k === 'x') setTool('demolish');
    else if (k === 'f') fitView();
    else if (k === 'r') rotateSel(e.shiftKey ? -90 : 90);
    else if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
    else if (k === 'escape'){
      if (ui.mA){ ui.mA = null; renderMeasure(); }
      else { if (ui.tool !== 'select') setTool('select'); select(null); }
    }
    else if (k.startsWith('arrow') && ui.sel?.kind === 'furn'){
      e.preventDefault(); const st = e.shiftKey ? 100 : 10;
      moveSel(k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0);
    }
    else if (k === '+' || k === '=') zoomCenter(1.25);
    else if (k === '-') zoomCenter(.8);
  });
}
