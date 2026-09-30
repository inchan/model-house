/* ======================= 상태 / 기록 / 저장 =======================
 * 앱 상태 = 지금 보고 있는 타입 + 스타일 + 벽지 + 유상옵션 + 그 타입의 가구·바닥재·측정선.
 * 다른 타입의 배치는 stash에 보관해 두었다가 타입을 바꾸면 되살린다 */
import { isTypeId } from '../data/apt';
import { resolveType, sanitizeCustom, type CustomPlan } from '../data/apt/custom';
import type { AptType, ColorRole, OptionId, TypeId } from '../data/apt/schema';
import { isMatKey, type MatKey } from '../data/materials';
import { STYLES, isStyleId, isWallpaperId, type StyleId, type WallpaperId } from '../data/styles';
import { DEFAULT_OPTS, isOptionId } from '../data/options';
import { FURN_KEYS, defaultKeyOf, isFurnType, typeColor, type FurnType } from '../data/library';
import { clamp, norm } from './geometry';
import { storeGet, storeSet } from './dom';

export interface Pt { x: number; y: number }
// key = 기본 이름(사전 키), name = 사용자가 바꾼 이름(있으면 우선), role = 스타일에 따라 바뀌는 색 역할
export interface Furniture { id: string; type: FurnType; key?: string; name?: string; cx: number; cy: number; w: number; d: number; rot: number; color: string; role?: ColorRole }
export interface RoomState { name?: string; mat: MatKey }
export interface Measure { a: Pt; b: Pt }
export interface TypeState { furniture: Furniture[]; rooms: Record<string, RoomState>; measures: Measure[] }
export type OptState = Partial<Record<OptionId, boolean>>;
export interface AppState extends TypeState {
  v: 3; type: TypeId; style: StyleId; wall: WallpaperId; opts: OptState;
  stash: Partial<Record<TypeId, TypeState>>;
  custom?: CustomPlan;                  // 편집기로 그린 "내 평면"
}
export type Sel = { kind: 'furn' | 'room'; id: string } | null;
export type Tool = 'select' | 'measure';

const ROLES: ColorRole[] = ['sofa', 'bed', 'bedAlt', 'wood', 'woodDark', 'rug', 'accent', 'chair', 'cabinet', 'metal'];
const isRole = (v: unknown): v is ColorRole => typeof v === 'string' && (ROLES as string[]).includes(v);

let _n = 1;
export const uid = () => 'f' + Date.now().toString(36) + (_n++);
export const F = (type: FurnType, key: string, cx: number, cy: number, w: number, d: number, rot = 0, color?: string, role?: ColorRole): Furniture =>
  ({id: uid(), type, key, cx, cy, w, d, rot, color: color || typeColor(type), ...(role ? {role} : {})});

// 스타일을 적용한 바닥재: 스타일에 공간 종류별 지정이 있으면 그것, 없으면 분양 기본 사양
export function styledRooms(type: AptType, style: StyleId, prev?: Record<string, RoomState>): Record<string, RoomState> {
  const out: Record<string, RoomState> = {};
  type.rooms.forEach(r => {
    const mat = STYLES[style].floors[r.kind] ?? r.mat, name = prev?.[r.id]?.name;
    out[r.id] = name ? {name, mat} : {mat};
  });
  return out;
}
export const roleColor = (style: StyleId, role: ColorRole | undefined, type: FurnType) => (role ? STYLES[style].colors[role] : typeColor(type));
export function stagedFurniture(type: AptType, style: StyleId): Furniture[] {
  return type.furniture.map(s => F(s.type, s.key, s.cx, s.cy, s.w, s.d, s.rot ?? 0, roleColor(style, s.role, s.type), s.role));
}
export const defaultTypeState = (type: AptType, style: StyleId): TypeState => ({furniture: stagedFurniture(type, style), rooms: styledRooms(type, style), measures: []});

export function defaultState(type: TypeId = 'a84', style: StyleId = 'natural'): AppState {
  return {v: 3, type, style, wall: STYLES[style].wall, opts: {...DEFAULT_OPTS}, stash: {}, ...defaultTypeState(resolveType(type), style)};
}

/* 저장·불러오기 데이터 검증: 알 수 없는 값은 버리거나 기본값으로 바꾼다.
 * 가져온 파일의 색상·id가 SVG 마크업에 그대로 들어가므로 형식을 엄격히 제한한다 */
const HEX = /^#[0-9a-f]{6}$/i, ID = /^[\w-]{1,40}$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const asObj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
const asName = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined);
const isPt = (p: unknown): p is Pt => isNum(asObj(p).x) && isNum(asObj(p).y);

