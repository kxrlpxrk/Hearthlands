# Phase 6B.7 — Building artwork scale and readability

The three Sheet 4 pilots now use slightly larger, footprint-safe PNG fitting at close zoom and colour-matched roof/yard symbols at overview zoom. The source PNG files, asset IDs, manual appearance choices, gameplay geometry and project schema are unchanged. The release marker is **6B.7**, with the deployment commit in the footer.

## Cause and safe sizing limits

Phase 6B.6 already measured nonzero alpha and excluded transparent padding correctly. Vector symbols adapt to the logical rectangle; raster pixels retain their native proportions. These landscape-shaped crops leave space along the other axis, particularly inside a square Cottage footprint. Dense texture and pale source remnants also lose contrast when the entire roof is only a few screen pixels across. Scaling the whole PNG canvas, stretching a roof, or restoring the incorrect vector shadow would not fix this safely.

| Manual appearance | Multiplier versus 6B.6 alpha fit | Nominal logical footprint | Visible fitted PNG size in tiles |
| --- | --- | --- | --- |
| Viking Cottage – Sheet 4 | **1.06 (+6%)** | 2×2 | 1.9928×1.4312 |
| Viking Tavern – Sheet 4 | **1.04 (+4%)** | 3×2 | 2.9952×1.6904 |
| Viking Farmstead – Sheet 4 | **1.03 (+3%)** | 4×3 | 3.9964×2.2383 |

All three are constrained by available footprint width. The proposed starting experiments (Cottage 1.45, Tavern 1.35, Farmstead 1.20) would produce widths **2.726, 3.888 and 4.656 tiles**, respectively, exceeding their 2/3/4-tile protected footprints. They were rejected; no occupied neighbours or roads are covered to achieve an apparent size increase. Arbitrary resizing may further cap a multiplier. Original roof/fence proportions and the entire measured alpha crop remain intact.

## Installed presentation metadata

`BundledImageArtwork.presentation` is optional, validated and versioned independently of project documents:

- `version:1`
- `scale`: optional positive multiplier, accepted authoring range 0.25–3; default 1
- `offset:{x,y}`: optional fractions of the unrotated logical footprint, positive right/down; default 0/0; each accepted value is between −1 and 1
- `bounds:{x,y,width,height}`: optional normalised safe rectangle entirely within [0,1]²; default the full footprint
- `overview`: optional locally authored, validated lightweight vector symbol

`rasterGeometry` removes source padding using the existing pixel-space `visibleBounds`, contains the native aspect ratio, applies scale, caps it at the safe bounds, and clamps the requested centre offset. It never crops architectural content to enlarge it. Absent presentation metadata returns the exact Phase 6B.6 transform. All five existing demo/custom longhouse PNGs retain their old transforms and overview behavior.

The same geometry feeds `RasterArtworkVisual`, appearance thumbnails, SVG/PNG exports and the optional development footprint diagnostic. The registry and these pure presentation functions do not modify documents, hit regions, collision checks, entrances, generation or saved data. No sizing values are written to JSON, IndexedDB, history or snapshots. Rotations remain about the original logical footprint centre. Raster shadows remain disabled.

## Detail behavior and exports

The three pilots opt into compact, colour-matched roof/yard symbols when a tile occupies **less than 16 CSS pixels** (below 50% for a 32-pixel tile), or Reduced visual detail is selected. At 11% Fit and 44% this removes illegible texture; at 83%, 100% and 150% the actual PNG is shown. The overview preserves approximate silhouette and colours without reproducing micro-details. It stays within the same safe alpha-fitted rectangle and has no separate shadow. Very small footprints still cannot show detailed architecture at Fit; zoom to 83% or higher to inspect the original artwork.

Only a boolean detail flag changes at the zoom threshold, preserving building memoisation during camera movement. Static vector paths use the existing parsed-path cache; PNGs still decode once per installed source. No runtime image processing occurs during pan/pinch. Selection, locks, warnings and proposal colours stay in their original editor layers. Development/expansion preview rendering receives the same detail flag without changing proposal generation.

Standard **1024/2048/4096 PNG** exports keep the original selected PNG at its new safe transform, independent of camera zoom. The existing **Reduced visual detail in PNG** option emits the same lightweight symbols as the distant editor. SVG export rendering shares the same fitting and paths. Appearance thumbnails deliberately show the actual image for choosing artwork. Planning mode is unchanged.

## Compare and test on a physical iPhone

1. Reload without clearing Safari website data; verify **6B.7** and the installation commit in the footer. Duplicate Ravenfjord and open the duplicate. Switch to Illustrated.
2. Select a cottage → Properties → Appearance → **Viking Cottage – Sheet 4** → Apply. Repeat with **Viking Tavern – Sheet 4** and **Viking Farmstead – Sheet 4** on the matching building kinds. Existing longhouse appearances must remain unchanged. If needed, manually place a farm on the duplicate first.
3. Tap Fit (about 11% on a 96×96 map), then pinch to the displayed 44%, 83%, 100% and 150%. Fit/44% show clean roof/yard symbols; closer zoom shows the original PNG. Expect modest footprint-safe PNG enlargement, not the rejected 20–55% overhang.
4. In Select mode, tap the centre and each edge of the logical footprint; tap just outside to clear selection. Check all rotations and resize to both wider and narrower footprints. Roof proportions must remain stable and neighbours/roads unobscured. Undo temporary geometry edits.
5. Test appearance Reset → Undo/Redo and Lock/Unlock. One-finger selection/editing and two-finger pan/pinch should remain distinct. Scroll Properties in portrait and landscape; no clipped or overlapped actions should appear.
6. Wait for Saved, close/reopen Safari, and verify the same asset IDs and geometry. Create/restore a named restore point as desired. Export/import JSON as a separate project.
7. Export complete Illustrated PNGs at 1024 and 2048 (4096 if memory permits). Inspect the original artwork, scale, transparency, rotation and full map bounds in Files. Export once with Reduced visual detail checked to compare overview symbols. Switch to Planning and check familiar symbols and editing.
8. On a 75–100-building map, pan/pinch in both styles. Use Reduced visual detail if needed. Physical Safari memory, keyboard and downloads still require device verification; browser emulation alone cannot certify them.

