import { $, $$, COARSE } from '../core/dom';
import { ui, type Tool } from '../core/state';
import { tIf } from '../i18n';
import { svg } from './svg';
import { renderMeasure } from './render';

export function setTool(tool: Tool){
  ui.tool = tool; ui.mA = null; ui.mCur = null;
  svg.setAttribute('class', 'tool-' + tool);
  $$('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === tool));
  syncModeHint();
  renderMeasure();
}

export function syncModeHint(){
  const hint = ui.tool === 'measure' ? tIf(COARSE, 'hint.measureTouch', 'hint.measure') : '';
  const h = $('#modehint'); h.textContent = hint; h.classList.toggle('show', !!hint);
}
