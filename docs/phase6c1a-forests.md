# Phase 6C.1A — Illustrated forests

Release marker: **6C.1A**. Illustrated woodland now uses overlapping, irregular broadleaf and conifer crowns with regional muted greens, smaller edge trees, sparse fringes and open gaps. Planning retains its original terrain polygons and technical symbols.

## Design and data safety

`rendering/forestGeometry.ts` derives a presentation scene from the existing shared terrain queries, seed, buildings, planning spaces and rendered infrastructure. It never writes terrain, resource coverage, elevation, project metadata or functional geometry. There is no migration, dependency, new image pack or runtime network request. The custom building PNGs and 6B.8 image pyramid are unchanged.

Placement uses a spatially seeded, jittered 1.13-tile sampling lattice, plus a separately seeded small-tree fringe. Each candidate has its own `seededRandom` stream derived from world coordinates and the settlement seed. Species, variation, orientation and regional colour are independent of camera position, render order, project ID and name. Changing or duplicating a project's ID does not change its forest.

A quarter-tile clearance field measures distance inside the vegetation mask. Vegetation below 0.35 is excluded; this retains the existing partial-coverage brush appearance without changing the gameplay woodland threshold of 0.6. Water coverage above 0.05 and cultivated soil are excluded. A small additional shoreline inset protects interpolated water corners and the illustrated bank stroke. Forests also leave clearance around:

- Rotated building footprints and entrance approaches, including locked buildings.
- Actual smoothed road/path strokes, bridges, walls, gates and fences.
- Existing planned gathering grounds, working areas, yards and fields.
- Map boundaries and natural/painted clearings.

A conservative Chebyshev distance transform and subpixel safety allowance bound each entire crown, rather than checking only its centre. Closed quadratic curves, inset shading and highlights stay within that envelope. Nothing is moved or deleted to obtain visual clearance. Very thin woodland strips intentionally become sparse small crowns. Existing terrain invalidity is not repaired or hidden by modifying the document.

## Rendering, zoom and exports

`forestArt.ts` separates species/art definitions from placement. Current crowns are internal vector compositions: irregular lobed broadleaf crowns, radial conifer crowns, inset tonal depth and small highlights. They use no rectangular forest backing or separate drop-shadow images.

The same crown positions, envelopes, body curves and colours appear at Fit, 40%, 80% and 150%. Below **7 CSS pixels per tile** (21.875% on the standard 32-pixel grid), or with Reduced detail, only tiny highlight strokes are omitted. Terrain detail off also omits those micro strokes; it does not reshuffle trees or substitute an unrelated symbol. The existing overview bitmap is bounded to 2048 pixels per edge. Its raster sampling can soften tiny crowns at Fit; the forest silhouette remains the same.

At most **16 forest Konva batches** represent the entire forest: four body palettes, eight tonal fills and four fine-stroke batches. They are non-listening and cannot intercept taps, selection, brushes or pinch gestures. A two-entry layout cache shares full/reduced scenes. Terrain-scene invalidation now includes building and road references, so moving a building or reshaping a path updates its visual clearance.

Each crown belongs to one 16-tile spatial chunk with a padded envelope. Native `Path2D` curves are parsed once. Close views cull off-screen chunks and combine visible native curves into one fill/stroke per paint batch; this avoids repeated alpha blending and clipped chunk seams. Combined paths are reused until the visible chunk set changes. Pan/pinch do not regenerate crown placement. On browsers lacking native paths the existing complete-vector fallback remains usable, with less performance optimisation.

Full-map SVG and PNG use the exact same complete canopy path data, palette and detail rules through `terrainScene`. Export is independent of editor viewport. Existing grid, labels, districts, 1024/2048/4096 resolution limits and allocation failure handling are preserved. A browser comparison of complete paths against combined native chunk paths found only tiny anti-aliasing differences; see the evidence file. Planning geometry was also compared byte-for-byte against the previous main revision across full/reduced and detailed/clean modes on 96/128/192 maps.

