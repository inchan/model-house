/* ============================================================
 *  "내 평면" — 사용자가 편집기로 그린 평면
 *  벽(중심선 + 개구부)만 저장하고, 방은 벽으로 둘러싸인 영역을 찾아 만든다.
 *  방 종류·id는 방 안의 한 점(at)으로 기억해 두어 벽을 고쳐도 같은 방으로 이어진다
 * ============================================================ */
import type { AptType, FixtureSpec, Pt2, RoomKind, RoomSpec, TypeId, WallKind, WallSpec, OpeningSpec } from './schema';
import { isFurnType } from '../library';
import type { MatKey } from '../materials';
import { findFaces, labelPoint, signedArea } from './faces';
import { inPoly } from './builder';

export interface CustomRoom { id: string; kind: RoomKind; at: Pt2 }
export interface CustomPlan { rev: number; walls: WallSpec[]; rooms: CustomRoom[]; fixtures: FixtureSpec[]; base?: string }

export const WALL_T: Record<WallKind, number> = {e: 250, b: 200, n: 100, low: 100};
const KIND_MAT: Partial<Record<RoomKind, MatKey>> = {bath: 'bathtile', utility: 'bathtile', balcony: 'tile600', entry: 'porcelain'};
const SERVICE: RoomKind[] = ['balcony', 'utility'];

const segsOf = (walls: WallSpec[]) => walls.map(w => [w.a, w.b] as [Pt2, Pt2]);

// 벽이 바뀐 뒤 방 목록을 면에 맞춘다: 면마다 방 하나, 기존 방은 at 점으로 이어 붙이고 새 면에는 새 id
export function normalizeCustom(c: CustomPlan){
  const faces = findFaces(segsOf(c.walls));
  const used = new Set<string>(), next: CustomRoom[] = [];
  let n = 1;
  const newId = () => { while (c.rooms.some(r => r.id === `r${n}`) || next.some(r => r.id === `r${n}`)) n++; return `r${n++}`; };
  for (const f of faces){
    const hit = c.rooms.find(r => !used.has(r.id) && inPoly(r.at, f));
    // 이름 위치가 벽(경계)에 너무 가까우면 방 안쪽으로 다시 잡는다
    if (hit){ used.add(hit.id); next.push({...hit, at: inPoly(hit.at, f) && edgeDist(hit.at, f) > 400 ? hit.at : labelPoint(f)}); }
    else next.push({id: newId(), kind: guessKind(f), at: labelPoint(f)});
  }
  c.rooms = next;
}
const edgeDist = (p: Pt2, poly: Pt2[]) => Math.min(...poly.map((a, i) => {
  const b = poly[(i + 1) % poly.length], vx = b[0] - a[0], vy = b[1] - a[1], L = vx*vx + vy*vy || 1;
  const k = Math.max(0, Math.min(1, ((p[0] - a[0])*vx + (p[1] - a[1])*vy)/L));
  return Math.hypot(p[0] - a[0] - k*vx, p[1] - a[1] - k*vy);
}));
// 넓이로 대강 짐작: 아주 좁은 곳은 욕실, 나머지는 침실 (사용자가 바꾼다)
function guessKind(f: Pt2[]): RoomKind { const a = Math.abs(signedArea(f))/1e6; return a < 3.2 ? 'bath' : a < 5 ? 'dress' : 'bed'; }

