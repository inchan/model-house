# Codex subscription PoC protocol

Run one image at a time:

```bash
node scripts/floorplan-codex.mjs source.png runs/case-id/prediction.json
```

The wrapper uses `codex exec` non-interactively, passes the floorplan as an image, constrains the final response with a JSON Schema, and reads only the final output file.

## Rules

1. Never promote inferred image proportions to dimension evidence.
2. Keep Korean source labels verbatim.
3. One fresh ephemeral Codex run per case during benchmarking.
4. Development cases may inform prompt/schema revisions; holdout cases may not.
5. Validate prediction before compilation.
6. Compare against frozen ground truth with `evaluateCanonicalFloorPlan`.
7. Record CLI/model version with every run.

The CLI adapter is intentionally outside browser `src/`; production API migration must not alter canonical types, validation, compilation, or evaluation.
