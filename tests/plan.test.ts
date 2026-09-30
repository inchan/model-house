/* 평면 데이터 검증: 전용면적, 공간 겹침, 동선(현관에서 모든 공간에 닿는지), 가구·설비가 벽에 박히지 않는지 */
import { describe, it, expect } from 'vitest';
import { TYPES, TYPE_IDS } from '../src/data/apt';
import { buildPlan, condOn, inPoly, type OptState, type PlanGeom } from '../src/data/apt/builder';
import type { Pt2, Rect } from '../src/data/apt/schema';

const EXCLUSIVE: Record<string, [number, number]> = {a59: [59.0, 60.0], a84: [84.3, 85.0], b84: [84.3, 85.0]};
const ALL: OptState = {ext: true, sysac: true, midDoor: true, merge: true, builtin: true, dress: true};
const OPTSETS: OptState[] = [{}, {ext: true}, {midDoor: true}, ALL];

const inRect = (p: Pt2, r: Rect) => p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3];
const overlap = (a: Rect, b: Rect, tol = 5) => a[0] < b[2] - tol && a[2] > b[0] + tol && a[1] < b[3] - tol && a[3] > b[1] + tol;
function aabb(cx: number, cy: number, w: number, d: number, rot = 0): Rect {
  const a = rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), hw = w/2*c + d/2*s, hh = w/2*s + d/2*c;
  return [cx - hw, cy - hh, cx + hw, cy + hh];
}

// 50mm 격자에서 벽과 창을 막힌 칸으로 두고 현관 밖 시작점에서 퍼져 나간다
function reach(p: PlanGeom){
  const step = 50, {x, y, w, h} = p.bounds, nx = Math.ceil(w/step), ny = Math.ceil(h/step);
  const blocked = new Uint8Array(nx*ny), seen = new Uint8Array(nx*ny);
  const solid = [...p.walls.map(w => w.rect), ...p.wins.map(w => w.rect)];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const pt: Pt2 = [x + (i + .5)*step, y + (j + .5)*step];
    if (solid.some(r => inRect(pt, r))) blocked[j*nx + i] = 1;
  }
  const idx = (pt: Pt2) => Math.floor((pt[1] - y)/step)*nx + Math.floor((pt[0] - x)/step);
  const start = idx(p.type.entry.start), q = [start]; seen[start] = 1;
  while (q.length){
    const k = q.pop()!, i = k % nx, j = (k - i)/nx;
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const n = b*nx + a; if (!seen[n] && !blocked[n]){ seen[n] = 1; q.push(n); }
    }
  }
  return (pt: Pt2) => !!seen[idx(pt)];
}

