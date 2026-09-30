import type { AptType, TypeId } from './schema';
import { buildPlan, type OptState, type PlanGeom } from './builder';
import { A59 } from './a59';
import { A84 } from './a84';
import { B84 } from './b84';

export const TYPES: Record<TypeId, AptType> = {a59: A59, a84: A84, b84: B84};
export const TYPE_IDS: TypeId[] = ['a59', 'a84', 'b84'];
export const isTypeId = (v: unknown): v is TypeId => typeof v === 'string' && v in TYPES;

// 타입 + 옵션 조합별로 한 번만 계산한다
const cache = new Map<string, PlanGeom>();
export function getPlan(id: TypeId, opts: OptState): PlanGeom {
  const key = id + '|' + Object.keys(opts).filter(k => opts[k as keyof OptState]).sort().join(',');
  let p = cache.get(key);
  if (!p){ p = buildPlan(TYPES[id], opts); cache.set(key, p); }
  return p;
}
