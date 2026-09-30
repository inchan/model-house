/* ======================= 붙이기 (격자 · 벽) ======================= */
import { ui, view, type Furniture, type Pt } from '../core/state';
import { aabb } from '../core/geometry';
import { plan } from '../core/plan';
import type { Rect } from '../data/apt/schema';

const GRID = 10;   // mm

// 가구·측정선이 붙을 수 있는 사각형: 벽 + 창
export const snapRects = (): Rect[] => { const p = plan(); return [...p.walls.map(w => w.rect), ...p.wins.map(w => w.rect)]; };

// 가구 중심을 격자에 맞추고, 벽 가까이면 가구 면이 벽면에 닿도록 붙인다
export function snapMove(f: Furniture, cx: number, cy: number): [number, number] {
  let nx = Math.round(cx/GRID)*GRID, ny = Math.round(cy/GRID)*GRID;
  if (!ui.layers.wallSnap) return [nx, ny];
  const {hw, hh} = aabb(f), tol = 10/view.s;
  let bx = tol, by = tol;
  for (const r of snapRects()){
    if (!(r[3] < cy-hh-tol || r[1] > cy+hh+tol)) for (const ex of [r[0], r[2]]) for (const c of [ex+hw, ex-hw]) if (Math.abs(c-cx) < bx){ bx = Math.abs(c-cx); nx = c; }
    if (!(r[2] < cx-hw-tol || r[0] > cx+hw+tol)) for (const ey of [r[1], r[3]]) for (const c of [ey+hh, ey-hh]) if (Math.abs(c-cy) < by){ by = Math.abs(c-cy); ny = c; }
  }
  return [nx, ny];
}

// 측정점: 벽 모서리 선에 붙이고, shift면 첫 점 기준 수평·수직으로 고정
export function snapPoint(p: Pt, shift: boolean): Pt {
  let x = Math.round(p.x/GRID)*GRID, y = Math.round(p.y/GRID)*GRID;
  const tol = 8/view.s; let bx = tol, by = tol;
  for (const r of snapRects()){
    for (const ex of [r[0], r[2]]) if (Math.abs(ex-p.x) < bx){ bx = Math.abs(ex-p.x); x = ex; }
    for (const ey of [r[1], r[3]]) if (Math.abs(ey-p.y) < by){ by = Math.abs(ey-p.y); y = ey; }
  }
  if (shift && ui.mA){ if (Math.abs(x-ui.mA.x) > Math.abs(y-ui.mA.y)) y = ui.mA.y; else x = ui.mA.x; }
  return {x, y};
}

// 새로 놓은 가구가 벽·창과 겹치면 덜 파고든 방향으로 밀어내 벽에 딱 붙인다
export function pushOut(f: Furniture){
  for (let n = 0; n < 4; n++){
    let moved = false;
    for (const r of snapRects()){
      const {hw, hh} = aabb(f), ox = Math.min(f.cx+hw, r[2]) - Math.max(f.cx-hw, r[0]), oy = Math.min(f.cy+hh, r[3]) - Math.max(f.cy-hh, r[1]);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) f.cx = f.cx < (r[0]+r[2])/2 ? r[0]-hw : r[2]+hw;
      else f.cy = f.cy < (r[1]+r[3])/2 ? r[1]-hh : r[3]+hh;
      moved = true;
    }
    if (!moved) return;
  }
}
