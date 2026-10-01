import { describe, expect, it } from 'vitest';
import { compileCanonicalFloorPlan } from '../src/floorplan/compile';
import { validateCanonicalFloorPlan } from '../src/floorplan/validate';
import type { CanonicalFloorPlan } from '../src/floorplan/types';

const rectangle = (): CanonicalFloorPlan => ({
  version: 1, id: 'golden-rect', name: 'Golden rectangle', unit: 'mm',
  walls: [
    {id: 'n', a: [0, 0], b: [4000, 0], thickness: 200, kind: 'e'},
    {id: 'e', a: [4000, 0], b: [4000, 3000], thickness: 200, kind: 'e'},
    {id: 's', a: [4000, 3000], b: [0, 3000], thickness: 200, kind: 'e'},
    {id: 'w', a: [0, 3000], b: [0, 0], thickness: 200, kind: 'e'},
  ],
  openings: [{id: 'door', kind: 'entry', wallId: 'n', at: 500, width: 900}],
  spaces: [{id: 'living', kind: 'living', at: [2000, 1500]}],
});

describe('canonical floorplan', () => {
  it('validates and compiles without changing the existing engine schema', () => {
    const plan = rectangle();
    expect(validateCanonicalFloorPlan(plan).valid).toBe(true);
    const custom = compileCanonicalFloorPlan(plan);
    expect(custom.walls).toHaveLength(4);
    expect(custom.rooms).toHaveLength(1);
    expect(custom.rooms[0]?.kind).toBe('living');
  });

  it('rejects an opening outside its wall', () => {
    const plan = rectangle();
    plan.openings[0] = {...plan.openings[0]!, at: 3800, width: 900};
    const result = validateCanonicalFloorPlan(plan);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.code === 'opening-outside-wall')).toBe(true);
  });

  it('rejects diagonal walls until the renderer supports them', () => {
    const plan = rectangle();
    plan.walls[0] = {...plan.walls[0]!, b: [4000, 500]};
    expect(validateCanonicalFloorPlan(plan).issues.some(i => i.code === 'diagonal-wall')).toBe(true);
  });
});
