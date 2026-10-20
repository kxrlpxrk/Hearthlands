# Phase 6B.8 — Consistent zoom-level artwork

Illustrated raster buildings now retain the selected PNG design at every zoom. The image source may be the original or a cached downsample, but roof colours, silhouette, architecture, orientation and appearance IDs do not change. Release marker: **6B.8**.

## Cause and implementation

6B.7 switched the three Sheet 4 pilots to manually authored vector symbols below **16 CSS pixels per tile** (50% zoom on the 32-pixel grid), or whenever Reduced detail was active. Other raster assets used the original PNG or one 256-pixel cache, with a second reduced-detail threshold below **7 CSS pixels per tile** (21.875%). These rules explain why the same asset looked different around 40% and 79%.

The vector substitution has been removed from both the editor and exports. The optional legacy `presentation.overview` manifest field remains validated for compatibility but is ignored for raster rendering. Installed pilot metadata keeps the same safe 1.06/1.04/1.03 scale and bounds; its obsolete symbol definitions were removed. No PNG, asset ID, automatic-selection pool or document schema was changed.

Each installed PNG decodes once, then prepares at most two transparent cache surfaces, shared by all buildings using that source:

- **HIGH:** original approved PNG, up to its original source resolution.
- **MEDIUM:** maximum edge 256 pixels, downsampled from that original PNG.
- **DISTANT:** maximum edge 64 pixels, downsampled from MEDIUM using the same browser high-quality image smoothing.

No source art is redrawn, reconstructed, recoloured, outlined or replaced. There is no separate raster shadow, matte or background. Both caches preserve the full source aspect and transparency; all levels use the identical original alpha crop, safe fitting, centre and rotation. The same non-interactive Konva Image node is used at all levels; editor hit rectangles and interaction overlays remain separate and unchanged. A vector fallback is used only for a confirmed missing/failed image, not as a transient loading or distant-zoom replacement.

All cache allocation and resampling happens once at successful decode, before publishing the ready image. Zoom and pan reuse existing objects. If a cache allocation fails, the next larger cached surface or original PNG remains usable; it does not retry allocation during camera movement. Failed/stalled decodes are cached with the existing five-second timeout. No new dependency or runtime remote image request was added.

## Actual thresholds and transitions

Detail depends on the projected **full source canvas edge in physical pixels**, including device pixel ratio, safe scaling, alpha fitting and current footprint. It is not a fixed settlement-wide zoom percentage. That prevents a large hall or retina screen from receiving an undersized bitmap.

Initial selection:

| Projected source canvas edge | Level |
| --- | --- |
| ≤48 physical pixels | DISTANT (64 px) |
| >48 to 192 physical pixels | MEDIUM (256 px) |
| >192 physical pixels | HIGH (original) |

Hysteresis retains DISTANT until >56 px, MEDIUM while 40–224 px, and HIGH until <160 px. Large jumps go directly to the appropriate level. Physical pixels per tile are quantised in one-eighth octave buckets (about 9% steps), avoiding artwork rerenders for every pinch event. Oversampling headroom accommodates this rounding without upscaling an undersized cache. Pan does not change the input. Vector buildings do not receive the changing raster pixel input, preserving their memoisation.

There is **no crossfade**, continuous animation, simultaneous old/new image layer, or camera-dependent image processing. A discrete switch between visually matching samples avoids opacity flashes and double rendering. Changing an appearance resets that building's detail hysteresis by source. The map's existing Reduced detail preference still simplifies terrain/vector presentation; it cannot force an undersized raster cache or a different icon onto a large PNG building.

## Exports, thumbnails and compatibility

Full Illustrated PNG/SVG output always embeds the original approved image, independent of editor zoom. Reduced-detail output also keeps that same raster design; it can simplify terrain and vector detail without substituting raster symbols. Appearance thumbnails continue showing the original corresponding PNG with the same safe fitting.

