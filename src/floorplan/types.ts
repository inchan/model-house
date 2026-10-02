import type { Pt2, RoomKind, WallKind } from '../data/apt/schema';

export type Confidence = number;
export type SourceKind = 'pdf' | 'image' | 'svg' | 'manual' | 'unknown';
export type EvidenceKind = 'dimension' | 'scale' | 'inferred' | 'manual';

export interface ObservationEvidence {
  kind: EvidenceKind;
  confidence?: Confidence;
  note?: string;
}

export interface FloorplanSource {
  kind: SourceKind;
  name?: string;
  page?: number;
  url?: string;
}

export interface FloorplanVariant {
  id: string;
  label: string;
  kind: 'base' | 'expanded' | 'option' | 'unknown';
}

export interface CanonicalOpening {
  id: string;
  kind: 'door' | 'entry' | 'window' | 'slide' | 'gap';
  wallId: string;
  at: number;
  width: number;
  side?: 1 | -1;
  hinge?: 'start' | 'end';
  sill?: number;
  head?: number;
  evidence?: ObservationEvidence;
}

export interface CanonicalWall {
  id: string;
  a: Pt2;
  b: Pt2;
  thickness: number;
  kind: WallKind;
  evidence?: ObservationEvidence;
}

export interface CanonicalSpace {
  id: string;
  sourceLabel?: string;
  // modelKind is optional on purpose: extraction must not force unknown Korean
  // semantics (pantry, outdoor-unit room, powder room, etc.) into AptType.
  modelKind?: RoomKind;
  at: Pt2;
  evidence?: ObservationEvidence;
}

export interface CanonicalFloorPlan {
  version: 1;
  id: string;
  name: string;
  unit: 'mm';
  source?: FloorplanSource;
  variant?: FloorplanVariant;
  walls: CanonicalWall[];
  openings: CanonicalOpening[];
  spaces: CanonicalSpace[];
}

export interface FloorplanIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  entityId?: string;
}

export interface FloorplanValidation {
  valid: boolean;
  issues: FloorplanIssue[];
}
