import { $ } from '../core/dom';
import { undoStack, redoStack } from '../core/state';
import { area } from '../core/geometry';
import { fmtArea } from '../core/names';
import { ROOMS } from '../data/plan';
import { t } from '../i18n';

export const netArea = () => ROOMS.filter(r => r.counted !== false).reduce((a, r) => a + area(r.poly), 0);

export function updateHeader(){
  $('#subtitle').textContent = t('app.subtitle', {area: fmtArea(netArea())});
  $<HTMLButtonElement>('#undo').disabled = !undoStack.length;
  $<HTMLButtonElement>('#redo').disabled = !redoStack.length;
}