export function customToType(c: CustomPlan, sig: string): AptType {
  const faces = findFaces(segsOf(c.walls));
  const rooms: RoomSpec[] = faces.map(f => {
    const r = c.rooms.find(r => inPoly(r.at, f)) ?? {id: 'x' + Math.round(f[0][0]) + '_' + Math.round(f[0][1]), kind: 'bed' as RoomKind, at: labelPoint(f)};
    return {id: r.id, kind: r.kind, poly: f, mat: KIND_MAT[r.kind] ?? 'gangmaru', at: r.at, service: SERVICE.includes(r.kind), ...(r.kind === 'entry' ? {level: -.12} : {})};
  });
  const xs = c.walls.flatMap(w => [w.a[0], w.b[0]]), ys = c.walls.flatMap(w => [w.a[1], w.b[1]]);
  const box = xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [0, 0, 8000, 6000];
  // 현관문이 있으면 그 바깥에서 걸어 들어온다
  let start: Pt2 = [(box[0] + box[2])/2, (box[1] + box[3])/2], look: Pt2 = [start[0], start[1] + 2000], arrow = {x: box[0] - 900, y0: box[1] - 900, y1: box[1] - 300};
  for (const w of c.walls) for (const o of w.open ?? []) if (o.kind === 'entry'){
    const hz = w.a[1] === w.b[1], mid = o.at + o.w/2, fixed = hz ? w.a[1] : w.a[0], out = -(o.side ?? 1);
    start = hz ? [mid, fixed + out*1000] : [fixed + out*1000, mid];
    look = hz ? [mid, fixed - out*2500] : [fixed - out*2500, mid];
    arrow = hz ? {x: mid, y0: fixed + out*1300, y1: fixed + out*350} : {x: fixed + out*700, y0: mid - 500, y1: mid + 500};
  }
  const exclusive = rooms.filter(r => !r.service).reduce((a, r) => a + Math.abs(signedArea(r.poly))/1e6, 0);
  // 치수선: 구조벽 좌표, 칸막이까지 넣어도 12개 이하면 칸막이 좌표도 함께
  const coords = (axis: 0 | 1, all: boolean) => [...new Set(c.walls.filter(w => all || w.kind !== 'n').flatMap(w => [w.a[axis], w.b[axis]]))].sort((a, b) => a - b);
  const pick = (axis: 0 | 1) => { const all = coords(axis, true); return all.length <= 12 ? all : coords(axis, false); };
  const dimX = pick(0), dimY = pick(1);
  return {
    id: 'custom', bay: 3, form: 'flat', supply: Math.round(exclusive*1.33*10)/10,
    rooms, walls: c.walls, dims: {x: dimX.length > 1 ? dimX : [box[0], box[2]], y: dimY.length > 1 ? dimY : [box[1], box[3]]},
    entry: {start, look, arrow}, fixtures: c.fixtures, furniture: [], options: [], price: {}, tags: [], sig,
  };
}

// 빈 도면: 외벽으로 둘러싼 10.8m × 8.4m 사각형 + 북측 현관문
export function blankCustom(): CustomPlan {
  const W = 10800, D = 8400;
  const c: CustomPlan = {rev: 1, walls: [
    {a: [0, 0], b: [W, 0], t: WALL_T.e, kind: 'e', open: [{kind: 'entry', at: 1200, w: 900, side: -1, hinge: 'start'}]},
    {a: [W, 0], b: [W, D], t: WALL_T.e, kind: 'e'},
    {a: [0, D], b: [W, D], t: WALL_T.e, kind: 'e', open: [{kind: 'window', at: 1500, w: 3000, sill: .5}, {kind: 'window', at: 6000, w: 3600, sill: .15, head: 2.25}]},
    {a: [0, 0], b: [0, D], t: WALL_T.e, kind: 'e'},
  ], rooms: [], fixtures: []};
  normalizeCustom(c);
  if (c.rooms[0]) c.rooms[0].kind = 'living';
  return c;
}

// 기존 타입을 복사해 편집 시작 (옵션 조건은 현재 선택 상태로 굳힌다)
export function customFromType(t: AptType, on: (cond?: string) => boolean): CustomPlan {
  const walls = t.walls.filter(w => on(w.when)).map(w => ({a: [...w.a] as Pt2, b: [...w.b] as Pt2, t: w.t, kind: w.kind,
    open: (w.open ?? []).filter(o => on(o.when)).map(o => { const {when: _w, ...rest} = o; return {...rest} as OpeningSpec; })}));
  // 벽 없이 트인 공간(현관·복도·주방·거실 등)은 한 방으로 합쳐지므로, 넓은 방이 이름을 갖도록 넓이 순으로 둔다
  const byArea = [...t.rooms].sort((a, b) => Math.abs(signedArea(b.poly)) - Math.abs(signedArea(a.poly)));
  const c: CustomPlan = {rev: 1, walls, rooms: byArea.map(r => ({id: r.id, kind: r.kind, at: [...r.at] as Pt2})), fixtures: t.fixtures.filter(f => on(f.when)).map(f => { const {when: _w, ...rest} = f; return rest; }), base: t.id};
  normalizeCustom(c);
  return c;
}

