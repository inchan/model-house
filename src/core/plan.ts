/* 지금 상태(타입 + 옵션)에 해당하는 평면 형상과 그로부터 계산되는 값들 */
import { state } from './state';
import { TYPES, getPlan } from '../data/apt';
import type { RoomSpec } from '../data/apt/schema';
import type { RoomG } from '../data/apt/builder';
import { MATS, WASTE, type MatKey } from '../data/materials';
import { OPTION_ORDER } from '../data/options';
import { WALLPAPERS } from '../data/styles';
import type { OptionId } from '../data/apt/schema';

export const plan = () => getPlan(state.type, state.opts);
export const aptType = () => TYPES[state.type];
export const roomSpec = (id: string): RoomSpec | undefined => aptType().rooms.find(r => r.id === id);
export const roomG = (id: string): RoomG | undefined => plan().rooms.find(r => r.id === id);
// 합쳐진 공간(확장 발코니 등)은 대상 방을 따른다
export const targetOf = (id: string) => roomG(id)?.target ?? id;
export const roomMat = (id: string): MatKey => state.rooms[targetOf(id)]?.mat ?? roomSpec(id)?.mat ?? 'gangmaru';
export const wallColor = () => WALLPAPERS[state.wall];

// 대상 방 기준 면적(합쳐진 공간 포함, ㎡)
export const roomArea = (id: string) => plan().rooms.filter(r => r.target === id).reduce((a, r) => a + r.area, 0);
// 이름·면적을 따로 보여 줄 공간 (다른 방에 합쳐진 공간은 제외)
export const visibleRooms = () => plan().rooms.filter(r => r.target === r.id);

export interface FinishRow { room: string; area: number; mat: MatKey; base: MatKey; diff: number }
export interface Estimate { options: {id: OptionId; price: number}[]; finishes: FinishRow[]; optionSum: number; finishSum: number; total: number }

/* 추가금 = 선택한 유상옵션 + 바닥재 변경분(현재 바닥재와 분양 기본 사양의 단가 차이 × 면적 × 로스) */
export function estimate(): Estimate {
  const t = aptType();
  const options = OPTION_ORDER.filter(id => t.options.includes(id) && state.opts[id]).map(id => ({id, price: t.price[id] ?? 0}));
  const acc = new Map<string, number>();
  for (const r of plan().rooms) acc.set(r.target, (acc.get(r.target) ?? 0) + r.area);
  const finishes: FinishRow[] = [];
  acc.forEach((area, room) => {
    const mat = roomMat(room), base = roomSpec(room)?.mat ?? mat;
    if (mat !== base) finishes.push({room, area, mat, base, diff: area*(MATS[mat].price - MATS[base].price)*WASTE});
  });
  const optionSum = options.reduce((a, o) => a + o.price, 0), finishSum = finishes.reduce((a, f) => a + f.diff, 0);
  return {options, finishes, optionSum, finishSum, total: optionSum + finishSum};
}