## Verification and performance

Automated coverage includes deterministic layout, seeded forest/river/coastal masks, whole-crown terrain/structure clearance, mixed species/density, stable zoom silhouettes, scene invalidation, native path reuse/culling, snapshots, IndexedDB reopening, duplication, JSON and history. The full existing generator, expansion, development, infrastructure, terrain, raster-art and project tests also run.

Production Chromium touch checks covered:

- Fit/40%/80%/150%, pan/pinch, identical saved source documents and stable canopy nodes.
- Forest clearing, cancelled strokes, two-finger navigation with a brush active, single-stroke undo and terrain conflict preview cancellation.
- Selection at building centres, edges and just outside footprints; rotation, resizing, locks and appearance undo/redo for all six custom Ravenfjord/Sheet 4 PNGs.
- 375×667, 390×844 and 844×390 panel layouts, isolated JSON import, actual browser close/reopen, and complete Illustrated PNG downloads at 1024, 2048 and 4096 pixels, including Reduced detail.

The forest-heavy browser fixtures use the existing seed-1847 river village and its real 75/100-building expansions. Additional woodland was painted into unoccupied western land for stress coverage; application generation was not changed. The three map sizes are 96×96, 128×128 and 192×192. Measurements use Chromium mobile touch emulation, 390×844, DPR 3, with 120 animation-frame samples per view during a 40-event touch pan. These are development-machine measurements, **not physical iPhone Safari guarantees**.

**286 tests in 27 files pass**; production build and release verification pass. Vite retains the existing large-chunk warning from bundled building artwork. This phase adds approximately 6.6 kB raw / 2.6 kB gzip to the entry bundle and no dependencies or image files.

| Forest-heavy settlement | Illustrated Fit median / p95 | Illustrated 80% median / p95 |
| --- | --- | --- |
| 35 buildings, 96², 5,444 forest cells | 16.7 / 16.8 ms | 16.7 / 50.1 ms |
| 75 buildings, 128², 7,442 forest cells | 16.7 / 16.8 ms | 16.7 / 50.0 ms |
| 100 buildings, 192², 15,016 forest cells | 16.7 / 33.3 ms | 16.7 / 66.7 ms |

Almost-all-forest adversarial masks with 100 protected footprints took approximately **235 / 476 / 1,182 ms** to construct cold at 96² / 128² / 192² (up to 27,683 crowns, 28 total terrain batches). Those numbers include layout/path composition, not just a single frame; cached pan avoids that work. The browser's worst 100-building Illustrated close-view sample was 83.4 ms. See [machine-readable evidence](phase6c1a-evidence.json) for all style/frame measurements and pixel comparisons.

Limitations: first scene construction and native-path preparation cost more than a cached pan, especially on nearly all-forest 192×192 maps. Dense close-up views can still drop frames. The artwork is a procedural illustrated foundation, not final painted tree PNGs. Small clearances can produce sparse edges. Forest masks remain based on existing tile data; this phase does not change their generation. No physical iPhone was available for verification.

## Before/after comparison

Both builds use the same 35-building 96×96 forest-heavy fixture, seed 1847, the same appearances, and the same camera positions. The baseline is commit `84905b0` (6B.8), built separately. Grid and district overlays are hidden in both captures to expose woodland edges. Additional forest in the western free land provides a dense edge beside cottages; no structures were moved between captures. Captures: 390×844 CSS pixels, DPR 2. Fit is actually 10.611979%, displayed as 11%.

| View | Before | After |
| --- | --- | --- |
| Fit | [6B.8](screenshots/phase6c1a/before-fit.jpg) | [6C.1A](screenshots/phase6c1a/after-fit.jpg) |
| 40% | [6B.8](screenshots/phase6c1a/before-40.jpg) | [6C.1A](screenshots/phase6c1a/after-40.jpg) |
| 80% | [6B.8](screenshots/phase6c1a/before-80.jpg) | [6C.1A](screenshots/phase6c1a/after-80.jpg) |
| 150% | [6B.8](screenshots/phase6c1a/before-150.jpg) | [6C.1A](screenshots/phase6c1a/after-150.jpg) |

