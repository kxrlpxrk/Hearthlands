# Phase 6C.2 — Illustrated grassland pilot

The existing Illustrated terrain remains the default. In **Properties → Map style settings**, choose Illustrated, then **Illustrated grassland pilot → On · restrained accents**. The same single select also offers **On · more meadow accents** and **Off · existing terrain**. This is a browser-wide visual preference, independent of the forest comparison setting. It never enters project documents, undo history, terrain permissions or generation. Existing visual preferences without this field default to Off.

The supplied six 896×896 RGB WebPs are installed byte-for-byte under `src/assets/grassland/webp/`, with the archive's original `manifest.json` and `README.txt`. The validated registry uses the exact stable manifest IDs, not list indices. All six are lazy, locally bundled Vite URLs under `/Hearthlands/`. There are no new dependencies or remote artwork services.

## Composition and safety

- Preserve the quiet green base. Decorate only a small fraction of eligible open grassland, leaving settlement centres, communal space and fields clear.
- Seed each world-space candidate independently. Low-frequency habitat noise, jittered positions, varied size/rotation and separation prevent a regular repeating carpet. Camera position, zoom, project name/ID and image readiness never affect placement.
- Use base meadow and small flower patches on ordinary grass; scrub in drier regional bands; rocky grass where existing grass has rocks or elevation above 1 m; marsh on low, dry land within 5.5 tiles of actual water.
- The marsh source includes painted pools. Only its inspected **x=340, y=360, 240×240 dry reed/flower region** is presented, avoiding fake water. This is a non-destructive source crop, not a rewritten asset. Not every environment will contain every texture: the reference village safely uses four IDs; context tests exercise all six.
- A conservative quarter-tile clearance field reserves water and interpolated banks, forest coverage, non-grass materials, steep slopes, cultivated ground, planning fields/yards/gathering spaces, rotated building footprints, entrances, rendered road widths and all defensive/bridge sections. Hidden and locked structures are protected too. Complete circular drawing envelopes must fit; the feathers never blur across an obstacle.
- Three irregular, lobed feather masks per texture are baked once into 384² transparent surfaces. Only alpha changes; original RGB colours remain intact. No recolouring, dark overlays, Gaussian blur, repeated square tiles or edge-to-edge source joins.
- One non-listening Konva Shape draws visible cached patches above base ground and below nature, water, relief, roads, bridges, districts, buildings and interaction overlays. Forest algorithms and geometry are unchanged. Expansion's preview terrain receives the same presentation options.
- Image or cache failures leave the previous quiet terrain visible. Partial failures omit only those patches without reassigning healthy ones. Warnings appear in Properties and export controls. Loading settles once; reload the page to retry a failed pack.

## Borders and visual assessment

All six artworks were visually inspected, including opposing borders. Mean absolute RGB difference across opposing edges (0–255 scale):

| Texture | Left/right | Top/bottom |
| --- | ---: | ---: |
| Base meadow | 33.5 | 29.5 |
| Wildflower A | 30.9 | 29.9 |
| Wildflower B | 32.7 | 32.7 |
| Scrub | 28.9 | 30.7 |
| Rocky | 36.6 | 34.9 |
| Marsh | 34.3 | 39.0 |

These are **not seamless textures**. Direct repetition would expose joins. Shared alpha masks conceal the rectangular source perimeter; individual patches remain bright and deliberately distinct from the muted base. This phase does not claim a seamless, continuous painted biome. At close zoom some familiar grass/flower motifs can recur because there are only six source designs. Higher coverage should remain optional rather than becoming a global default.

The reference fixture is the existing forest-heavy, 35-building Viking River/Contextual settlement with seed 1847 and a 96² map ([JSON](screenshots/phase6c1b1/reference.json)). Its additional wooded outskirts were already part of the earlier rendering fixture; this phase changes no settlement generator. Both sides keep the approved twenty-canopy 6C.1C forest mode enabled: **2,241 identical crowns / all twenty designs**. Restrained meadow mode produces seven patches, approximately **0.81% alpha-weighted map coverage / 2.36% of open grass**. The main settlement/road hierarchy remains legible. Crowded maps can legitimately contain very few accents.