## Before/after evidence

All paired screenshots use the same 35-building Viking river fixture (96×96, Contextual, seed 1847), the same selected asset IDs, and the same camera coordinates and logical rectangles. Cottage, Tavern and Farm were required during fixture generation so the comparison contains all three; no generator code or saved user project was changed. Portrait screenshots are 390×844 CSS pixels at DPR 2. These are production-build Chromium touch-emulation results; they do not certify physical Safari.

| View | Before 6B.6 | After 6B.7 |
| --- | --- | --- |
| Fit, displayed 11% | [Before](screenshots/phase6b7/before-fit.png) | [After](screenshots/phase6b7/after-fit.png) |
| Cottage, 44% | [Before](screenshots/phase6b7/before-cottage-44.png) | [After](screenshots/phase6b7/after-cottage-44.png) |
| Tavern, 44% | [Before](screenshots/phase6b7/before-tavern-44.png) | [After](screenshots/phase6b7/after-tavern-44.png) |
| Farmstead, 44% | [Before](screenshots/phase6b7/before-farm-44.png) | [After](screenshots/phase6b7/after-farm-44.png) |

Original PNG close views at 100%: [Cottage](screenshots/phase6b7/after-cottage-100.png), [Tavern](screenshots/phase6b7/after-tavern-100.png), [Farmstead](screenshots/phase6b7/after-farm-100.png).

Production touch checks covered all three at Fit/44/83/100/150%, with no separate raster shadows. Across all 15 paired views the logical rectangles, camera scales and asset IDs were identical; only visual presentation changed. Overview symbols appeared at Fit/44%, and decoded PNGs at 83/100/150%.

Further touch checks at 100% verified centre and four edge hit tests, four outside points, real edge selection and outside clearing. Subpixel edge tests at Fit are not reliable because hit canvases round to screen pixels; the hit geometry was not expanded to compensate. Rotated/resized source pixels remain inside logical bounds in the automated transform matrix. Actual touch selection, all four rotations, numeric move/resize, appearance Reset/Undo/Redo, and locks passed for all three. Properties was checked for horizontal overflow at 375×667, 390×844 and 844×390.

After undoing temporary edits, the complete saved document equalled its starting value. JSON download/import preserved all fields in a separate project. Browser close/reopen preserved the accepted appearance IDs, and Planning rendered without raster images or overview symbols. Standard full-map PNG downloads passed at 1024/2048/4096, plus a reduced-detail 2048 export; original images and overview symbols are tested separately. No browser page errors occurred.

## Performance sample

On a real expanded **100-building, 192×192** fixture with **37 manually chosen pilot images**, production Chromium touch emulation (390×844, DPR 3) measured:

| Style / zoom | Median frame interval | p95 | Worst |
| --- | --- | --- | --- |
| Planning / Fit | 16.7 ms | 16.8 ms | 33.4 ms |
| Illustrated / Fit | 16.7 ms | 16.7 ms | 33.3 ms |
| Planning / 44% | 16.7 ms | 50.0 ms | 50.1 ms |
| Illustrated / 44% | 16.7 ms | 50.1 ms | 66.8 ms |

The source document was unchanged after pan/pinch and style changes. These short desktop-emulation samples show intermittent slower frames at closer zoom, and are not a physical-iPhone performance guarantee. [100-building overview](screenshots/phase6b7/performance-100-fit.png). The existing Reduced visual detail option remains available. The production entry remains large because the existing bundled PNG pipeline inlines images (about 6.13 MB / 4.20 MB gzip); no new PNG assets or dependencies were added.

## Automated checks

**264 tests across 25 files passed**, including 14 new presentation tests. They cover chosen scales, all rotations and extreme resizes, offset/safe-bound containment, malformed metadata and unsafe overview rejection, exact legacy longhouse transforms, 11/44/83/100/150% detail thresholds, shared thumbnail/export geometry, actual PNG embedding and reduced-detail SVG, Planning equivalence and unchanged JSON. The prior pilot test now checks all four safe footprint edges instead of requiring the old inset that this phase intentionally reduces. Existing source PNG SHA-256, generator, infrastructure, terrain, district/development/expansion, autosave, project isolation, snapshot and appearance-history tests pass.

Production build, release verification and the optional alpha-manifest audit passed. Source PNGs and `rasterBounds.ts` remain unchanged. No new dependencies, generated assets, project schema fields or gameplay changes were introduced.

A separate 100% zoom sample on the same 100-building map exercised full PNG artwork: median **16.7 ms** in both modes; Planning p95 **33.4 ms**, worst **50.0 ms**; Illustrated p95/worst **50.0 ms**. The saved document remained identical. This adds close-zoom coverage without changing terrain rendering or the existing performance controls.
