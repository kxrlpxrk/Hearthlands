# Phase 6C.1C — Forest variety and natural edges

## Enable and compare on iPhone

1. Reload Hearthlands and check the footer says **6C.1C**. Duplicate Ravenfjord in **Projects**, or import the [comparison fixture](screenshots/phase6c1b1/reference.json) as a separate project.
2. Choose **Illustrated** in the top map-style menu. Open **Properties** and scroll below the selected building inspector to **Map style settings**.
3. Set **Forest artwork → Canopy variety · 20 designs · 6C.1C**. This explicitly enables the PNG pilot. Wait for **All twenty canopy images ready. Five variations per species; original colours preserved.**
4. Tap **Explore**, then **Fit**. Pinch through approximately 40%, 80% and 150%, returning to the same woodland beside the village. Trees must keep their positions/designs, clear the settlement structures and water, and form bright overlapping woodland without the former flat green edge shapes. Inspect both broadleaf stands and conifer pockets.
5. Return to Properties and choose **Original Viking trees · 6C.1B.1** to compare the previous pack. Choose Canopy variety again. Turning **Viking tree PNG pilot** off returns the original procedural forest. Switching to Planning preserves its existing technical symbols. No geometry or project edits should occur.
6. Select a building beside the forest with one finger. Rotate, undo, lock/unlock and move/undo it. Forests must not intercept taps or cover its entrance and nearby road. With a Terrain brush active, two fingers must pan/pinch without painting. Clear a safe patch of woodland, undo and redo the stroke; cancel an unfinished stroke and cancel a conflicting water preview over a building.
7. Wait for **Saved on this device**, close and reopen Safari, and check the project, building appearances and chosen forest mode. Download/reimport JSON as a separate project; with the same forest choice, geometry/designs must reproduce. The forest choice is a browser visual preference, not a new project field.
8. Open **Export → PNG style: Illustrated → Forest artwork in PNG → Canopy variety**. Prepare 2048 and tap **Download PNG**. Use Safari downloads/Files, or Share → Save to Files if Safari displays the image. Inspect the full map, woodland boundary and clear roads/bridges. Repeat with Original, the pilot unchecked, and Planning. PNG choices are independent of the editor; changing a choice invalidates any previously prepared download.
9. Repeat with a 75–100-building 128–192-tile project, checking sustained pan/pinch and reopening. Try 4096 only if the phone has sufficient memory; 1024/2048 remain safer choices on older devices. Report the device/Safari version and zoom if you see excessive lag or flicker.

Control locations: [390-pixel screen](screenshots/phase6c1c/controls-390.jpg), [375-pixel screen](screenshots/phase6c1c/controls-375.jpg).

No physical iPhone/Safari was available during development. The automated touch checks below use Chromium emulation; these steps are the remaining physical-device acceptance check.

## Installed artwork and reversible baseline

The supplied `Hearthlands_Tree_Canopies_6C1C.zip` was accessible. All **20 original RGBA PNGs** were copied without resampling, cropping, recolouring or regeneration. The supplied [instructions](phase6c1c-supplied-instructions.txt) and [manifest](phase6c1c-supplied-manifest.txt) are retained. Preview sheets are not installed as runtime art.

The new [validated manifest](../src/assets/forests/canopies/manifest.json) records source archive/file SHA-256, stable IDs, species, variation, dimensions, alpha bounds, anchor, proportional size targets and selection weights. IDs are:

- `hearthlands.viking.canopy.beech.01` through `.05`
- `hearthlands.viking.canopy.birch.01` through `.05`
- `hearthlands.viking.canopy.oak.01` through `.05`
- `hearthlands.viking.canopy.pine.01` through `.05`

Sources are 368–594 pixels wide and 397–564 pixels tall. All have four-pixel transparent borders; measured alpha bounds exclude that padding. `python scripts/audit-forest-canopies.py` verifies actual RGBA pixels, dimensions, alpha bounds and source hashes using optional authoring-tool Pillow. It never writes artwork. Neither Python nor Pillow is required by npm install/build or the app. Unit/release checks verify the installed bytes and dimensions independently.

All six older forest sources and IDs remain installed. **Original Viking trees** retains the exact 6C.1B.1 rendering, including its four active individual trees and two withheld cropped-base clusters. The old opt-in checkbox remains. Existing browser preferences default to the original pack; the new pack requires an explicit choice. Old projects and v1/v2/v3 imports require no document migration.

