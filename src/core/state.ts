/* ======================= 상태 / 기록 / 저장 ======================= */
import { ROOMS, WALLS } from '../data/plan';
import { isMatKey, type MatKey } from '../data/materials';
import { FURN_KEYS, defaultKeyOf, isFurnType, typeColor, type FurnType } from '../data/library';
import { clamp, norm } from './geometry';
import { storeGet, storeSet } from './dom';

export interface Pt { x: number; y: number }
// key = 기본 이름(사전 키), name = 사용자가 직접 바꾼 이름. name이 있으면 name을 우선 표시
export interface Furniture { id: string; type: FurnType; key?: string; name?: string; cx: number; cy: number; w: number; d: number; rot: number; color: string }
export interface RoomState { name?: string; mat: MatKey }
export interface Measure { a: Pt; b: Pt }
export interface PlanState { v: 2; furniture: Furniture[]; rooms: Record<string, RoomState>; demolished: string[]; measures: Measure[] }
export type Sel = { kind: 'furn' | 'room'; id: string } | null;
export type Tool = 'select' | 'measure' | 'demolish';

let _n = 1;
export const uid = () => 'f' + Date.now().toString(36) + (_n++);
export const F = (type: FurnType, key: string, cx: number, cy: number, w: number, d: number, rot = 0, color?: string): Furniture =>
  ({id: uid(), type, key, cx, cy, w, d, rot, color: color || typeColor(type)});

function defaultFurniture(): Furniture[] { return [
  // 안방
  F('bed','bed18',8300,1000,1800,2000,0,'#c9d6df'), F('nightstand','nightstand',7150,220,450,400), F('nightstand','nightstand',9450,220,450,400),
  F('wardrobe','wardrobe',8800,3070,2400,600,180), F('baycushion','bayCushion',10770,1705,520,1800),
  // 안방 욕실
  F('shower','shower',5270,450,900,900), F('toilet','toilet',5170,1500,400,700,270), F('vanity','vanity',6110,700,800,500,90),
  // 침실 3
  F('bed','bedSS',2370,1000,1100,2000,0,'#e8d5b5'), F('desk','desk',2120,2700,1200,600,270), F('chair','chair',2700,2700,450,480,90),
  F('wardrobe','wardrobe',4280,1000,1600,600,90), F('bookshelf','bookshelf',3500,150,800,300),
  // 공용 욕실
  F('shower','showerArea',2870,4280,900,1340), F('toilet','toilet',3560,3960,400,700), F('vanity','vanity',4150,3850,700,480),
  // 세탁 발코니
  F('washer','washer',300,3960,600,600,270), F('vanity','laundrySink',250,4600,600,500,270),
  // 주방
  F('counter','counter',300,6575,2770,600,270), F('counter','counter',1390,7660,1580,600,180),
  F('stove','stove',300,6200,750,450,270), F('ksink','sink',1400,7680,800,450,180),
  // 식당
  F('fridge','fridge',2770,5540,700,700), F('table','diningTable',3600,6650,1400,800,90),
  F('chair','diningChair',2940,6320,450,480,270), F('chair','diningChair',2940,6980,450,480,270),
  F('chair','diningChair',4260,6320,450,480,90), F('chair','diningChair',4260,6980,450,480,90),
  F('cabinet','sideboard',3500,7785,1600,350,180),
  // 거실
  F('rug','rug',7600,8950,2600,1800), F('tvstand','tvStand',7600,6810,2400,400), F('sofa','sofa3',7600,10110,3000,900,180),
  F('coffeetable','coffeeTable',7600,8900,1300,650), F('armchair','armchair',9500,8900,850,850,90),
  F('shoecab','shoeCabinet',4995,9900,1000,350,270), F('plant','plant',9950,10250,500,500), F('plant','plant',5250,7050,500,500),
  // 침실 2
  F('bed','bed15',7323,5500,1500,2000,270,'#d8c7dc'), F('wardrobe','wardrobe',8500,3910,2000,600),
  F('desk','desk',9500,6070,1200,600,180), F('chair','chair',9500,5480,450,480), F('baycushion','bayCushion',10770,4997,520,1575),
  // 발코니
  F('roundtable','teaTable',11180,8200,600,600), F('armchair','loungeChair',11180,7520,750,750,0,'#d6b99a'),
  F('armchair','loungeChair',11180,8880,750,750,180,'#d6b99a'), F('plant','plant',11550,10250,500,500),
];}

export function defaultState(): PlanState {
  const rooms: Record<string, RoomState> = {};
  ROOMS.forEach(r => rooms[r.id] = {mat: r.mat});
  return {v: 2, furniture: defaultFurniture(), rooms, demolished: [], measures: []};
}

/* 저장·불러오기 데이터 검증: 알 수 없는 값은 버리거나 기본값으로 바꾼다.
 * 가져온 파일의 색상·id가 SVG 마크업에 그대로 들어가므로 형식을 엄격히 제한한다 */
