# Phase 6C.1B — Viking tree PNG pilot

Release **6C.1B** installs the six supplied transparent PNGs as an **opt-in Illustrated forest pilot**. Every source file is unchanged and SHA-256 verified against the supplied manifest. No replacement artwork was generated.

The original [installation instructions](phase6c1b-install-instructions.txt), [pack README](phase6c1b-pack-readme.txt) and [manifest](../src/assets/forests/manifest.json) are retained. This is installed artwork, not a runtime uploader or an asset-sheet importer.

## Enable it on iPhone or desktop

1. Choose **Illustrated** using the map-style menu.
2. Open **Properties**, then scroll to **Map style settings** below any selected building's inspector.
3. Enable **Viking tree PNG pilot**. Wait for **All six tree images ready**. If loading fails, a status message identifies the fallback; procedural woodland remains usable.
4. Tap **Explore** to return to the map. Turn the checkbox off for the exact 6C.1A baseline.

The option defaults **off**, including old browser preferences. It is stored with the existing browser visual preferences, applies across local projects and survives reopening. It does not modify settlement documents, JSON, autosave revisions, snapshots or undo history. Importing JSON on a different browser does not activate the pilot there.

For exports, choose **Export → PNG style: Illustrated → Viking tree PNG pilot in PNG**. This independent checkbox initially follows the map preference. Planning ignores and disables the pilot option.

## Installed sources

All entries retain `manualApproved: false` and `automaticEnabled: false` from the supplied manifest. Only explicit pilot opt-in admits them to the limited visual sample; they never enter the default forest pool.

| Asset ID | Name | RGBA source size | Diameter hint (tiles) |
| --- | --- | --- | --- |
| `hearthlands.viking.tree.beech-02` | Beech 02 | 408×269 | 1.35 |
| `hearthlands.viking.tree.birch-13` | Birch 13 | 408×230 | 1.30 |
| `hearthlands.viking.tree.oak-02` | Oak 02 | 408×272 | 1.55 |
| `hearthlands.viking.tree.pine-05` | Pine 05 | 408×328 | 1.30 |
| `hearthlands.viking.tree.mixed-cluster-01` | Mixed Tree Cluster | 1052×468 | 3.20 |
| `hearthlands.viking.tree.forest-edge-01` | Forest Edge Cluster | 1052×416 | 3.50 |

The manifest records the supplied source-sheet crops and origin. Diameter hints cap visual sizing; they grant no extra clearance. Cluster hints commonly exceed existing crown envelopes, so clusters are proportionally reduced or skipped. Source alpha bounds were measured without rewriting PNGs and are recorded in `assets/forests/bounds.json`. Anchors remain at the original normalised (0.5, 0.5) canvas origin, rather than recentering or stretching the crop.

## Placement and composition

The 6C.1A forest candidate generator, seed, species, woodland mask and clearance field are unchanged. The pilot consumes those same crown positions and certified circles. It does not regenerate forests or modify terrain/resource data.

A separate spatially seeded stream admits at most approximately **15%** of candidates before safety/size filtering. Single-tree choices match each candidate's existing species. Selection depends on the settlement seed and world coordinates, never project ID, camera, zoom, render order or decoding order. A duplicate/reopened document produces the same assignments.

Every fitted alpha rectangle, including branches, rocks and all rotated corners, lies strictly inside its candidate's already-certified circle. The fit preserves aspect ratio and the manifest anchor, caps image size at the supplied hint, and leaves an antialiasing safety inset. Too-small single sprites and unsuitable clusters are skipped. Single trees have only small, deterministic orientation variation; clusters remain source-upright.

Clusters are limited to suitable north-facing woodland edges, with their cropped lower edge facing denser woodland. Selection permits at most one per 8-tile macrocell and enforces at least seven tiles between accepted clusters, including across neighbouring macrocells. They are never mass-stamped through interiors. A map may legitimately contain no suitable clusters or omit an individual design.