A new optional `forestPack` browser preference is stored under the existing `hearthlands.visual.v1` key. Missing/unknown values resolve to `pilot`, preserving old preferences. There are no forest blobs, appearance IDs or new fields written to settlement JSON/IndexedDB/history. The preference applies across projects on the same browser, like existing map-style preferences; another browser must choose the same pack to reproduce that presentation.

## Composition, variation and edges

`forestCanopies.ts` reuses the existing woodland candidates, species regions, seed and clearance field. Every existing 6C.1B.1 group anchor survives, with the same species and no larger certified drawing envelope. The canopy-only image is proportionally fitted inside that circle and can rotate through a full turn. A separate world-coordinate/seed stream chooses one of five variants within the species, with positive weights **1.10 / 1.00 / 1.05 / 0.95 / 0.90**. Render order, image decoding order, project ID and camera are not inputs.

Nominal long-edge targets are beech **3.8**, birch **3.6**, oak **4.2** and pine **3.2** tiles, with stable 0.88–1.12 size variation and strict clearance reduction. Broadleaf canopies remain substantial in the existing brighter broadleaf regions; conifers retain their existing dense pockets and smaller targets. Species/resource data is never rewritten to force a colour distribution.

Smaller canopies at existing, safe boundary candidates replace exposed procedural remnants. A spatial index rejects already covered anchors, and seeded gaps soften the fringe. Tiny clearances reduce or reject images; they never permit foliage to spill onto a road or water. The 35-building reference retains **1,832 original group anchors** and adds **409 edge canopies**, using all twenty designs.

**Healthy canopy mode draws no procedural crown layer, forest-floor wash, dark rectangle, colour filter or added shadow.** Natural gaps reveal the unchanged base terrain. Original bright greens, golden-yellow foliage and source alpha are preserved. Partial image failures recover procedural foliage only in affected areas; healthy assignments do not reroll. A completely unavailable pack falls back to the original procedural renderer, with a visible warning.

The conservative clearance field is unchanged. It protects map/woodland boundaries, water and soft banks, cultivated soil, planning fields/yards/gathering spaces, all building footprints and entrances, roads, bridges, walls, gates and fences. Full source-alpha rectangles, including rotated corners, stay in their certified circles. Existing long-curved-wall interval protection is retained. Forest drawing is non-listening and cannot intercept building selection, brushing or camera gestures.

## Rendering, loading and export

The same ordered `ForestSprite` plans feed the editor and complete-map SVG/PNG. Healthy canopy mode uses **one Konva image batch**, not one node per tree, with viewport culling, bounded two-entry geometry caches and existing overview caching. Geometry is independent of zoom/detail. Each original image decodes once and builds 256-/64-pixel caches of the **same artwork**, preserving alpha. Existing physical-pixel thresholds and hysteresis are unchanged: initial ≤48 px distant, ≤192 px medium; transitions retain distant through 56, medium through 40–224 and high down to 160. No generic symbol substitution or continuous zoom-time image processing occurs.

The new optional pack uses a **1.71 kB local-URL module** and twenty separately emitted PNGs, approximately **7.36 MB total**. It avoids a large base64 JavaScript bundle for the new sources. Nothing downloads for it until opt-in. At most four PNG download/decode jobs run concurrently. Only manifest-matching Vite base-path-safe PNG URLs are admitted; remote URLs, traversal and other formats are rejected. Headers/dimensions are validated before decoding. Each job has a ten-second abort timeout; module loading is bounded to eight seconds. Failed loads are cached until reload to avoid repeated requests while navigating. Restore the connection and reload if images were unavailable.

Original source pixels occupy about **16.43 MiB**, plus **4.86 MiB** for the two image-pyramid levels, excluding encoded strings, canvas layers and browser overhead. Comparing both packs also retains the older pack's existing image cache. PNG bytes are converted to local data URIs once for shared rendering/export use; they never enter project storage. The main entry grows by roughly 12 kB raw / 4 kB gzip. The existing large-entry warning remains; no dependencies or remote services were added.

Export embeds each used approved original PNG once in local SVG definitions, using the exact editor transforms/order and the original detail independently of viewport zoom. Preparing PNG awaits the selected pack. Existing 1024/2048/4096 bounds, grid, labels, districts and error handling remain. Export-panel pack changes clear stale downloads. Direct programmatic `mapSvg` callers must prepare `forestImagesForPack(pack)` first or receive the documented fallback. Planning ignores all forest-image options.

## Before/after evidence