/* ---------- 타입 찾기 · 불러오기 검증 ---------- */
import { TYPES } from './index';
const memo = new WeakMap<CustomPlan, {rev: number; t: AptType}>();
export function resolveType(id: TypeId, custom?: CustomPlan): AptType {
  if (id !== 'custom' || !custom) return TYPES[id === 'custom' ? 'a84' : id];
  const m = memo.get(custom);
  if (m && m.rev === custom.rev) return m.t;
  const t = customToType(custom, `${custom.rev}.${custom.walls.length}.${Math.random().toString(36).slice(2, 7)}`);
  memo.set(custom, {rev: custom.rev, t});
  return t;
}

const KINDS: RoomKind[] = ['living', 'kitchen', 'master', 'bed', 'bath', 'entry', 'hall', 'dress', 'alpha', 'utility', 'balcony'];
const WALL_KINDS: WallKind[] = ['b', 'e', 'n', 'low'];
const OPEN_KINDS = ['door', 'entry', 'window', 'slide', 'gap'];
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 100000;
const pt = (v: unknown): v is Pt2 => Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1]);
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;

export function sanitizeCustom(raw: unknown): CustomPlan | undefined {
  const r = obj(raw);
  if (!Array.isArray(r.walls)) return undefined;
  const walls: WallSpec[] = [];
  for (const it of r.walls.slice(0, 400)){
    const w = obj(it);
    if (!pt(w.a) || !pt(w.b) || !num(w.t) || !WALL_KINDS.includes(w.kind as WallKind)) continue;
    const a = w.a.map(Math.round) as Pt2, b = w.b.map(Math.round) as Pt2;
    if ((a[0] !== b[0]) === (a[1] !== b[1])) continue;   // 수평·수직이 아니거나 길이 0
    const open: OpeningSpec[] = (Array.isArray(w.open) ? w.open : []).map(obj).filter(o => OPEN_KINDS.includes(o.kind as string) && num(o.at) && num(o.w) && (o.w as number) > 100)
      .map(o => ({kind: o.kind as OpeningSpec['kind'], at: Math.round(o.at as number), w: Math.round(o.w as number),
        ...(o.side === 1 || o.side === -1 ? {side: o.side} : {}), ...(o.hinge === 'start' || o.hinge === 'end' ? {hinge: o.hinge} : {}),
        ...(num(o.sill) ? {sill: Math.max(0, Math.min(2.2, o.sill))} : {}), ...(num(o.head) ? {head: Math.max(.5, Math.min(2.4, o.head))} : {})}));
    walls.push({a, b, t: Math.max(50, Math.min(400, Math.round(w.t))), kind: w.kind as WallKind, open});
  }
  const rooms: CustomRoom[] = (Array.isArray(r.rooms) ? r.rooms : []).map(obj)
    .filter(o => typeof o.id === 'string' && /^[\w-]{1,20}$/.test(o.id) && KINDS.includes(o.kind as RoomKind) && pt(o.at))
    .map(o => ({id: o.id as string, kind: o.kind as RoomKind, at: o.at as Pt2}));
  const fixtures: FixtureSpec[] = (Array.isArray(r.fixtures) ? r.fixtures : []).map(obj)
    .filter(f => isFurnType(f.type) && typeof f.key === 'string' && /^\w{1,30}$/.test(f.key) && num(f.cx) && num(f.cy) && num(f.w) && num(f.d))
    .map(f => ({type: f.type as FixtureSpec['type'], key: f.key as string, cx: f.cx as number, cy: f.cy as number, w: f.w as number, d: f.d as number, ...(num(f.rot) ? {rot: f.rot} : {})}));
  const c: CustomPlan = {rev: num(r.rev) ? r.rev : 1, walls, rooms, fixtures, ...(typeof r.base === 'string' && r.base.length < 10 ? {base: r.base} : {})};
  normalizeCustom(c);
  return c;
}