Matched production-build, 390×844 touch-emulated screenshots use identical camera coordinates, centred near world **(60.4555, 38.0534)** at close zoom. No Stage geometry was changed to capture them:

| View | Comparison | Off | On |
| --- | --- | --- | --- |
| Fit (10.612%) | [Side by side](screenshots/phase6c2/comparison-fit.jpg) | [Off](screenshots/phase6c2/before-fit.jpg) | [On](screenshots/phase6c2/after-fit.jpg) |
| 50% | [Side by side](screenshots/phase6c2/comparison-50.jpg) | [Off](screenshots/phase6c2/before-50.jpg) | [On](screenshots/phase6c2/after-50.jpg) |
| 100% | [Side by side](screenshots/phase6c2/comparison-100.jpg) | [Off](screenshots/phase6c2/before-100.jpg) | [On](screenshots/phase6c2/after-100.jpg) |

Additional [40%](screenshots/phase6c2/after-40.jpg), [80%](screenshots/phase6c2/after-80.jpg) and [150%](screenshots/phase6c2/after-150.jpg) captures retain the same seven patches and asset IDs. There is no zoom-dependent artwork substitution. Existing terrain overview caches change sampling resolution, never world composition. Original ground's existing subtle cell shading is retained; this pilot does not overhaul terrain or shorelines.

## Export parity and persistence

**Export → Complete map PNG → Illustrated grassland in PNG** starts from the map preference and can independently be Off, restrained or more accents. The selected forest mode stays independent. Editor and SVG/PNG use the **same masked image bytes, ordered patch geometry, scale, rotation and world anchors**. Each used masked source is embedded once, without external SVG image URLs. Exports include full bounds regardless of viewport zoom; grid, labels, districts and existing resolution/resource limits remain available.

The pilot-Off 1024 PNG was compared against the previous Phase 6C.1C canopy-enabled PNG: every pixel is identical. Successful on/off 1024, on 2048/4096, blocked/partial-load fallback downloads, JSON export/import into a separate project and an actual persistent Chromium profile close/reopen were exercised. Storage documents remained unchanged by camera/style/pilot changes. The preference is deliberately not in JSON or snapshots; importing a project on another browser leaves that browser's opt-in setting unchanged.

## Validation and performance

**334 tests across 30 files pass**, as do the production build and release verifier. Automated coverage includes original hashes, closed manifest/URL validation, ecological selection, deterministic reload/duplication, every safe envelope, full-width paths/bridges/defences, alpha-only feathering, failures/timeouts, cache reuse, all export sizes, Planning and forest equivalence, terrain undo/redo, snapshots and IndexedDB reopening. Existing generator/development/expansion, document v1/v2/v3, asset catalogue and editor suites remain enabled.

Commands:

```sh
npm test
npm run build
npm run verify:release
# Optional read-only image audit (Pillow required only for this script):
python scripts/audit-grassland.py
```

Production Chromium touch checks covered 375×667, 390×844 and 844×390 with no horizontal sheet/document overflow; building selection, rotate/undo, locks, independent panel scrolling, two-finger terrain navigation, stroke cancellation/undo and destructive terrain-preview cancellation. All passed without document loss or page exceptions. These are emulations, **not physical Safari certification**.

Unthrottled cloud Chromium, 390×844 at DPR 3, 120 animation frames sampled while dispatching 40 real touch-pan moves, with twenty-canopy forests and custom building PNGs:

| Map / buildings | Meadow patches | Cold placement | 50 cached calls | Fit p95 off → on | 80% p95 off → on |
| --- | ---: | ---: | ---: | ---: | ---: |
| 96² / 35 | 7 | 45.4 ms | <0.1 ms | 16.8 → 16.8 ms | 50.1 → 50.0 ms |
| 128² / 75 | 24 | 69.9 ms | 0.1 ms | 16.8 → 16.8 ms | 49.9 → 50.0 ms |
| 192² / 100 | 77 | 109.7 ms | 0.1 ms | 33.4 → 33.3 ms | 50.1 → 50.1 ms |