Both captures import the same [seed-1847 reference](screenshots/phase6c1b1/reference.json): 35 Viking buildings, River/Contextual, 96×96, with extra woodland painted into free outskirts for visual testing. This fixed test fixture does not change production generation. Viewport is 390×844 at DPR 2. Camera scale and building-client bounds match exactly at every paired view; records are in [verification evidence](phase6c1c-evidence.json). Close views are centred on `generated-1847-22`.

| View | Original 6C.1B.1 | Canopy variety 6C.1C |
| --- | --- | --- |
| Fit (actual 10.611979%) | [Before](screenshots/phase6c1c/before-fit.jpg) | [After](screenshots/phase6c1c/after-fit.jpg) |
| 40% | [Before](screenshots/phase6c1c/before-40.jpg) | [After](screenshots/phase6c1c/after-40.jpg) |
| 80% | [Before](screenshots/phase6c1c/before-80.jpg) | [After](screenshots/phase6c1c/after-80.jpg) |
| 150% | [Before](screenshots/phase6c1c/before-150.jpg) | [After](screenshots/phase6c1c/after-150.jpg) |

Also included: [50% view](screenshots/phase6c1c/after-50.jpg) and [export preview](screenshots/phase6c1c/export-preview.jpg), a downsampled JPEG of the actual complete 2048 PNG. Before uses main commit `428a63f`; after is the working production build before commit, hence its `local` footer. No screenshots are generated mock-ups.

Pixel comparisons of complete 1024 PNGs confirm **zero changed pixels** for Original mode versus 6C.1B.1, procedural mode versus the previous release, and whole-pack failure versus procedural mode.

## Validation and performance

**319 tests in 29 files pass**, including sixteen canopy tests. Coverage includes source integrity/registry rejection, five variations per species, deterministic groups and preserved anchors/species, complete rotated envelopes, road/bridge/defense/field/building/entrance/water clearance, natural fringes, no healthy procedural overlays, cache reuse, partial/all failures, four-job concurrency, timeout aborts, preference/history isolation, autosave/reopening, named restore points, JSON and all-resolution export transforms. Existing generator, district development, expansion, infrastructure, building assets and legacy-project suites remain passing. Production build, original-image alpha audit and release verification pass. Release verification checks all twenty emitted original PNG hashes and base-safe references as well as the six old images and preserved editor controls.

Production Chromium touch checks passed at 375×667, 390×844 and 844×390: scroll/overflow checks, selecting/rotating/locking/undoing buildings, reversing forest packs, terrain stroke cancellation/undo, two-finger navigation with an active brush, conflict cancellation, real browser-profile close/reopen, JSON download/reimport isolation and PNG downloads at 1024/2048/4096. One blocked PNG leaves nineteen designs with a warning and no reassignment; a blocked pack module exports exact procedural fallback without retries or project changes.

Serial cloud Chromium touch samples, DPR 3, 120 animation frames during real touch pans:

| Map / buildings | Canopies (original anchors + edges) | Illustrated Fit p95 | Illustrated 80% p95 / worst |
| --- | ---: | ---: | ---: |
| 96² / 35 | 2,241 (1,832 + 409) | 16.8 ms | 50.1 / 50.1 ms |
| 128² / 75 | 3,141 (2,201 + 940) | 16.7 ms | 33.4 / 33.4 ms |
| 192² / 100 | 6,321 (4,093 + 2,228) | 33.3 ms | 50.0 / 83.4 ms |

All samples had approximately **16.7 ms median**, but the upper tail shows dropped frames. These observational samples are not a physical iPhone performance guarantee. Original image objects and draw functions are reused during pan. Separate browser construction measurements add about **63 / 73 / 128 ms** for canopy composition after **169 / 255 / 380 ms** baseline layout; fifty cached lookups take 0.1–0.4 ms. These exclude network, decoding and initial native-canvas preparation. Synthetic forest-heavy 100-building unit stress cases also pass at 96/128/192, with up to 9,260 sprites in one image batch.

A 100-building 192² map with 15,016 forest cells exported complete 2048/4096 canopy PNGs in about **2.1 / 2.4 seconds**, including preparation after the export action, without source changes. Older phones may be slower or run out of export memory; use 1024/2048 and the existing clear error/retry flow. Very dense close-ups can still stutter, and five designs per species cannot eliminate all recognisable repetition. Conservative clearances leave occasional tiny gaps or sparse very narrow woodland strips. This phase preserves the source palette and improves canopy composition; it does not overhaul grass, rivers, map generation or building art.
