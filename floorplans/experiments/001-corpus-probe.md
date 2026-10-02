# Golden-set experiment 001

## Goal

Test whether heterogeneous Korean sales floorplans can be normalized into CanonicalFloorPlan v1 while keeping the existing model-house renderer unchanged.

## Corpus v0

12 cases / 9 complexes are registered in `manifest.json`.

The set intentionally includes:
- 2/3/4-bay layouts
- flat and tower layouts
- base + balcony-expanded drawings
- alpha-room layouts
- 59 / 73 / 74 / 84 / 101 sqm classes
- redevelopment and new-development marketing drawings
- mandatory Cheonggye Riverview Xi cases

Cheonggye Riverview Xi is an explicit exception to the 2024-notice rule: its recruitment notice is 2023-12, while contracting continued in January 2024.

## Initial visual probe

Three web-located examples were used to probe the schema before coordinate transcription.

### Geomdan Atera Xi 59A

Observed: the source presents base and expanded variants together, plus optional-area overlays. This exposes a v1 limitation: a single canonical geometry cannot represent variants without either separate cases or a variant/condition layer.

Decision for v0: treat each visible geometry variant as a separate canonical case. Do not add options to the schema until more cases confirm a common representation.

### Bundang Kumho Eoullim Green Park 84A

Observed: orthogonal 4-bay geometry, alpha room, pantry, utility room, dressing room, balcony and outdoor-unit area. The current room kinds are close but do not have explicit pantry/outdoor-unit semantic kinds.

Decision for v0: geometry can proceed; semantic unknowns must be preserved as labels rather than forced into an incorrect RoomKind. This requires the next schema revision before transcription.

### e-Pyeonhansesang Pyeongchon Urban Valley 84A

Observed: non-expanded and expanded plans are shown side-by-side. Expansion changes room boundaries and introduces/relabels spaces.

Decision for v0: confirms that source variant identity must be captured independently from apartment type.

## Findings

1. Canonical v1 is sufficient as a geometry bridge for simple orthogonal single-variant plans.
2. The first real corpus already shows that `Space.kind` is too closed for lossless extraction.
3. Apartment type and drawing variant are separate concepts.
4. AI extraction must retain source evidence/confidence and must not invent millimetre coordinates when no scale/dimension evidence exists.
5. Source assets should not be committed to this public repository unless redistribution rights are confirmed.

## Next experiment

1. Add `variant` metadata and an `unknown` semantic path without changing existing AptType.
2. Create ground-truth JSON for Cheonggye Riverview Xi 59A, 59B and Geomdan Atera Xi 59A.
3. For each wall coordinate, record evidence as dimension-derived, scale-derived or inferred.
4. Compile ground truth to CustomPlan and verify closed faces.
5. Only after ground truth passes, run the Codex analyzer against the same sources and compare object/geometry/topology accuracy.

## Success metrics

- wall detection precision/recall
- opening detection precision/recall
- room label accuracy
- dimension transcription accuracy
- closed-face success
- topology/adjacency agreement
- final model-house compile/render PASS/FAIL
