# Search expansion 002 — dimensioned ground-truth acquisition

Date: 2026-10-02

## Objective

Keep expanding the search path until sources suitable for millimetre geometry ground truth are identified. Marketing floorplans alone are not accepted as geometric truth.

## Search ladder tested

1. complex + type + 실측도/치수
2. complex + type + 사전점검/입주박람회
3. complex + type + 커튼/입주가구/가구배치
4. generic "평면도 사이즈 / 실측 사이즈" sources to discover the data ecosystem
5. public-information / redevelopment approval records
6. renamed complex identity (청계리버뷰자이 -> 성동자이리버뷰)

## Findings

### A. Dimensioned-plan ecosystem is real

Public examples exist where apartment plans are annotated with measured/planned dimensions for move-in preparation. Sources explicitly describe measurements taken during pre-inspection or plans carrying planned dimensions. Move-in-fair operators also advertise pre-inspection support followed by sharing measured drawings.

This establishes a second corpus class separate from sales floorplans:

- marketing plan: semantic/layout ground truth
- dimensioned move-in / architectural plan: geometry ground truth

### B. Public-information request is a viable acquisition route

A public guide documents successful requests through Korea's information-disclosure portal for detailed apartment drawings, including dimensioned plans and electrical/elevator drawings. This means a missing public-web image does not imply the geometry source does not exist.

### C. Cheonggye/Seongdong Xi Riverview trace

- Required case identity: 청계리버뷰자이, currently also surfaced as 성동자이리버뷰.
- Current property pages expose both base and expanded plan imagery.
- The recruitment notice states promotional material was based on the July 2023 project-implementation-change submitted drawings.
- Public redevelopment records confirm multiple project implementation approvals/changes, including 2022 approvals and later changes.
- No trustworthy public-web millimetre unit-plan drawing was located in this search loop.

Therefore geometry ground truth remains withheld.

## Corpus policy update

Each golden case should progress through evidence levels:

- L0: identity only
- L1: marketing semantics/layout
- L2: official area + variant metadata
- L3: dimensioned architectural/planned drawing
- L4: pre-inspection/on-site measured drawing
- L5: reconciled geometry (L3 vs L4 differences recorded)

Only L3+ may be used for millimetre coordinate benchmark truth.

## Next acquisition targets

1. Search public architectural/project-approval attachments for unit-plan sheets.
2. Track pre-inspection/move-in-fair sources as the required complex approaches move-in.
3. Add already-public dimensioned apartment examples as calibration cases now, even if they were not 2024 sales, to validate the Codex extraction pipeline before required-case L3 becomes available.
4. Keep 2024-sales cases as the target distribution; do not lower truth standards to satisfy the year filter.

## Important inference

The research corpus should not be one homogeneous "golden set". It should be paired:

- Target Set: 2024 Korean sales floorplans (distribution we care about)
- Calibration Set: dimensioned/measured plans with reliable numbers (geometry extraction benchmark)
- Bridge Set: cases where both marketing and dimensioned versions of the same type are available

The Bridge Set is the highest-value data because it directly measures normalization from the source style seen at inference time to verified geometry.
