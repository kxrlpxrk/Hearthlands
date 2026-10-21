# Phase 6C.1B.1 — PNG-led forest composition

> This rendering remains available as Original Viking trees. The opt-in [Phase 6C.1C canopy comparison](phase6c1c-forest-variety.md) adds twenty new designs without replacing this baseline.

## Cause and visual changes

6C.1B admitted roughly 15% of the existing crowns before size filtering. Each PNG was limited by both a 1.3–1.55-tile source hint and an individual procedural crown's radius. The entire opaque procedural canopy remained underneath. On the reference map, 606 small sprites decorated 4,679 dominant procedural crowns.

The opt-in pilot now builds overlapping groups from the same deterministic woodland candidates. It queries the **actual landscape clearance field**, rather than treating the old small decorative crown radius as the available space. Interior groups are packed first, then smaller edge groups. Spatially seeded priority, proportional size variation, small source-upright rotation, irregular candidate positions and species regions avoid a tile grid. A spatial index bounds neighbour checks. All image alpha rectangles, including rocks and branches, remain inside freshly certified clearance circles.

| Individual artwork | Nominal long edge, tiles |
| --- | ---: |
| Beech 02 | 4.3 |
| Birch 13 | 4.1 |
| Oak 02 | 4.8 |
| Pine 05 | 3.5 |

These are presentation targets, varied deterministically by 0.83–1.13 and **reduced to fit available clearance**. They are not unconditional multipliers, footprint changes or modifications to supplied manifest/source files. Original aspect ratios, anchors and alpha crops are retained. Overlapping groups, not enlarged isolated decorations, make the continuous canopy.

Procedural crown centres under image coverage no longer receive the original canopy. The complete woodland retains only a 12%-opacity floor wash; uncovered narrow fringes receive another 22% understated wash, without outlines, highlights or crown detail. Missing individual images recover their own procedural canopy without reassigning healthy sprites. If the pack fails completely, or the pilot is off, the exact original baseline is used.

The reference has **1,832 layered PNG canopies**, with four species, instead of 606 sparse overlays. About **79% of original crown centres** on this fixture fall under PNG coverage and lose their former procedural canopy; the remaining fringe is subdued. PNGs now lead the composition at 40–50%, medium zoom and Fit. Dense woodland remains grouped around real clearings and protected settlement structures.

## Limits of the supplied art

The mixed and forest-edge clusters remain installed, hash-verified and loadable, but are **withheld from the active composition**. Their flat sheet-crop bases cannot currently be concealed reliably on irregular woodland boundaries. Mass-stamping them or clipping away important source details would be a poor substitute. Four individual trees provide the woodland mass instead. The UI explicitly reports this decision.

The source drawings contain oblique trees, rocks and bright foliage. They are unchanged; no destructive recolouring, generated substitutes, artificial backgrounds or dark overlays were added. Repetition of individual branches and rocks can still be seen close up, especially in homogeneous pine stands. This improves composition, not the quality or variation count of the supplied artwork. Very thin forest strips may show ground/fallback shading because a safe PNG will not fit. The conservative clearance field prioritises roads and structures over maximum coverage.

## Safety and architecture

Only presentation changes. The 6C.1A candidate generator and clearance algorithm are unchanged; their functions are now reusable by the pilot. The existing field protects woodland boundaries, water/banks, cultivated soil, planning gathering/field/yard spaces, all building footprints and entrances, rendered roads, bridges and defensive infrastructure. Larger groups must pass the same checks, including long curved wall intervals. Locks, geometry, terrain masks, generation and document v3 are untouched.

Pilot-off output is pixel-identical to the previous release's 1024 PNG on the reference fixture. A blocked lazy image bundle also exports that identical baseline. Planning does not admit the pilot. The browser visual preference remains default-off and outside project documents/history; no schema or migration is involved.

Both editor and SVG/PNG use `forestPilotScene` and its exact ordered sprites, coverage suppression and fallback paths. Export embeds each used original image once; it never copies an unrelated forest algorithm. Full exports use original-resolution artwork independently of camera zoom. 1024/2048/4096 controls and bounds are unchanged.

## Caching and performance

The existing six decoded originals and their 256/64-pixel same-image pyramids are reused. No source changes, new assets, dependencies, additional image surfaces, per-frame image processing or extra downloads were introduced. The optional image chunk is byte-identical to 6C.1B. Stable physical-pixel LOD thresholds/hysteresis are unchanged. Camera movement does not reroll placement, reconstruct canopy paths or decode images.

Two bounded plan/composition entries cache immutable inputs. Groups use a spatial index for packing/coverage, and images use the existing viewport culling. **One non-listening Konva image batch** draws every tree. Healthy pilot mode uses eight subdued path batches instead of the original sixteen fully detailed procedural batches. Existing whole-map overview caches remain bounded. Missing-art recovery is conditional.

| Forest-heavy fixture | PNG canopies | Added pilot planning | Illustrated Fit p95 | Illustrated 80% p95 / worst |
| --- | ---: | ---: | ---: | ---: |
| 35 buildings / 96² | 1,832 | 71 ms | 16.7 ms | 50.0 / 66.7 ms |
| 75 buildings / 128² | 2,201 | 109 ms | 16.8 ms | 33.4 / 33.4 ms |
| 100 buildings / 192² | 4,093 | 202 ms | 16.8 ms | 50.1 / 100.1 ms |