The continuous procedural canopy remains underneath the limited PNG layer. Early screenshots showed that putting small native sprites behind neighbouring crowns obscured their artwork and left bare gaps if larger crowns were removed. Retaining the canopy underlay avoids those holes, preserves the woodland silhouette and gives immediate fallback. The actual supplied PNGs render above it without adding shadows, mattes or opaque backgrounds. This pilot is a limited artwork layer, not a claim that every canopy has final illustrated art.

Existing buildings, entrances, roads, bridges, walls, gates, farmland, water and map boundaries retain the same clearance protection, including the 6C.1A long-curved-wall guard. Images cannot enlarge those envelopes. All tree rendering remains non-listening, so it cannot intercept selection or terrain/camera gestures.

## Loading, zoom and exports

`assets/forests/registry.ts` validates the six fixed IDs, roles, species, safe local references, sizes, anchors and disabled automatic flags. A separate lazy Vite module contains the original inline PNG bytes. It is requested only after opt-in, through the application's base-path-safe local JavaScript loader. There are no runtime remote image URLs, image services or user paths.

The main entry grows by roughly 14 kB raw / 5 kB gzip. The optional PNG module is approximately **2.96 MB raw / 2.23 MB gzip**, downloaded once when enabled. The existing large-bundle warning remains. The six decoded originals occupy about 5.3 MiB of RGBA pixels, plus roughly 1 MiB for bounded detail caches, excluding browser overhead. No cache is allocated per tree.

Each source decodes once and prepares at most two transparent same-image caches: 256-pixel and 64-pixel maximum edges. Full, medium and distant views use the same source design, alpha crop, anchor and world transform. The existing physical-pixel thresholds and hysteresis select detail; there is no vector-icon substitution or continuous zoom processing.

All pilot sprites share **one extra Konva draw batch**, with viewport culling and reused images. Camera movement does not rerun candidate generation or decode images. Existing overview bitmap limits remain in force. The two-entry pilot plan cache reuses the procedural geometry rather than duplicating full canopy paths.

Image decoding is bounded to five seconds; the lazy-module load is bounded to eight seconds. Failures are cached until reload, not retried every frame. Partial failure suppresses only the affected PNG assignments; other assignments do not shift. A failed small-cache allocation retains the original/larger image.

SVG/PNG export consumes the same sprite plans and transforms. `renderPng` prepares the pack first when requested; `mapSvg` embeds each used original PNG **once** in local SVG definitions and references it from each fitted sprite. There are no remote references or per-tree copies of large image data. Export always uses original image detail, independently of editor zoom. Direct SVG callers should await `forestImages.prepare()` before requesting pilot output. If artwork is unavailable, the SVG includes a fallback description and the UI reports that original procedural crowns are being exported.

Existing 1024/2048/4096 options, full-map bounds, labels, districts, grid and resource failure handling are unchanged. Project JSON never contains tree image blobs or pilot flags.

## Verification

**301 automated tests in 28 files pass**, including 14 new pilot tests. Production build and release verification pass. Release verification checks all six original PNG hashes inside the actual lazy production bundle, alongside the preserved building assets, editor/development/expansion controls and release marker.

New coverage includes source hashes/RGBA headers, manifest rejection, baseline parity, old preferences, deterministic and order-independent assignment, sparse clusters, arbitrary-rotation containment, native-size caps, unchanged document/history, partial and total loading failure, bounded timeouts, same-image detail caches and self-contained export transforms. The complete existing generator, terrain, infrastructure, district, expansion, saved-project and custom-building regression suite also passes.

Production touch emulation checked 375×667, 390×844 and 844×390 layouts; opt-in off/on; no lazy tree request while off; one lazy pack request after enabling; Fit/40%/80%/150%; building selection/rotation/locking/undo; terrain stroke cancellation/undo; two-finger navigation with an active brush; browser close/reopen; isolated JSON import; and complete PNG downloads at 1024, 2048 and 4096.

The 35-building comparison map has 606 pilot sprites using all six images. Its JSON is unchanged by opt-in, camera movement and exports. Turning the pilot on changes 62,827 pixels in the 1024 export; blocking the tree module produces a procedural export with **zero RGB pixel differences** from the pilot-off export. There were no page errors in the normal or forced-failure checks.

