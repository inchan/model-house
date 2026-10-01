import type { CanonicalFloorPlan } from './types';

export interface FloorplanAnalyzeRequest {
  inputPath: string;
  outputPath: string;
  schemaPath?: string;
}

export interface FloorplanAnalyzer {
  analyze(request: FloorplanAnalyzeRequest): Promise<CanonicalFloorPlan>;
}

// PoC adapters (Codex CLI now, Responses API or a local vision model later)
// implement this interface so the normalization/validation/compiler pipeline stays unchanged.
