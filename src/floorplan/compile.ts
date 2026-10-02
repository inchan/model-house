import type { OpeningSpec, WallSpec } from '../data/apt/schema';
import type { CustomPlan } from '../data/apt/custom';
import { normalizeCustom } from '../data/apt/custom';
import type { CanonicalFloorPlan } from './types';
import { validateCanonicalFloorPlan } from './validate';

export function compileCanonicalFloorPlan(plan: CanonicalFloorPlan): CustomPlan {
  const validation = validateCanonicalFloorPlan(plan);
  if (!validation.valid) {
    const summary = validation.issues.filter(i => i.severity === 'error').map(i => `${i.code}${i.entityId ? `:${i.entityId}` : ''}`).join(', ');
    throw new Error(`Invalid canonical floorplan: ${summary}`);
  }

  const openings = new Map<string, OpeningSpec[]>();
  for (const o of plan.openings) {
    const list = openings.get(o.wallId) ?? [];
    list.push({
      kind: o.kind, at: Math.round(o.at), w: Math.round(o.width),
      ...(o.side ? {side: o.side} : {}),
      ...(o.hinge ? {hinge: o.hinge} : {}),
      ...(o.sill !== undefined ? {sill: o.sill} : {}),
      ...(o.head !== undefined ? {head: o.head} : {}),
    });
    openings.set(o.wallId, list);
  }

  const walls: WallSpec[] = plan.walls.map(w => ({
    a: [Math.round(w.a[0]), Math.round(w.a[1])],
    b: [Math.round(w.b[0]), Math.round(w.b[1])],
    t: Math.round(w.thickness),
    kind: w.kind,
    open: openings.get(w.id) ?? [],
  }));

  const custom: CustomPlan = {
    rev: 1,
    walls,
    // Unknown source semantics are intentionally not guessed. normalizeCustom()
    // will create geometry rooms; only explicitly mapped semantics are carried in.
    rooms: plan.spaces.filter(s => s.modelKind).map(s => ({
      id: s.id, kind: s.modelKind!, at: [Math.round(s.at[0]), Math.round(s.at[1])],
    })),
    fixtures: [],
  };
  normalizeCustom(custom);
  return custom;
}