Median frame intervals were 16.7 ms in both Illustrated settings. The 100-building 80% run had a 66.7 ms worst interval with the pilot on (66.8 ms off). These short samples show no material additional pan cost; they do **not** promise 60 fps on iPhone. Forests/buildings remain the main close-zoom load. Inputs, image objects and Shape drawing functions were stable throughout pans.

First-time preparation of all six WebPs and eighteen masks took ~712 ms on the cloud browser. Placement is cached across immutable terrain/building/road/planning inputs and never repeated per gesture. Two source images decode at a time and are released afterward. Shared masks occupy **10.125 MiB** RGBA plus ~5.1 million data-URI characters for export, independent of map size. Original bundled WebPs total **2,407,038 bytes**, requested only after opt-in. Browser/GPU, temporary decoder and export allocations add to these figures. A 4096² output alone needs ~64 MiB RGBA; use 1024/2048 on low-memory phones. The 192² / 100-building fixture exported successfully at 2048 (3.26 s including initial image preparation, 5.03 MB PNG) and 4096 (2.13 s with warmed caches, 17.93 MB PNG), with no document changes. These are cloud measurements, not phone export timings. The existing large-chunk Vite warning comes from earlier bundled building/forest art; no dependencies were added.

## Physical iPhone checklist

1. Reload Safari and check footer **6C.2** and the deployed commit. Use a duplicate of Ravenfjord; do not delete Safari website data to refresh, since local projects live there. Export a JSON backup first.
2. Choose **Illustrated**. Open **Properties**, leave **Forest artwork → Canopy variety · twenty designs** enabled if already selected, and set **Illustrated grassland pilot → Off**. Take a baseline screenshot at Fit.
3. Select **On · restrained accents**. Wait for **All six meadow textures ready**. Return via **Explore**. Most green ground should remain quiet; find the sparse bright grass/flower patches away from buildings and paths. Forest shapes/colours must remain unchanged.
4. Pan/pinch through Fit, 40%, 50%, 80%, 100% and 150% around the same patch. The same silhouette, artwork, position and rotation must remain; no square perimeter, flicker, fake water pool or black/white background. Compare Off/On without moving the camera. Try **more meadow accents**, then restore restrained.
5. Inspect road surfaces, entrances, cultivated fields, shoreline, bridge banks and defensive sections. No new flowers or rocks should cover them. Near water, marsh reeds may appear only on safe land; rocky accents require existing grassy hills/rock coverage. No texture quota is forced when there is insufficient clearance.
6. Select a building near a patch by tapping its centre and footprint edges. Move, rotate, resize, lock/unlock, undo and redo; logical dimensions/entrances and appearance must behave exactly as before. Locking must still block movement. Try the terrain brush: two-finger navigation must not paint; cancel a stroke and then test one-stroke undo. Cancel a conflict preview without losing structures.
7. Scroll Properties and export panels to the bottom, including with Safari browser bars expanded/collapsed and landscape orientation. No floating toolbar should cover controls; return to Explore and pinch normally.
8. Wait for **Saved on this device**, close Safari, reopen the same project, and verify the grassland preference and original forest/building appearance choices persist. Open another project and confirm its geometry is intact. Visual preferences are shared across projects on this browser.
9. In **Export**, select Illustrated, canopy forest mode and **Illustrated grassland in PNG → restrained**. Prepare/download 1024, then 2048; test 4096 only with sufficient free device memory. Compare complete-map patches with the editor. Toggle grassland Off in export and verify the original terrain returns. Exercise grid, building-name and district options.
10. Download JSON and import it as a separate project. Original buildings, terrain, roads, appearance IDs and districts must match. Restore an existing named snapshot and verify normal history/persistence; the global pilot setting should not be written into the document.
11. Switch to Planning: the pilot must disappear and the previous technical map remain unchanged. Return to Illustrated, then turn grassland Off to restore the exact previous Illustrated ground. If images fail, confirm the warning and usable fallback; retry with a page reload rather than repeatedly toggling while offline.
12. Open a forest-heavy expanded 75–100-building map, repeat Fit/pinch/pan and prepare a 2048 PNG. Record iPhone model, iOS version, stalls and any Safari tab reload. Physical memory pressure remains unverified in this cloud environment.

No water/road overhaul, new terrain types, document migration, artwork generation, runtime asset uploads or changes to settlement generation are included.