All functional coordinates, footprints, collisions, entrances, hit regions, selection/lock indicators, roads, terrain, districts, generation, saves and history are unchanged. Document v1/v2/v3 loading, project IDs, autosave, snapshots, JSON and manual/automatic appearance selection continue using their existing systems. Planning rendering and its exports are unchanged. Existing source resolution and pale source-edge remnants remain; this phase does not retouch approved artwork.

## Reproducible mobile comparison

The same 35-building Viking / River / Contextual / seed 1847 / 96×96 fixture was used before and after. It contains the three Sheet 4 designs and custom Ravenfjord longhouses 01–03 as manual choices, without moving or resizing any building. Captures use production builds, 390×844 CSS pixels and DPR 2. Every design was checked at Fit (10.611979%, displayed 11%), 20%, 40%, 60%, 80%, 100% and 150%. [Machine-readable actual representations](phase6b8-zoom-evidence.json).

| Asset | Fit / 20% | 40% | 60% / 80% | 100% | 150% |
| --- | --- | --- | --- | --- | --- |
| Cottage | DISTANT | DISTANT | MEDIUM | MEDIUM | MEDIUM |
| Tavern | DISTANT | MEDIUM | MEDIUM | MEDIUM | HIGH |
| Farmstead | DISTANT | MEDIUM | MEDIUM | HIGH | HIGH |
| Longhouses 01–03 | DISTANT | MEDIUM | MEDIUM | HIGH | HIGH |

These are actual ascending-zoom samples, not universal zoom thresholds; footprint, DPR and direction within hysteresis bands affect level choice. Even the small Cottage at 150% needs only its 256-pixel cache on this DPR-2 viewport. All levels depict the same selected artwork.

| Comparison | Before 6B.7 | After 6B.8 |
| --- | --- | --- |
| Fit / 11% | [Before](screenshots/phase6b8/before-fit.jpg) | [After](screenshots/phase6b8/after-fit.jpg) |
| Cottage / 40% | [Before](screenshots/phase6b8/before-cottage-01-40.jpg) | [After](screenshots/phase6b8/after-cottage-01-40.jpg) |
| Cottage / 80% | [Before](screenshots/phase6b8/before-cottage-01-80.jpg) | [After](screenshots/phase6b8/after-cottage-01-80.jpg) |
| Cottage / 150% | [Before](screenshots/phase6b8/before-cottage-01-150.jpg) | [After](screenshots/phase6b8/after-cottage-01-150.jpg) |
| Tavern / 40% | [Before](screenshots/phase6b8/before-tavern-01-40.jpg) | [After](screenshots/phase6b8/after-tavern-01-40.jpg) |
| Tavern / 80% | [Before](screenshots/phase6b8/before-tavern-01-80.jpg) | [After](screenshots/phase6b8/after-tavern-01-80.jpg) |
| Tavern / 150% | [Before](screenshots/phase6b8/before-tavern-01-150.jpg) | [After](screenshots/phase6b8/after-tavern-01-150.jpg) |
| Farmstead / 40% | [Before](screenshots/phase6b8/before-farm-01-40.jpg) | [After](screenshots/phase6b8/after-farm-01-40.jpg) |
| Farmstead / 80% | [Before](screenshots/phase6b8/before-farm-01-80.jpg) | [After](screenshots/phase6b8/after-farm-01-80.jpg) |
| Farmstead / 150% | [Before](screenshots/phase6b8/before-farm-01-150.jpg) | [After](screenshots/phase6b8/after-farm-01-150.jpg) |
| Timber longhouse 01 / 40% | [Before](screenshots/phase6b8/before-longhouse-01-40.jpg) | [After](screenshots/phase6b8/after-longhouse-01-40.jpg) |
| Timber longhouse 01 / 80% | [Before](screenshots/phase6b8/before-longhouse-01-80.jpg) | [After](screenshots/phase6b8/after-longhouse-01-80.jpg) |
| Timber longhouse 01 / 150% | [Before](screenshots/phase6b8/before-longhouse-01-150.jpg) | [After](screenshots/phase6b8/after-longhouse-01-150.jpg) |
| Painted longhouse 02 / 40% | [Before](screenshots/phase6b8/before-longhouse-02-40.jpg) | [After](screenshots/phase6b8/after-longhouse-02-40.jpg) |
| Painted longhouse 02 / 80% | [Before](screenshots/phase6b8/before-longhouse-02-80.jpg) | [After](screenshots/phase6b8/after-longhouse-02-80.jpg) |
| Painted longhouse 02 / 150% | [Before](screenshots/phase6b8/before-longhouse-02-150.jpg) | [After](screenshots/phase6b8/after-longhouse-02-150.jpg) |
| Mossy longhouse 03 / 40% | [Before](screenshots/phase6b8/before-longhouse-03-40.jpg) | [After](screenshots/phase6b8/after-longhouse-03-40.jpg) |
| Mossy longhouse 03 / 80% | [Before](screenshots/phase6b8/before-longhouse-03-80.jpg) | [After](screenshots/phase6b8/after-longhouse-03-80.jpg) |
| Mossy longhouse 03 / 150% | [Before](screenshots/phase6b8/before-longhouse-03-150.jpg) | [After](screenshots/phase6b8/after-longhouse-03-150.jpg) |

