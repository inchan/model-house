import type { CanonicalFloorPlan } from './types';

export interface BenchmarkMetrics {
  wallPrecision: number;
  wallRecall: number;
  openingPrecision: number;
  openingRecall: number;
  spaceLabelAccuracy: number | null;
  wallCoordinateMaeMm: number | null;
}

const point = (p: readonly number[]) => `${Math.round(p[0])},${Math.round(p[1])}`;
const wallKey = (a: readonly number[], b: readonly number[]) => {
  const x = point(a), y = point(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};
const pr = (pred: Set<string>, truth: Set<string>) => {
  let tp = 0;
  for (const x of pred) if (truth.has(x)) tp++;
  return {
    precision: pred.size ? tp / pred.size : truth.size ? 0 : 1,
    recall: truth.size ? tp / truth.size : pred.size ? 0 : 1,
  };
};
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// This is a strict, coordinate-exact baseline, NOT a perception benchmark.
// It requires pre-aligned millimetre geometry and identical wall segmentation.
// Independent model-generated IDs must never be used as matching evidence.
export function evaluateCanonicalFloorPlan(pred: CanonicalFloorPlan, truth: CanonicalFloorPlan): BenchmarkMetrics {
  const pw = new Set(pred.walls.map(w => wallKey(w.a, w.b)));
  const tw = new Set(truth.walls.map(w => wallKey(w.a, w.b)));
  const w = pr(pw, tw);

  const openingKey = (o: CanonicalFloorPlan['openings'][number], walls: CanonicalFloorPlan['walls']) => {
    const wall = walls.find(w => w.id === o.wallId);
    return wall ? `${o.kind}|${wallKey(wall.a, wall.b)}|${Math.round(o.at)}|${Math.round(o.width)}` : `unresolved|${o.id}`;
  };
  const po = new Set(pred.openings.map(o => openingKey(o, pred.walls)));
  const to = new Set(truth.openings.map(o => openingKey(o, truth.walls)));
  const op = pr(po, to);

  // Room identifiers are arbitrary. Label accuracy is not measurable without
  // geometry-based space matching, so report null rather than a misleading 0/1.
  const truthWalls = new Map(truth.walls.map(w => [wallKey(w.a, w.b), w]));
  const errors: number[] = [];
  for (const p of pred.walls) {
    const t = truthWalls.get(wallKey(p.a, p.b));
    if (!t) continue;
    const direct = (dist(p.a, t.a) + dist(p.b, t.b)) / 2;
    const reverse = (dist(p.a, t.b) + dist(p.b, t.a)) / 2;
    errors.push(Math.min(direct, reverse));
  }

  return {
    wallPrecision: w.precision,
    wallRecall: w.recall,
    openingPrecision: op.precision,
    openingRecall: op.recall,
    spaceLabelAccuracy: null,
    wallCoordinateMaeMm: errors.length ? errors.reduce((a,b) => a+b,0)/errors.length : null,
  };
}
