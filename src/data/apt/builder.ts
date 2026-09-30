/* ============================================================
 *  평면 빌더: 벽 중심선 + 개구부 정의 → 2D/3D가 그리는 사각형 형상
 *  - 옵션(발코니 확장 등)에 따라 벽·개구부·공간 합치기를 반영한다
 *  - 벽 끝은 그 점에서 만나는 직교 벽의 두께 절반만큼 늘려 모서리를 메운다
 * ============================================================ */
import type { AptType, Cond, FixtureSpec, OpeningSpec, OptionId, Pt2, Rect, RoomSpec, WallKind, WallSpec } from './schema';

export type OptState = Partial<Record<OptionId, boolean>>;

export interface WallG { id: string; rect: Rect; kind: WallKind; horiz: boolean }
export interface WinG { rect: Rect; sill: number; head: number; horiz: boolean }
export interface DoorG { rect: Rect; h: Pt2; c: Pt2; o: Pt2; len: number; entry: boolean; head: number }
export interface SlideG { rect: Rect; v: boolean; head: number }
export interface GapG { rect: Rect; head: number }
export interface RoomG extends RoomSpec { target: string; area: number }

export interface PlanGeom {
  type: AptType;
  walls: WallG[]; wins: WinG[]; doors: DoorG[]; slides: SlideG[]; gaps: GapG[];
  rooms: RoomG[]; fixtures: FixtureSpec[];
  exclusive: number;   // 전용면적(㎡): 서비스 공간을 뺀 중심선 면적 합
  service: number;     // 서비스 면적(㎡): 발코니·다용도실
  usable: number;      // 실사용 면적(㎡): 전용 + 합쳐진(확장된) 서비스 공간
  box: Rect;           // 벽 외곽 경계
  bounds: {x: number; y: number; w: number; h: number};   // 화면 맞춤 범위(치수선 포함)
}

export const condOn = (c: Cond | undefined, o: OptState) => !c || (c.startsWith('!') ? !o[c.slice(1) as OptionId] : !!o[c as OptionId]);

export const polyArea = (poly: Pt2[]) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i+1) % poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;

const isHoriz = (w: WallSpec) => w.a[1] === w.b[1];

// 점 p가 벽 w의 중심선 위에 있는가 (끝점 포함)
function onWall(p: Pt2, w: WallSpec){
  if (isHoriz(w)) return p[1] === w.a[1] && p[0] >= Math.min(w.a[0], w.b[0]) && p[0] <= Math.max(w.a[0], w.b[0]);
  return p[0] === w.a[0] && p[1] >= Math.min(w.a[1], w.b[1]) && p[1] <= Math.max(w.a[1], w.b[1]);
}

const DEF_HEAD = {door: 2.1, entry: 2.1, window: 2.2, slide: 2.1, gap: 2.1};