## Verification and limitations

The six custom designs were compared at all seven zooms: **42 paired cases** retained identical source IDs, camera scales and logical footprint dimensions. Every after-case used a raster image, with no vector overview group or separate raster shadow. Before/after screenshots show actual production builds, not substituted mock artwork. Full-resolution and independently built 256/64-pixel samples were also compared against the displayed sources at close zoom and Fit: **zero differing RGBA bytes**, including transparent outer corners, for all six designs. This confirms cache levels contain the selected PNG, rather than a recoloured or generic icon.

Production touch emulation additionally checked centre/edge/outside selection at 100%, all four rotations, move/resize with undo, Reset/Undo/Redo, locks, and scrolling at 375×667, 390×844 and 844×390. The complete document equalled its starting value after undoing temporary edits. JSON download/import created a separate project with unchanged appearance IDs; closing/reopening the browser restored the same document. Standard full-map PNG downloads succeeded at 1024/2048/4096 and reduced-detail 2048. Planning showed neither raster images nor raster proxies. No browser page errors occurred.

### Resource use

At most two extra surfaces per source are retained. MEDIUM replaces the old 256-pixel cache; the newly added DISTANT surfaces total **81,920 bytes (80 KiB)** of RGBA storage for the current eight PNG sources. The original decoded images were already retained in 6B.7. No new PNG files, data blobs in projects, network assets, dependencies or continuously allocated zoom surfaces were added. Cache allocation failure reuses larger images safely. The production entry was approximately **6,125.14 kB / 4,202.50 kB gzip**, slightly smaller than the 6B.7 build (6,126.29 / 4,202.87 kB); the existing large-bundle warning remains.

### Touch-pan performance

Short production Chromium samples used a 390×844 viewport at DPR 3, 120 sampled frames and actual touch-pan events. These are desktop emulation measurements, not a physical-Safari performance guarantee. The maps were valid generated/expanded fixtures; no application generator changes were made.

| Buildings / map | Style / zoom | Median frame interval | p95 | Worst |
| --- | --- | --- | --- | --- |
| 35 / 96² | planning / Fit | 16.7 ms | 16.8 ms | 16.8 ms |
| 35 / 96² | illustrated / Fit | 16.7 ms | 16.7 ms | 16.8 ms |
| 35 / 96² | planning / 80% | 16.7 ms | 16.8 ms | 33.3 ms |
| 35 / 96² | illustrated / 80% | 16.7 ms | 33.4 ms | 33.4 ms |
| 75 / 128² | planning / Fit | 16.7 ms | 16.8 ms | 33.3 ms |
| 75 / 128² | illustrated / Fit | 16.7 ms | 16.8 ms | 16.8 ms |
| 75 / 128² | planning / 80% | 16.7 ms | 33.3 ms | 33.4 ms |
| 75 / 128² | illustrated / 80% | 16.7 ms | 33.4 ms | 33.4 ms |
| 100 / 192² | planning / Fit | 16.7 ms | 33.4 ms | 33.5 ms |
| 100 / 192² | illustrated / Fit | 16.7 ms | 33.4 ms | 100.1 ms |
| 100 / 192² | planning / 80% | 16.7 ms | 66.7 ms | 83.4 ms |
| 100 / 192² | illustrated / 80% | 16.7 ms | 66.7 ms | 116.7 ms |

