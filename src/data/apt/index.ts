import type { AptType, PresetId, TypeId } from './schema';
import { buildPlan, type OptState, type PlanGeom } from './builder';
import { A59 } from './a59';
import { A84 } from './a84';
import { B84 } from './b84';

export const TYPES: Record<PresetId, AptType> = {a59: A59, a84: A84, b84: B84};
export const TYPE_IDS: PresetId[] = ['a59', 'a84', 'b84'];
export const isPresetId = (v: unknown): v is PresetId => typeof v === 'string' && v in TYPES;
export const isTypeId = (v: unknown): v is TypeId => v === 'custom' || isPresetId(v);

// 타입 + 옵션 조합별로 한 번만 계산한다 (내 평면은 sig로 내용 변화를 구분)
const cache = new Map<string, PlanGeom>();
export function getPlan(type: AptType, opts: OptState): PlanGeom {
  const key = type.id + '|' + (type.sig ?? '') + '|' + Object.keys(opts).filter(k => opts[k as keyof OptState]).sort().join(',');
  let p = cache.get(key);
  if (!p){
    if (cache.size > 60) cache.clear();
    p = buildPlan(type, opts); cache.set(key, p);
  }
  return p;
}
