/* 벽 그래프에서 방 찾기 */
import { describe, it, expect } from 'vitest';
import { findFaces, labelPoint, signedArea } from '../src/data/apt/faces';
import { TYPES } from '../src/data/apt';
import { buildPlan, condOn, inPoly } from '../src/data/apt/builder';
import type { Pt2 } from '../src/data/apt/schema';

const area = (p: Pt2[]) => Math.abs(signedArea(p))/1e6;
type Seg = [Pt2, Pt2];
const rect = (x0: number, y0: number, x1: number, y1: number): Seg[] => [[[x0,y0],[x1,y0]], [[x1,y0],[x1,y1]], [[x1,y1],[x0,y1]], [[x0,y1],[x0,y0]]];

describe('findFaces', () => {
  it('사각형 하나 = 방 하나', () => {
    const f = findFaces(rect(0, 0, 4000, 3000));
    expect(f).toHaveLength(1);
    expect(area(f[0])).toBeCloseTo(12, 5);
  });

  it('가운데 칸막이(T 교차)로 방 둘', () => {
    const f = findFaces([...rect(0, 0, 6000, 3000), [[2500, 0], [2500, 3000]]]);
    expect(f.map(area).sort((a, b) => a - b)).toEqual([7.5, 10.5]);
  });

  it('막다른 벽은 방을 나누지 않는다', () => {
    const f = findFaces([...rect(0, 0, 6000, 3000), [[2500, 0], [2500, 2000]]]);
    expect(f).toHaveLength(1);
    expect(area(f[0])).toBeCloseTo(18, 5);
  });

  it('십자 교차 · 바깥으로 튀어나온 벽', () => {
    const f = findFaces([...rect(0, 0, 4000, 4000), [[2000, -500], [2000, 4500]], [[-500, 2000], [4500, 2000]]]);
    expect(f).toHaveLength(4);
    f.forEach(p => expect(area(p)).toBeCloseTo(4, 5));
  });

  it('ㄱ자 방의 이름 위치는 방 안에 있다', () => {
    const segs: Seg[] = [[[0,0],[4000,0]], [[4000,0],[4000,2000]], [[4000,2000],[2000,2000]], [[2000,2000],[2000,4000]], [[2000,4000],[0,4000]], [[0,4000],[0,0]]];
    const f = findFaces(segs);
    expect(f).toHaveLength(1);
    expect(inPoly(labelPoint(f[0]), f[0])).toBe(true);
  });

  it.each(['a59', 'a84', 'b84'] as const)('%s 벽에서 찾은 방 넓이 합 = 공간 넓이 합', id => {
    const t = TYPES[id], opts = {ext: false};
    const segs = t.walls.filter(w => condOn(w.when, opts)).map(w => [w.a, w.b] as Seg);
    const faces = findFaces(segs), p = buildPlan(t, opts);
    const total = faces.reduce((a, f) => a + area(f), 0), rooms = p.rooms.reduce((a, r) => a + r.area, 0);
    expect(Math.abs(total - rooms)/rooms).toBeLessThan(.01);
    // 모든 공간의 이름 위치가 어떤 면 안에 있다
    for (const r of t.rooms) expect(faces.some(f => inPoly(r.at, f)), `${id} ${r.id}`).toBe(true);
  });
});