The 35/75/100 fixtures contained **24/36/52 raster buildings**, respectively, including the existing demo and custom PNGs alongside automatic vector appearances. All image objects were reused through panning, and the saved source documents remained identical. Median frame interval remained 16.7 ms. The 100-building case had intermittent slower frames (up to 116.7 ms in Illustrated); intermittent large-scene frame stalls remain a limitation of this measured setup. No terrain/rendering overhaul was introduced to hide those results. Reduced detail remains available for environmental/vector layers.

At Fit, a roof can occupy only a few screen pixels. Its fine details cannot remain legible, but its sampled colour, silhouette and orientation remain those of the selected artwork. Native source resolution, paper-edge remnants and any shadows embedded in approved art remain unchanged. Camera detail does not invent new detail for large resizes. Physical Safari memory pressure, touch response and native downloads must still be verified on device.

## Exact physical-iPhone acceptance steps

1. Reload the deployment **without clearing Safari website data**. Verify footer **6B.8** and the deployment commit. Duplicate Ravenfjord and open the duplicate; switch to Illustrated.
2. In Properties → Appearance, apply each existing Sheet 4 Cottage/Tavern/Farmstead to its matching building kind. Select three longhouses in turn and apply Ravenfjord Timber Longhouse, Ravenfjord Painted Timber Hall and Ravenfjord Mossy Timber Hall. Do not change functional footprints just to test zoom.
3. For each design, tap Fit (about 11% for a 96×96 map), then pinch through the displayed **20%, 40%, 60%, 80%, 100% and 150%**, and reverse direction. Roof colours, wings, fences and orientation must stay recognisably the same. Look around the former 50% switch; there must be no change to a generic symbol. Expect fewer visible pixels at Fit, not a different building.
4. Slowly pinch back and forth near detail changes. There must be no white/black rectangular background, opacity flash, double image or repeated loading icon. Pan at fixed zoom; artwork must stay stable. Two-finger camera gestures must not move buildings or paint terrain.
5. At 100%, test selection at the centre and edges, then just outside the logical footprint. Rotate through 0/90/180/270°, move and resize; the image must remain centred, proportional and inside safe bounds. Undo temporary geometry edits. Test Lock/Unlock and appearance Reset → Undo/Redo.
6. Wait for Saved, close and reopen Safari, and verify manual choices plus neighbouring automatic appearances. Check a named restore point if desired; no camera detail or cache bytes belong in project JSON.
7. Export the complete Illustrated map at 2048 (1024 if memory is tight; 4096 if supported). Inspect in Files: selected PNG designs must remain detailed irrespective of the editor's last zoom. Repeat with Reduced visual detail checked; raster identity must remain the same. Export/import JSON as a separate project.
8. Switch to Planning and verify familiar symbols and editing. Open 35-, 75- and 100-building projects, including 192×192, then pan/pinch in both styles. Check physical responsiveness and downloads; report the device/Safari version if slower than acceptable.

## Automated release checks

**270 tests across 26 files passed.** New coverage tests physical-pixel thresholds, hysteresis, quantisation, alpha crop invariance across cache sizes, explicit ignoring of legacy vector overviews, one decode plus two bounded surfaces for all eight sources across 100 buildings/zooms, allocation fallback, and cached decode timeouts. Existing transform, locking, history, autosave, snapshots, projects, legacy JSON, export, generator, district/development/expansion, terrain and infrastructure tests remain passing.

The production build, alpha-manifest audit and release verification passed. Release verification checks 6B.8 plus the preserved controls and asset names, and rejects a bundle containing the old raster-overview substitution. Source PNG files and alpha bounds are byte-for-byte unchanged; no document schema or gameplay source was edited.