All samples had a 16.7 ms median; close-up tails show dropped frames. Fifty cached composition lookups took 0.2–0.3 ms. Added planning excludes baseline construction, image download/decode and first native-path preparation. The unchanged six original images plus their existing caches use the same pixel surfaces as before. The 100-building 192² fixture also exported complete pilot PNGs at 2048/4096 successfully (about 2.4/2.1 seconds after the export action; the first includes pack loading). Timings vary and exclude import/initial app startup. [Export preview](screenshots/phase6c1b1/export-preview.jpg) is a downsampled JPEG of the actual 2048 PNG, not a separate renderer.

See [verification evidence](phase6c1b1-evidence.json) for measured frame intervals, source invariants and timings. Measurements are Chromium touch emulation on the cloud machine, **not physical iPhone Safari benchmarks**. Cold layout work is synchronous when the pilot is enabled or terrain/structures change; very forest-heavy maps and close-up panning can still drop frames. 4096 exports can consume substantial browser memory; use 1024/2048 on constrained phones.

## Compare the same settlement and camera

The [reference JSON](screenshots/phase6c1b1/reference.json) is a 35-building Viking riverside, contextual, seed-1847 settlement with extra woodland painted into free outskirts for forest-heavy testing. It is a fixed visual test fixture, not a change to production generation. Both captures imported the **same file**, enabled the pilot, and used identical 390×844 touch viewports at DPR 2, with buildings, labels, district and grid settings unchanged. Camera position/scale records are in the evidence file; the village-edge close-up is centred on `generated-1847-22`.

| View | 6C.1B before | 6C.1B.1 after |
| --- | --- | --- |
| Fit (actual 10.611979%) | [Before](screenshots/phase6c1b1/before-fit.jpg) | [After](screenshots/phase6c1b1/after-fit.jpg) |
| 40% | [Before](screenshots/phase6c1b1/before-40.jpg) | [After](screenshots/phase6c1b1/after-40.jpg) |
| 80% | [Before](screenshots/phase6c1b1/before-80.jpg) | [After](screenshots/phase6c1b1/after-80.jpg) |
| 150% | [Before](screenshots/phase6c1b1/before-150.jpg) | [After](screenshots/phase6c1b1/after-150.jpg) |

Also inspect the requested [50% composition](screenshots/phase6c1b1/after-50.jpg). These are actual production browser captures, not mock-ups. Before uses commit `27a91b0`; after uses the working 6C.1B.1 build, hence its `local` commit marker. At Fit, fine foliage naturally blends into a woodland mass; the placement and silhouette do not change.

## Validation and physical iPhone checks

The full suite passes **303 tests in 28 files**, including proportional fitting at arbitrary rotations, larger-envelope clearance, deterministic packing independent of ordering/project IDs/JSON/zoom, baseline preservation, coverage suppression, partial/all-image failures, loading/cache bounds, preferences/history isolation and exact export transforms at all resolutions. Existing generator, development/expansion, terrain/infrastructure, districts, persistence, snapshots, building assets and export tests also pass. Production build and release verification pass; the existing large-bundle warning remains.

Production Chromium touch checks cover 375×667, 390×844 and 844×390 layouts, selecting/rotating/locking/undoing a building, independent panel scrolling, two-finger navigation while a terrain brush is active, stroke cancellation/undo, destructive terrain preview cancellation, JSON download/import isolation, actual profile close/reopen and image-load failure. Document contents remain unchanged after visual toggles and camera actions. These checks do not replace physical Safari testing.

On a physical iPhone:

1. Reload the deployed app and check footer **6C.1B.1**. Duplicate Ravenfjord in Projects (or import the reference JSON as a separate project).
2. Select **Illustrated**. Open **Properties**, scroll below any building inspector to **Map style settings**, enable **Viking tree PNG pilot**, and wait for the ready status. It reports four layered single-tree designs and withheld cropped clusters.
3. Tap **Explore**, then **Fit**. Pinch through approximately 40%, **50%**, 80% and 150%. Inspect the same dense woodland beside the village. Foliage should form substantial overlapping masses, retain its identity and stay clear of roads, houses, water, bridges, fields and walls. Pan repeatedly and watch for flicker or unacceptable lag.
4. Turn the pilot off: the old procedural forest must return. Turn it on again, then change to Planning and back. No structures or terrain should move. Select a nearby building with one finger, rotate it, undo, lock/unlock it, then verify its original appearance/hit region.
5. With a Terrain brush active, use two fingers to pan/pinch; nothing should paint. Cancel an unfinished stroke. Make one safe clearing stroke and undo it. Test a conflicting water stroke over a building and cancel its confirmation.
6. Wait for Saved, close/reopen Safari, and confirm the pilot preference and project are preserved. Export/import project JSON; only the newly imported project ID should differ. No tree images/flags belong in the JSON.
7. Open **Export → PNG style: Illustrated** and enable **Viking tree PNG pilot in PNG**. Prepare 2048, tap Download, and use Safari downloads/Files or Share → Save to Files. Inspect full woodland coverage and clearances. Repeat with the checkbox off and in Planning. Test 4096 only if device memory permits.
8. Repeat pan/pinch and exports on a 75–100-building, 128–192-tile project. If dense close views lag, return to Fit/medium zoom or lower export resolution and record the device/Safari version.
