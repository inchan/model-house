import type { Pt2 } from '../data/apt/schema';

// 다각형 면적(㎡) / 둘레(m) / 경계 상자 — 입력은 mm
export const area = (poly: Pt2[]) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i+1) % poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
export const perim = (poly: Pt2[]) => poly.reduce((a, p, i) => { const q = poly[(i+1) % poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
export const bbox = (poly: Pt2[]): [number, number, number, number] => {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

// 회전된 가구의 축 정렬 반폭 / 반높이
export function aabb(f: {w: number; d: number; rot: number}){
  const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return {hw: f.w/2*c + f.d/2*s, hh: f.w/2*s + f.d/2*c};
}

export const fmt = (n: number, d = 2) => n.toFixed(d);
export const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
