import type { CanonicalFloorPlan } from './types';

export interface BenchmarkMetrics {
  wallPrecision: number;
  wallRecall: number;
  openingPrecision: number;
  openingRecall: number;
  spaceLabelAccuracy: number;
  wallCoordinateMaeMm: number | null;
}

const keyPoint = (p: readonly number[]) => `${Math.round(p[0])},${Math.round(p[1])}`;
const wallKey = (a: readonly number[], b: readonly number[]) => {
  const x = keyPoint(a), y = keyPoint(b);
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

export function evaluateCanonicalFloorPlan(pred: CanonicalFloorPlan, truth: CanonicalFloorPlan): BenchmarkMetrics {
  const pw = new Set(pred.walls.map(w => wallKey(w.a, w.b)));
  const tw = new Set(truth.walls.map(w => wallKey(w.a, w.b)));
  const w = pr(pw, tw);

  const po = new Set(pred.openings.map(o => `${o.kind}|${o.wallId}|${Math.round(o.at)}|${Math.round(o.width)}`));
  const to = new Set(truth.openings.map(o => `${o.kind}|${o.wallId}|${Math.round(o.at)}|${Math.round(o.width)}`));
  const op = pr(po, to);

  const truthLabels = new Map(truth.spaces.map(s => [s.id, s.sourceLabel ?? s.modelKind ?? '']));
  const comparable = pred.spaces.filter(s => truthLabels.has(s.id));
  const correct = comparable.filter(s => (s.sourceLabel ?? s.modelKind ?? '') === truthLabels.get(s.id)).length;

  // Coordinate MAE is deliberately strict and only computed for walls with matching ids.
  // Alignment/scale correction belongs in a separate normalization stage.
  const truthWalls = new Map(truth.walls.map(w => [w.id, w]));
  const errors: number[] = [];
  for (const p of pred.walls) {
    const t = truthWalls.get(p.id);
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
    spaceLabelAccuracy: comparable.length ? correct / comparable.length : truth.spaces.length ? 0 : 1,
    wallCoordinateMaeMm: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null,
  };
}
