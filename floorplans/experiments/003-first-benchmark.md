# Experiment 003 — first analyzer benchmark

## Readiness

Search exit criterion is met: at least three independent Bridge cases with L3+ geometry evidence.

Selected first run:

1. 용계역 푸르지오 아츠베르 59A — L4
2. 양평역 한라비발디 84A — L4
3. 산성역 자이푸르지오 74A — L3

Holdout:
- 용계역 푸르지오 아츠베르 84A
- 산성역 자이푸르지오 84A

Required target retained separately:
- 청계/성동 자이리버뷰 59A/59B (semantic/variant truth available; mm geometry still awaiting L3+ source)

## Protocol

For each selected bridge case:

A. Input only the marketing/source floorplan to the analyzer.
B. Require structured observations; unknown dimensions must remain inferred rather than promoted to dimension evidence.
C. Normalize to CanonicalFloorPlan.
D. Compare against the paired L3/L4 geometry source.
E. Compile valid output through the unchanged CustomPlan -> AptType -> buildPlan path.

## Metrics

- wall topology precision/recall
- door/window precision/recall
- room/source-label accuracy
- dimension transcription accuracy where visible
- normalized wall coordinate MAE after alignment
- closed-face count agreement
- room adjacency agreement
- compile PASS/FAIL
- render PASS/FAIL

## Failure taxonomy

- perception: missed/false wall/opening/text
- semantic: wrong room/variant interpretation
- scale: wrong or unsupported scale inference
- geometry: disconnected walls, overlap, opening outside wall
- normalization: source observation lost or forced into wrong model kind
- engine-compatibility: canonical result valid but current model-house cannot represent it

## Stop/iterate rule

Do not tune on holdout cases. Revise schema/prompt only from the first three development cases, rerun them, then evaluate once on holdout.