export function buildPlan(type: AptType, opts: OptState): PlanGeom {
  const walls = type.walls.filter(w => condOn(w.when, opts));
  for (const w of walls) if (w.a[0] !== w.b[0] && w.a[1] !== w.b[1]) throw new Error(`${type.id}: 대각선 벽은 지원하지 않습니다 ${JSON.stringify(w.a)}→${JSON.stringify(w.b)}`);
  const out: PlanGeom = {type, walls: [], wins: [], doors: [], slides: [], gaps: [], rooms: [], fixtures: [], exclusive: 0, service: 0, usable: 0, box: [0, 0, 0, 0], bounds: {x: 0, y: 0, w: 0, h: 0}};

  walls.forEach((w, wi) => {
    const hz = isHoriz(w), fixed = hz ? w.a[1] : w.a[0];
    let s0 = Math.min(hz ? w.a[0] : w.a[1], hz ? w.b[0] : w.b[1]), s1 = Math.max(hz ? w.a[0] : w.a[1], hz ? w.b[0] : w.b[1]);
    const pStart: Pt2 = hz ? [s0, fixed] : [fixed, s0], pEnd: Pt2 = hz ? [s1, fixed] : [fixed, s1];
    // 끝점에서 만나는 직교 벽 두께의 절반만큼 늘린다
    const ext = (p: Pt2) => walls.reduce((m, o) => (o !== w && isHoriz(o) !== hz && onWall(p, o) ? Math.max(m, o.t/2) : m), 0);
    s0 -= ext(pStart); s1 += ext(pEnd);
    const t2 = w.t/2;
    const rectOf = (a: number, b: number): Rect => (hz ? [a, fixed - t2, b, fixed + t2] : [fixed - t2, a, fixed + t2, b]);
    const opens = (w.open ?? []).filter(o => condOn(o.when, opts)).sort((a, b) => a.at - b.at);
    // 벽 몸체 = 전체 구간에서 개구부를 뺀 나머지
    let cur = s0, piece = 0;
    for (const o of opens){
      if (o.at > cur) out.walls.push({id: `w${wi}.${piece++}`, rect: rectOf(cur, o.at), kind: w.kind, horiz: hz});
      cur = Math.max(cur, o.at + o.w);
      addOpening(out, o, w, hz, fixed, rectOf(o.at, o.at + o.w));
    }
    if (s1 > cur) out.walls.push({id: `w${wi}.${piece}`, rect: rectOf(cur, s1), kind: w.kind, horiz: hz});
  });

  // 공간: 합치기 조건을 따라 최종 방(target)을 정한다
  const byId = new Map(type.rooms.map(r => [r.id, r]));
  const targetOf = (r: RoomSpec): string => {
    let cur = r, guard = 0;
    while (cur.join && condOn(cur.join.when, opts) && guard++ < 5){ const nx = byId.get(cur.join.to); if (!nx) break; cur = nx; }
    return cur.id;
  };
  out.rooms = type.rooms.map(r => ({...r, target: targetOf(r), area: polyArea(r.poly)}));
  for (const r of out.rooms){
    if (!r.service) out.exclusive += r.area;
    else { out.service += r.area; if (!byId.get(r.target)?.service) out.usable += r.area; }
  }
  out.usable += out.exclusive;
  out.fixtures = type.fixtures.filter(f => condOn(f.when, opts));

  const xs = out.walls.flatMap(w => [w.rect[0], w.rect[2]]), ys = out.walls.flatMap(w => [w.rect[1], w.rect[3]]);
  out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const [bx0, by0, bx1, by1] = out.box;
  out.bounds = {x: bx0 - 1450, y: by0 - 1450, w: bx1 - bx0 + 1850, h: by1 - by0 + 1850};   // 치수선(위·왼쪽)까지 포함
  return out;
}

function addOpening(out: PlanGeom, o: OpeningSpec, w: WallSpec, hz: boolean, fixed: number, rect: Rect){
  const head = o.head ?? DEF_HEAD[o.kind];
  if (o.kind === 'window'){ out.wins.push({rect, sill: o.sill ?? .9, head, horiz: hz}); return; }
  if (o.kind === 'slide'){ out.slides.push({rect, v: !hz, head}); return; }
  if (o.kind === 'gap'){ out.gaps.push({rect, head}); return; }
  // 여닫이문: 경첩은 열리는 쪽 벽면 위, 닫힌 문짝은 벽을 따라, 열린 문짝은 벽에 수직
  const side = o.side ?? 1, hs = o.hinge === 'end' ? o.at + o.w : o.at, along = o.hinge === 'end' ? -1 : 1, face = fixed + side*w.t/2;
  const h: Pt2 = hz ? [hs, face] : [face, hs];
  const c: Pt2 = hz ? [along, 0] : [0, along];
  const op: Pt2 = hz ? [0, side] : [side, 0];
  out.doors.push({rect, h, c, o: op, len: o.w, entry: o.kind === 'entry', head});
}

// 점이 다각형 안에 있는가 (레이 캐스팅)
export function inPoly(p: Pt2, poly: Pt2[]){
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi)*(p[1] - yi)/(yj - yi) + xi) inside = !inside;
  }
  return inside;
}