function sanitizeTypeState(type: AptType, raw: unknown, ids: Set<string>): {ts: TypeState; skipped: number} {
  const r = asObj(raw);
  let skipped = 0;
  const furniture: Furniture[] = [];
  for (const item of Array.isArray(r.furniture) ? r.furniture : []){
    const o = asObj(item);
    if (!isFurnType(o.type) || !isNum(o.cx) || !isNum(o.cy) || !isNum(o.w) || !isNum(o.d)){ skipped++; continue; }
    const id = typeof o.id === 'string' && ID.test(o.id) && !ids.has(o.id) ? o.id : uid();
    ids.add(id);
    const name = asName(o.name);
    const key = typeof o.key === 'string' && FURN_KEYS.has(o.key) ? o.key : name ? undefined : defaultKeyOf(o.type);
    furniture.push({id, type: o.type, key, name,
      cx: clamp(o.cx, -50000, 50000), cy: clamp(o.cy, -50000, 50000),
      w: clamp(Math.round(o.w), 50, 20000), d: clamp(Math.round(o.d), 50, 20000),
      rot: isNum(o.rot) ? norm(o.rot) : 0,
      color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : typeColor(o.type),
      ...(isRole(o.role) ? {role: o.role} : {})});
  }
  const src = asObj(r.rooms), rooms: Record<string, RoomState> = {};
  type.rooms.forEach(room => {
    const s = asObj(src[room.id]), name = asName(s.name), mat = isMatKey(s.mat) ? s.mat : room.mat;
    rooms[room.id] = name ? {name, mat} : {mat};
  });
  const measures = (Array.isArray(r.measures) ? r.measures : []).filter(m => isPt(asObj(m).a) && isPt(asObj(m).b))
    .map(m => { const o = asObj(m) as unknown as Measure; return {a: {x: o.a.x, y: o.a.y}, b: {x: o.b.x, y: o.b.y}}; });
  return {ts: {furniture, rooms, measures}, skipped};
}

export function sanitizeState(raw: unknown): {state: AppState; skipped: number} | null {
  const r = asObj(raw);
  if (r.v !== 3 || !Array.isArray(r.furniture)) return null;
  const custom = sanitizeCustom(r.custom);
  let type = isTypeId(r.type) ? r.type : 'a84';
  if (type === 'custom' && !custom) type = 'a84';
  const style = isStyleId(r.style) ? r.style : 'natural';
  const opts: OptState = {};
  Object.entries(asObj(r.opts)).forEach(([k, v]) => { if (isOptionId(k) && typeof v === 'boolean') opts[k] = v; });
  const ids = new Set<string>();
  const cur = sanitizeTypeState(resolveType(type, custom), r, ids);
  let skipped = cur.skipped;
  const stash: Partial<Record<TypeId, TypeState>> = {}, rs = asObj(r.stash);
  (['a59', 'a84', 'b84', 'custom'] as TypeId[]).forEach(id => {
    if (id === type || !rs[id] || (id === 'custom' && !custom)) return;
    const s = sanitizeTypeState(resolveType(id, custom), rs[id], ids); stash[id] = s.ts; skipped += s.skipped;
  });
  return {state: {v: 3, type, style, wall: isWallpaperId(r.wall) ? r.wall : STYLES[style].wall, opts, stash, ...(custom ? {custom} : {}), ...cur.ts}, skipped};
}

const STORE = 'wmh:state-v3';
const stored = sanitizeState(storeGet(STORE))?.state ?? null;
export const hadSavedState = !!stored;           // 처음 방문이면 타입 선택 화면부터 보여 준다
export const save = () => storeSet(STORE, state);

export let state: AppState = stored ?? defaultState();

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
export function replaceState(next: AppState){ const b = snap(); state = next; ui.sel = null; commit(b); }

function validateSel(){
  if (ui.sel?.kind === 'furn' && !getF(ui.sel.id)) ui.sel = null;
  if (ui.sel?.kind === 'room' && !state.rooms[ui.sel.id]) ui.sel = null;
}
export function undo(): boolean {
  const prev = undoStack.pop(); if (!prev) return false;
  redoStack.push(snap()); state = JSON.parse(prev) as AppState; validateSel(); save(); emit('change');
  return true;
}
export function redo(){
  const next = redoStack.pop(); if (!next) return;
  undoStack.push(snap()); state = JSON.parse(next) as AppState; validateSel(); save(); emit('change');
}

export function select(sel: Sel){ ui.sel = sel; emit('select'); }
