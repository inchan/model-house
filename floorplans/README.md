# Floorplan Lab

This directory is the research boundary for adding heterogeneous real-world floorplans without coupling them to the existing model-house renderer.

## Pipeline

```
PDF / image / SVG / manual source
            |
            v
      vision analyzer
            |
            v
 CanonicalFloorPlan v1
            |
      validate()
            |
            v
 compileCanonicalFloorPlan()
            |
            v
       CustomPlan
            |
            v
 existing customToType() -> buildPlan() -> 2D / 3D
```

The existing apartment renderer remains the source of truth. AI is allowed to interpret ambiguous source material, but deterministic code validates and compiles its output.

## Canonical rules

- coordinates are millimetres
- origin follows model-house: top-left, +x right, +y down
- walls are center lines
- v1 supports horizontal/vertical walls only because the existing engine does
- openings reference a wall id and must fit fully inside that wall
- semantic spaces use a point inside the intended room; existing face detection resolves geometry
- confidence belongs to observations, not geometry correction

## Research cases

Keep source assets out of Git unless their licence permits redistribution. A case should contain metadata, expected observations and canonical/golden JSON. Do not silently copy copyrighted commercial floorplans into this repository.

Suggested corpus dimensions: vector/raster, resolution, wall drawing style, dimensions present/missing, furniture clutter, expansion variants, diagonal geometry, and Korean room labels.

## Analyzer boundary

`src/floorplan/analyzer.ts` deliberately has no Codex or API dependency. During PoC a Codex CLI adapter can implement it; production can replace that adapter with an API or local model without changing the compiler.