const HEX = /^#[0-9a-f]{6}$/i, ID = /^[\w-]{1,40}$/, WALL_ID = /^w(\d+)$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const asObj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
const asName = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined);
const isPt = (p: unknown): p is Pt => isNum(asObj(p).x) && isNum(asObj(p).y);

export function sanitizeState(raw: unknown): {state: PlanState; skipped: number} | null {
  const r = asObj(raw);
  if (!Array.isArray(r.furniture)) return null;
  const legacy = r.v !== 2;      // 이전 버전 파일의 이름은 중국어라 버리고 기본 이름을 쓴다
  let skipped = 0;
  const ids = new Set<string>(), furniture: Furniture[] = [];
  for (const item of r.furniture){
    const o = asObj(item);
    if (!isFurnType(o.type) || !isNum(o.cx) || !isNum(o.cy) || !isNum(o.w) || !isNum(o.d)){ skipped++; continue; }
    const id = typeof o.id === 'string' && ID.test(o.id) && !ids.has(o.id) ? o.id : uid();
    ids.add(id);
    const name = legacy ? undefined : asName(o.name);
    const key = typeof o.key === 'string' && FURN_KEYS.has(o.key) ? o.key : name ? undefined : defaultKeyOf(o.type);
    furniture.push({id, type: o.type, key, name,
      cx: clamp(o.cx, -50000, 50000), cy: clamp(o.cy, -50000, 50000),
      w: clamp(Math.round(o.w), 50, 20000), d: clamp(Math.round(o.d), 50, 20000),
      rot: isNum(o.rot) ? norm(o.rot) : 0,
      color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : typeColor(o.type)});
  }
  const src = asObj(r.rooms), rooms: Record<string, RoomState> = {};
  ROOMS.forEach(room => {
    const s = asObj(src[room.id]), name = legacy ? undefined : asName(s.name);
    rooms[room.id] = name ? {name, mat: isMatKey(s.mat) ? s.mat : room.mat} : {mat: isMatKey(s.mat) ? s.mat : room.mat};
  });
  const demolished = [...new Set((Array.isArray(r.demolished) ? r.demolished : []).filter((id): id is string => {
    const m = typeof id === 'string' ? WALL_ID.exec(id) : null, k = m ? WALLS[+m[1]]?.[4] : undefined;
    return k === 'n' || k === 'low';
  }))];
  const measures = (Array.isArray(r.measures) ? r.measures : []).filter(m => isPt(asObj(m).a) && isPt(asObj(m).b))
    .map(m => { const o = asObj(m) as {a: Pt; b: Pt}; return {a: {x: o.a.x, y: o.a.y}, b: {x: o.b.x, y: o.b.y}}; });
  return {state: {v: 2, furniture, rooms, demolished, measures}, skipped};
}

const STORE = 'floorplan-kr:plan-v2';
const load = () => sanitizeState(storeGet(STORE))?.state ?? null;
export const save = () => storeSet(STORE, state);

export let state: PlanState = load() ?? defaultState();

export const ui = {
  tool: 'select' as Tool, sel: null as Sel, mA: null as Pt | null, mCur: null as Pt | null,
  layers: {dims: true, labels: true, furn: true, grid: false, bearing: false, wallSnap: true},
};
export type LayerKey = keyof typeof ui.layers;
// 2D 뷰포트: (x0, y0) = 화면 왼쪽 위의 도면 좌표(mm), s = mm당 화면 픽셀
export const view = {x0: 0, y0: 0, s: .06};

/* 변경 알림: 'change' = 도면이 바뀜(전체 다시 그리기), 'select' = 선택만 바뀜 */
type Ev = 'change' | 'select';
const subs: Record<Ev, (() => void)[]> = {change: [], select: []};
export const on = (ev: Ev, fn: () => void) => { subs[ev].push(fn); };
const emit = (ev: Ev) => subs[ev].forEach(fn => fn());
export const refresh = () => emit('change');

export const undoStack: string[] = [], redoStack: string[] = [];
export const snap = () => JSON.stringify(state);
export const getF = (id: string) => state.furniture.find(f => f.id === id);

export function commit(before: string){
  undoStack.push(before); if (undoStack.length > 150) undoStack.shift();
  redoStack.length = 0; save(); emit('change');
}
export function mutate(fn: () => void){ const b = snap(); fn(); commit(b); }
export function replaceState(next: PlanState){ const b = snap(); state = next; ui.sel = null; commit(b); }

function validateSel(){ if (ui.sel?.kind === 'furn' && !getF(ui.sel.id)) ui.sel = null; }
export function undo(): boolean {
  const prev = undoStack.pop(); if (!prev) return false;
  redoStack.push(snap()); state = JSON.parse(prev) as PlanState; validateSel(); save(); emit('change');
  return true;
}
export function redo(){
  const next = redoStack.pop(); if (!next) return;
  undoStack.push(snap()); state = JSON.parse(next) as PlanState; validateSel(); save(); emit('change');
}

export function select(sel: Sel){ ui.sel = sel; emit('select'); }
