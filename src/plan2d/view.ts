/* ======================= 2D 뷰포트 (확대·이동) ======================= */
import { $, PX_MM } from '../core/dom';
import { view } from '../core/state';
import { BOUNDS } from '../data/plan';
import { svg } from './svg';
import { renderSel, renderMeasure } from './render';

export function applyView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  $('#ratio').textContent = '1:' + Math.round(1/(view.s*PX_MM));
  const nice = [100, 200, 500, 1000, 2000, 5000].find(v => v*view.s >= 60) ?? 5000;
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = nice >= 1000 ? `${nice/1000} m` : `${nice} mm`;
  renderSel(); renderMeasure();
}
export function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  view.s = Math.min(W/BOUNDS.w, H/BOUNDS.h);
  view.x0 = BOUNDS.x - (W/view.s - BOUNDS.w)/2; view.y0 = BOUNDS.y - (H/view.s - BOUNDS.h)/2;
  applyView();
}
export const clampScale = (s: number) => Math.max(.012, Math.min(2, s));
// (mx, my) 화면 지점을 고정한 채 확대·축소
export function zoomAt(ns: number, mx: number, my: number){
  ns = clampScale(ns);
  const px = view.x0 + mx/view.s, py = view.y0 + my/view.s;
  view.s = ns; view.x0 = px - mx/ns; view.y0 = py - my/ns; applyView();
}
export const zoomCenter = (k: number) => zoomAt(view.s*k, svg.clientWidth/2, svg.clientHeight/2);
export const setRatio = (r: number) => zoomAt(1/(r*PX_MM), svg.clientWidth/2, svg.clientHeight/2);
// 화면 가운데의 도면 좌표
export const viewCenter = () => ({x: view.x0 + svg.clientWidth/2/view.s, y: view.y0 + svg.clientHeight/2/view.s});