Compare the same tree groups and openings across the four after views. On an existing map, switching Planning/Illustrated is also a quick way to compare the technical forest mask with its new canopy presentation.

## Future bundled tree images

The internal `ForestArtDefinition` describes stable IDs, species/cluster role, nominal diameter, normalised anchor and procedural or future bundled-PNG source information. Beech, birch, oak, pine, mixed-cluster and forest-edge roles are reserved. Current species selection is deterministic and regionally weighted. Changing the art resolver later must retain the same placements and safe envelopes.

Future approved images should meet these requirements:

- Direct overhead crowns/clusters, RGBA PNG, real alpha transparency and no matte, baked rectangular background or large external shadow.
- Consistent muted palette and upper-left lighting; no perspective trunks extending beyond the planned canopy envelope.
- Normally 256–512 pixels per crown, up to 1024 for a multi-tree cluster, with tightly measured alpha bounds and a small transparent antialiasing margin.
- Explicit nominal world diameter and alpha bounds. Anchor at the crown centre (default 0.5, 0.5); any other anchor must have a validated, fully contained drawing envelope.
- Preserve original proportions. Account for all branches, padding, rotation and overlap within the certified radius; a future cluster needs an appropriate larger clearance envelope.
- Stable IDs and variation manifests; select species/variation from seed and world location, never zoom or array/render order. New packs must not silently change existing selection pools.
- Bundle approved, attributed/licensed images locally using the existing base-path-safe image pipeline; cache decoding/detail levels and embed approved image content in SVG/PNG exports.

This phase defines the extension boundary only. It does **not** install tree images, load arbitrary forest PNGs, offer runtime uploads or import asset sheets. Adding a future image pack still requires implementing and testing its forest image renderer and export parity against these envelopes.

## Physical iPhone Safari acceptance

1. Open the deployed application in Safari and verify the footer says **6C.1A**. Reload if an older tab still shows 6B.8. Duplicate Ravenfjord in Projects before testing edits.
2. Choose **Illustrated**. Open **Terrain → Nature** if you need more forest, paint a patch outside buildings/roads, then use **Explore**. For a clean comparison, turn off Grid and district overlays.
3. Tap **Fit**, then pinch near one forest edge to approximately **40%, 80% and 150%**. Track the same crown groups, clearings and colour patches. They must not rearrange, flicker or turn into tile symbols.
4. Inspect woodland beside cottages, paths, bridge banks, fields and water. Crowns should remain clear of functional footprints and access routes. Select a nearby building in **Select**, rotate/resize/move it, then undo. Selection and entrances must remain accurate; clearance updates after committed edits.
5. In **Terrain → Nature**, clear a small patch. Release, then Undo and Redo: each complete stroke is one edit and the canopy responds. Try a two-finger pan/pinch with the brush active: no terrain should be painted. Try an unsafe water stroke over a building and **Cancel terrain preview**; nothing should be saved from the cancelled preview.
6. Switch to **Planning**, confirm the original technical symbols and editors work, then return to Illustrated. Reopen Projects, duplicate the map, close Safari and reopen it. Check the same canopy arrangement and all manually chosen building appearances.
7. Open **Export → PNG style: Illustrated**; choose 2048, initially disable grid/labels/districts, and **Prepare PNG → Download PNG**. Inspect the complete image in Files/Photos, including distant forest edges. Repeat Planning and, if device memory permits, 4096. Export/import JSON into a new project and check the same forest pattern.
8. Repeat Fit and close-up navigation on a 75–100-building expanded map, including 192×192. Note any stalls, export failure messages or Safari tab reloads; do not treat desktop emulation timings as proof of physical-device performance.