describe.each(TYPE_IDS)('%s 평면', id => {
  const type = TYPES[id];

  it('전용면적이 타입 범위 안에 있다', () => {
    const p = buildPlan(type, {});
    const [lo, hi] = EXCLUSIVE[id];
    expect(p.exclusive).toBeGreaterThanOrEqual(lo);
    expect(p.exclusive).toBeLessThanOrEqual(hi);
    expect(p.service).toBeGreaterThan(3);
  });

  it('공간끼리 겹치지 않고, 이름 위치가 자기 공간 안에 있다', () => {
    const p = buildPlan(type, {});
    const [x0, y0, x1, y1] = p.box;
    for (let yy = y0 + 37; yy < y1; yy += 100) for (let xx = x0 + 37; xx < x1; xx += 100){
      const n = type.rooms.filter(r => inPoly([xx, yy], r.poly)).length;
      expect(n, `(${xx}, ${yy})에 공간 ${n}개`).toBeLessThanOrEqual(1);
    }
    for (const r of type.rooms) expect(inPoly(r.at, r.poly), `${r.id} 이름 위치`).toBe(true);
    const ids = type.rooms.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(OPTSETS.map(o => [JSON.stringify(o), o] as const))('현관에서 모든 공간으로 갈 수 있다 %s', (_, opts) => {
    const p = buildPlan(type, opts), ok = reach(p);
    for (const r of type.rooms) expect(ok(r.at), `${r.id}에 닿지 못함`).toBe(true);
  });

  it('붙박이 설비와 가구가 벽·창에 박히지 않는다', () => {
    for (const opts of OPTSETS){
      const p = buildPlan(type, {ext: true, ...opts}), solid = [...p.walls.map(w => w.rect), ...p.wins.map(w => w.rect)];
      const items = [...p.fixtures, ...(opts.ext === false ? [] : type.furniture)];
      for (const f of items){
        const box = aabb(f.cx, f.cy, f.w, f.d, f.rot);
        for (const s of solid) expect(overlap(box, s), `${f.key} @(${f.cx},${f.cy}) ↔ 벽 ${s.join(',')}`).toBe(false);
        expect(type.rooms.some(r => inPoly([f.cx, f.cy], r.poly)), `${f.key} @(${f.cx},${f.cy})가 어느 공간에도 없음`).toBe(true);
      }
    }
  });

  it('붙박이 설비끼리 겹치지 않는다 (옵션 조합별)', () => {
    for (const opts of [{}, ALL]){
      const fx = type.fixtures.filter(f => condOn(f.when, opts) && f.type !== 'ceilingac');
      for (let i = 0; i < fx.length; i++) for (let j = i + 1; j < fx.length; j++){
        const a = fx[i], b = fx[j];
        // 개수대·쿡탑은 하부장 위에 얹히므로 겹쳐도 된다
        const onCounter = (u: typeof a, v: typeof a) => u.type === 'counter' && ['ksink', 'stove', 'induction'].includes(v.type);
        if (onCounter(a, b) || onCounter(b, a)) continue;
        expect(overlap(aabb(a.cx, a.cy, a.w, a.d, a.rot), aabb(b.cx, b.cy, b.w, b.d, b.rot)), `${a.key} ↔ ${b.key}`).toBe(false);
      }
    }
  });

  it('기본 연출 가구끼리, 가구와 설비가 겹치지 않는다 (러그 제외)', () => {
    const p = buildPlan(type, ALL), bad: string[] = [];
    const fur = type.furniture.filter(f => f.type !== 'rug');
    const box = (f: {cx: number; cy: number; w: number; d: number; rot?: number}) => aabb(f.cx, f.cy, f.w, f.d, f.rot);
    for (let i = 0; i < fur.length; i++) for (let j = i + 1; j < fur.length; j++)
      if (overlap(box(fur[i]), box(fur[j]))) bad.push(`${fur[i].key}@(${fur[i].cx},${fur[i].cy}) ↔ ${fur[j].key}@(${fur[j].cx},${fur[j].cy})`);
    for (const f of fur) for (const x of p.fixtures) if (x.type !== 'ceilingac' && overlap(box(f), box(x))) bad.push(`${f.key} ↔ ${x.key}`);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('방 시점 카메라가 가구·설비 안에 있지 않다 (350mm 여유)', () => {
    const p = buildPlan(type, ALL), items = [...p.fixtures.filter(f => f.type !== 'ceilingac'), ...type.furniture.filter(f => f.type !== 'rug')];
    const bad: string[] = [];
    for (const r of type.rooms) if (r.view){
      const [ex, ey] = r.view.eye;
      for (const f of items){
        const [x0, y0, x1, y1] = aabb(f.cx, f.cy, f.w, f.d, f.rot), c = 350;
        if (ex > x0 - c && ex < x1 + c && ey > y0 - c && ey < y1 + c) bad.push(`${r.id} (${ex},${ey}) ↔ ${f.key}@(${f.cx},${f.cy})`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('방 시점이 평면 안에 있고 치수 기준선이 정렬돼 있다', () => {
    const p = buildPlan(type, {ext: true});
    for (const r of type.rooms) if (r.view){
      for (const pt of [r.view.eye, r.view.look]) expect(inRect(pt, p.box), `${r.id} 시점`).toBe(true);
    }
    expect([...type.dims.x].sort((a, b) => a - b)).toEqual(type.dims.x);
    expect([...type.dims.y].sort((a, b) => a - b)).toEqual(type.dims.y);
  });
});
