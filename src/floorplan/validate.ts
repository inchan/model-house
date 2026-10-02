import type { CanonicalFloorPlan, FloorplanIssue, FloorplanValidation, ObservationEvidence } from './types';

const finitePoint = (p: readonly number[]) => p.length === 2 && p.every(Number.isFinite);
const checkEvidence = (e: ObservationEvidence | undefined, entityId: string, issues: FloorplanIssue[]) => {
  if (e?.confidence !== undefined && (!Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1)) {
    issues.push({severity: 'error', code: 'invalid-confidence', message: 'Confidence must be between 0 and 1.', entityId});
  }
};

export function validateCanonicalFloorPlan(plan: CanonicalFloorPlan): FloorplanValidation {
  const issues: FloorplanIssue[] = [];
  const wallIds = new Set<string>();

  if (plan.version !== 1) issues.push({severity: 'error', code: 'unsupported-version', message: 'Only canonical floorplan version 1 is supported.'});
  if (plan.unit !== 'mm') issues.push({severity: 'error', code: 'unsupported-unit', message: 'Canonical floorplans must use millimetres.'});

  for (const wall of plan.walls) {
    if (wallIds.has(wall.id)) issues.push({severity: 'error', code: 'duplicate-wall-id', message: 'Wall ids must be unique.', entityId: wall.id});
    wallIds.add(wall.id);
    if (!finitePoint(wall.a) || !finitePoint(wall.b)) issues.push({severity: 'error', code: 'invalid-wall-point', message: 'Wall coordinates must be finite.', entityId: wall.id});
    if (wall.a[0] === wall.b[0] && wall.a[1] === wall.b[1]) issues.push({severity: 'error', code: 'zero-wall', message: 'Wall length must be greater than zero.', entityId: wall.id});
    if (wall.a[0] !== wall.b[0] && wall.a[1] !== wall.b[1]) issues.push({severity: 'error', code: 'diagonal-wall', message: 'The current model-house engine supports orthogonal walls only.', entityId: wall.id});
    if (!Number.isFinite(wall.thickness) || wall.thickness < 50 || wall.thickness > 400) issues.push({severity: 'error', code: 'wall-thickness', message: 'Wall thickness must be between 50 and 400 mm.', entityId: wall.id});
    checkEvidence(wall.evidence, wall.id, issues);
  }

  const openingIds = new Set<string>();
  for (const opening of plan.openings) {
    if (openingIds.has(opening.id)) issues.push({severity: 'error', code: 'duplicate-opening-id', message: 'Opening ids must be unique.', entityId: opening.id});
    openingIds.add(opening.id);
    const wall = plan.walls.find(w => w.id === opening.wallId);
    if (!wall) {
      issues.push({severity: 'error', code: 'opening-wall-missing', message: 'Opening references an unknown wall.', entityId: opening.id});
      continue;
    }
    const lo = wall.a[0] === wall.b[0] ? Math.min(wall.a[1], wall.b[1]) : Math.min(wall.a[0], wall.b[0]);
    const hi = wall.a[0] === wall.b[0] ? Math.max(wall.a[1], wall.b[1]) : Math.max(wall.a[0], wall.b[0]);
    if (!Number.isFinite(opening.at) || !Number.isFinite(opening.width) || opening.width <= 100 || opening.at < lo || opening.at + opening.width > hi) {
      issues.push({severity: 'error', code: 'opening-outside-wall', message: 'Opening must fit completely inside its wall.', entityId: opening.id});
    }
    checkEvidence(opening.evidence, opening.id, issues);
  }

  const spaceIds = new Set<string>();
  for (const space of plan.spaces) {
    if (spaceIds.has(space.id)) issues.push({severity: 'error', code: 'duplicate-space-id', message: 'Space ids must be unique.', entityId: space.id});
    spaceIds.add(space.id);
    if (!finitePoint(space.at)) issues.push({severity: 'error', code: 'invalid-space-point', message: 'Space label point must be finite.', entityId: space.id});
    if (!space.modelKind && !space.sourceLabel) issues.push({severity: 'warning', code: 'unclassified-space', message: 'Keep a source label when no model-house room kind is known.', entityId: space.id});
    checkEvidence(space.evidence, space.id, issues);
  }

  if (plan.walls.length === 0) issues.push({severity: 'error', code: 'empty-plan', message: 'At least one wall is required.'});
  return {valid: !issues.some(i => i.severity === 'error'), issues};
}