Forest-heavy touch-pan checks used the existing seed-1847 village and its 75/100-building expansions, with additional woodland painted into unoccupied western land for stress coverage. No application generation was changed. At 390×844 / DPR 3, 120 animation-frame samples during 40 touch moves gave:

| Map / buildings | Illustrated pilot Fit median / p95 | Illustrated pilot 80% median / p95 |
| --- | --- | --- |
| 96² / 35 | 16.7 / 16.8 ms | 16.7 / 50.0 ms |
| 128² / 75 | 16.7 / 16.8 ms | 16.7 / 33.4 ms |
| 192² / 100 | 16.7 / 16.7 ms | 16.7 / 66.5 ms |

The worst 100-building close-view sample was 100 ms. These are **development-machine Chromium emulation results**, not physical Safari guarantees. Large close-up maps can still drop frames. Full measurements and checks are in [the evidence record](phase6c1b-evidence.json).

## Visual comparison and limitations

The screenshots use the same 35-building forest-heavy source, seed, appearances and camera positions, with grid/district overlays hidden. Off uses the unchanged procedural baseline. Fit is 10.611979% (displayed 11%); the other captures are actual 40%, 80% and 150% touch zooms.

| Zoom | Off | Pilot on |
| --- | --- | --- |
| Fit | [Baseline](screenshots/phase6c1b/baseline-fit.jpg) | [Pilot](screenshots/phase6c1b/pilot-fit.jpg) |
| 40% | [Baseline](screenshots/phase6c1b/baseline-40.jpg) | [Pilot](screenshots/phase6c1b/pilot-40.jpg) |
| 80% | [Baseline](screenshots/phase6c1b/baseline-80.jpg) | [Pilot](screenshots/phase6c1b/pilot-80.jpg) |
| 150% | [Baseline](screenshots/phase6c1b/baseline-150.jpg) | [Pilot](screenshots/phase6c1b/pilot-150.jpg) |

The supplied pack contains slightly tilted artwork, limited native source detail, minor cutout artifacts and flat cropped cluster bases. These characteristics were not retouched or replaced. Sparse edge-aware use reduces their impact, but close inspection can still reveal them. At Fit, small images primarily contribute texture. This is not a full forest art overhaul, custom pack importer or per-tree editor. Physical iPhone Safari was unavailable.

## Physical iPhone playtest

1. Open Hearthlands in Safari, reload and verify **6C.1B** plus the reported short commit in the footer. Duplicate Ravenfjord in Projects.
2. Choose **Illustrated → Properties → Map style settings → Viking tree PNG pilot**. Wait for all six images ready, then tap **Explore**. Confirm the flag was initially off and turning it off restores the procedural baseline.
3. Find a dense woodland edge beside the settlement. Compare **Fit, 40%, 80% and 150%** while tracking the same image trees. Their source design, position and orientation should remain stable; inspect transparent foliage edges and the sparse cluster bases.
4. Pan and pinch repeatedly. Select a nearby building, rotate/resize/move it, lock/unlock and undo. Check roads, bridge banks, buildings, entrances and fields stay unobscured and hit regions remain correct.
5. With **Terrain → Nature**, clear a small forest patch, Undo/Redo and test two-finger navigation with a brush active. Cancel an unsafe water preview over a building. No cancelled edit or camera gesture should alter terrain.
6. Switch to **Planning** and confirm its technical symbols/editor are unchanged. Return to Illustrated, close Safari fully and reopen. Confirm the pilot choice, same image assignments and saved project edits remain.
7. Open **Export → PNG style: Illustrated**, enable **Viking tree PNG pilot in PNG**, choose 2048 and prepare/download. Compare the complete forest with the editor in Files/Photos. Export once with the option off for a direct comparison. Try 4096 if device memory permits; retain the existing 1024/2048 fallback if Safari reports resource failure.
8. Export/import JSON into a separate project. Check building/road/terrain geometry and the deterministic forest. The browser preference remains local; the JSON contains no PNG bytes or pilot setting. Repeat navigation on 75–100-building and 192² maps and report any Safari-specific stalls, missing images or tab reloads.
