import { describe, expect, it } from 'vitest';
import { evaluateCanonicalFloorPlan } from '../src/floorplan/evaluate';
import type { CanonicalFloorPlan } from '../src/floorplan/types';

const plan = (): CanonicalFloorPlan => ({
  version: 1, id: 'x', name: 'x', unit: 'mm',
  walls: [
    {id: 'w1', a: [0,0], b: [4000,0], thickness: 200, kind: 'e'},
    {id: 'w2', a: [4000,0], b: [4000,3000], thickness: 200, kind: 'e'},
  ],
  openings: [{id:'d1', kind:'door', wallId:'w2', at:500, width:900}],
  spaces: [{id:'r1', sourceLabel:'거실', modelKind:'living', at:[2000,1500]}],
});

describe('floorplan benchmark evaluator', () => {
  it('scores an identical plan perfectly', () => {
    const m = evaluateCanonicalFloorPlan(plan(), plan());
    expect(m.wallPrecision).toBe(1);
    expect(m.wallRecall).toBe(1);
    expect(m.openingPrecision).toBe(1);
    expect(m.openingRecall).toBe(1);
    expect(m.spaceLabelAccuracy).toBe(1);
    expect(m.wallCoordinateMaeMm).toBe(0);
  });

  it('exposes geometry error instead of hiding it with alignment', () => {
    const truth = plan(), pred = plan();
    pred.walls[0] = {...pred.walls[0]!, b:[3900,0]};
    const m = evaluateCanonicalFloorPlan(pred, truth);
    expect(m.wallRecall).toBe(.5);
    expect(m.wallCoordinateMaeMm).toBe(25);
  });
});
