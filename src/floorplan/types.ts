import type { Pt2, RoomKind, WallKind } from '../data/apt/schema';

export type Confidence = number;
export type SourceKind = 'pdf' | 'image' | 'svg' | 'manual' | 'unknown';

export interface FloorplanSource {
  kind: SourceKind;
  name?: string;
  page?: number;
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
  confidence?: Confidence;
}

export interface CanonicalWall {
  id: string;
  a: Pt2;
  b: Pt2;
  thickness: number;
  kind: WallKind;
  confidence?: Confidence;
}

export interface CanonicalSpace {
  id: string;
  kind: RoomKind;
  label?: string;
  at: Pt2;
  confidence?: Confidence;
}

export interface CanonicalFloorPlan {
  version: 1;
  id: string;
  name: string;
  unit: 'mm';
  source?: FloorplanSource;
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
