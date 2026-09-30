import { $ } from '../core/dom';

export const svg = $<SVGSVGElement>('#plan');

// 화면 좌표 → 도면 좌표(mm)
export function toMM(e: {clientX: number; clientY: number}){
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM()!.inverse());
}
