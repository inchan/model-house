/* 좁은 화면에서 꾸미기 패널은 아래에서 올라오는 시트가 된다 */
import { $, narrow } from '../core/dom';

export function closeDrawers(){ if (narrow()) $('#side').classList.remove('open'); }
export function toggleSheet(open?: boolean){ $('#side').classList.toggle('open', open); }
export function closeMenu(){ const m = $<HTMLDetailsElement>('details.menu'); m.open = false; }
