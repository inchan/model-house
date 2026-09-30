/* ======================= 2D 뷰포트 (확대·이동) ======================= */
import { $, PX_MM } from '../core/dom';
import { view } from '../core/state';
import { plan } from '../core/plan';
import { svg } from './svg';
import { renderSel, renderMeasure } from './render';

export function applyView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const nice = [100, 200, 500, 1000, 2000, 5000].find(v => v*view.s >= 60) ?? 5000;
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = `${nice >= 1000 ? `${nice/1000} m` : `${nice} mm`} · 1:${Math.round(1/(view.s*PX_MM))}`;
  renderSel(); renderMeasure();
  viewHooks.forEach(fn => fn());
}
// 뷰가 바뀔 때 함께 다시 그릴 것들 (편집기 손잡이 등)
export const viewHooks: (() => void)[] = [];
// 화면 맞춤: 위쪽 정보·도구 막대와 아래 방 탭을 피한 영역 가운데에 평면을 둔다
const INSET = {top: 118, bottom: 72, side: 16};
export function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight, B = plan().bounds;
  if (!W || !H) return;
  const top = H > 420 ? INSET.top : 8, bottom = H > 420 ? INSET.bottom : 8;
  const aw = Math.max(50, W - 2*INSET.side), ah = Math.max(50, H - top - bottom);
  view.s = Math.min(aw/B.w, ah/B.h);
  view.x0 = B.x + B.w/2 - (W/2)/view.s; view.y0 = B.y + B.h/2 - ((top + H - bottom)/2)/view.s;
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
