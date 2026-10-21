# Phase 6C.2.1 — Grassland clarity and blending

The six original WebPs, all IDs, opt-in settings and every settlement document remain unchanged. This is a presentation update. **Off** still restores the previous Illustrated terrain exactly; Planning is unchanged. The approved twenty-canopy forest registry, artwork, positions and rendering code are untouched.

## What changed

Phase 6C.2 baked a 43%-radius feather into 384² masks, then drew those same detailed patches even when each covered only a handful of screen pixels. The wide translucent perimeter softened the artwork, while the isolated miniatures read as fuzzy yellow-green stamps at Fit.

This version uses:

- A **13%-radius feather** and irregular, elongated outlines within each existing certified circular envelope. The former three-lobed pad shapes are replaced with less repetitive, uneven meadow outlines. More original grass/flower pixels remain opaque, with no square image edges or artificial shadow.
- A **continuous ground-colour field** across eligible open land, independent of individual patch silhouettes. Two seeded, low-frequency noise fields produce six subtle green/golden bands. They supplement the quiet base without repeating source tiles. Source artwork is neither recoloured nor desaturated.
- **Density-aware presentation**. At distant view the field remains and detailed stamps disappear. The same texture placements fade in continuously over 5.5–12 logical pixels per tile. Their positions, habitat choices, radius, rotation and variant never change with zoom. No generic grass icons replace the artwork.
- **Original-source close detail**. Medium views use high-quality, cached 384² masks. Above a projected diameter of 384 physical pixels, an additional pass gradually draws the original 896² WebP through an inset clip. It reaches full contribution at 633.6 pixels. That clip lies entirely inside fully opaque mask pixels, so it cannot produce a doubled translucent edge, rectangle or halo. No larger per-patch bitmap is allocated.

| View with 32 px tiles | Pixels per tile | Texture opacity | Presentation |
| --- | ---: | ---: | --- |
| Fit 11% | 3.52 | 0 | Broad quiet ground variation |
| Fit-like 14% | 4.48 | 0 | Broad quiet ground variation |
| 40% | 12.8 | 1 | Sharper masked original design |
| 50% | 16 | 1 | Sharper masked original design |
| 80% | 25.6 | 1 | Same design; source detail according to physical size |
| 100% | 32 | 1 | Same design; progressively more original-source detail |
| 150% | 48 | 1 | Original-source detail on larger visible patches |

Intermediate zoom uses a smooth cubic opacity curve with zero slope at its endpoints. Original-source detail uses another smooth curve. Neither curve starts a decode, recomputes terrain, reshuffles patches or animates after the gesture stops. The thresholds use rendered tile size rather than zoom percentage, so configurable grids and map sizes behave consistently.

## Geometry and compositing

`grasslandPatches()` retains the exact Phase 6C.2 algorithm and outputs. A frozen seed-1847 Ravenfjord regression checks every field of all seven original proposals. The shared clearance field is now cached for reuse by the patches and background field; its safety values are unchanged.

The colour field uses a two-tile sampling lattice. A positive vertex certifies all four incident tile squares by testing their centres against the conservative clearance field. Every centre must have more than 1.6 tiles of clearance, exceeding the square's diagonal radius. Smooth contours are then interpolated only inside certified cells. The field cannot jump across a narrow road, painted water, a building or a field. It avoids locked and hidden objects too. Existing centres, gathering spaces, cultivated soil, forests, shorelines, entrances, bridges, walls and road widths retain their buffers.

The ground field is under the detailed textures, which remain under forests, water, relief, roads, buildings, districts and interaction overlays. The grassland surface is separated from the existing forest overview cache. Broad colour variation uses a bounded four-pixel-per-tile cache, either inside the base cache at overview or as a separate bitmap at close zoom. The forest cache retains its previous resolution and artwork. At close zoom only the meadow texture batch changes opacity/detail; it does not rebuild trees. All new surfaces are non-listening and cannot change selection or touch hitboxes.

## Export

SVG/PNG use the same field geometry, masks, source clips, anchors and density functions. Export density is **output resolution / longest map dimension**, independent of editor pan, zoom or device pixel ratio. Thus a 1024-pixel export of a 192² map is deliberately a quiet overview; a 2048/4096 image can show the same detailed accents at an appropriate pixel density. Zooming the editor before export does not change the output. Original WebPs are embedded only where original-source detail is needed; masked PNGs and source images are embedded once per used definition, without remote URLs.

The existing 1024/2048/4096 bounds, labels, grid, districts, storage and failure handling remain. If all six images fail, the complete previous renderer is retained. Partial failures omit the missing textures while the healthy images and quiet ground remain usable. No image data is written into project JSON, IndexedDB documents, snapshots or history.

## Comparisons and validation

The reference is the existing [35-building Ravenfjord rendering fixture](screenshots/phase6c1b1/reference.json): Viking / River / Contextual / seed 1847 / 96², with the previously added forest-heavy outskirts. It keeps all twenty canopy designs and 2,241 tree sprites. The seven meadow placements are byte-for-byte equivalent as numeric JSON before and after; only their presentation changes.

The camera is centred on world **(60.455487, 38.053365)** at close zoom. Touch-emulated 390×844 production captures compare Off, the old 6C.2 On rendering, and 6C.2.1 On. The old screenshots retain their old release marker; they were not relabelled as a new build.

| Zoom | Off | 6C.2 On | 6C.2.1 On |
| --- | --- | --- | --- |
| Fit (10.612%) | [Off](screenshots/phase6c21/off-fit.jpg) | [Before](screenshots/phase6c21/before-on-fit.jpg) | [After](screenshots/phase6c21/after-fit.jpg) |
| 40% | [Off](screenshots/phase6c21/off-40.jpg) | [Before](screenshots/phase6c21/before-on-40.jpg) | [After](screenshots/phase6c21/after-40.jpg) |
| 50% | [Off](screenshots/phase6c21/off-50.jpg) | [Before](screenshots/phase6c21/before-on-50.jpg) | [After](screenshots/phase6c21/after-50.jpg) |
| 80% | [Off](screenshots/phase6c21/off-80.jpg) | [Before](screenshots/phase6c21/before-on-80.jpg) | [After](screenshots/phase6c21/after-80.jpg) |
| 100% | [Off](screenshots/phase6c21/off-100.jpg) | [Before](screenshots/phase6c21/before-on-100.jpg) | [After](screenshots/phase6c21/after-100.jpg) |
| 150% | [Off](screenshots/phase6c21/off-150.jpg) | [Before](screenshots/phase6c21/before-on-150.jpg) | [After](screenshots/phase6c21/after-150.jpg) |

Side-by-side comparisons: [Fit](screenshots/phase6c21/comparison-fit.jpg), [50%](screenshots/phase6c21/comparison-50.jpg), [100%](screenshots/phase6c21/comparison-100.jpg). [Recorded browser results](screenshots/phase6c21/verification.json) include zoom presentation, exports and frame samples. Pixel comparisons confirm the 1024 Off export and all-images-failed fallback are identical to the original Off renderer; forest, water and building-footprint interiors in 2048 On exports remain unchanged.

**345 automated tests across 31 files pass.** New coverage checks frozen placements, narrower alpha edges, smooth zoom/source-detail curves, opaque clip safety, colour-field clearance, cache reuse, 96/128/192 maps with 100 protected buildings, unchanged Planning/Off/forest geometry and resolution-driven SVG output. Existing generator, development, expansion, asset, persistence, legacy-import, terrain, infrastructure and district suites remain enabled. Production build and release verification pass; the existing large-bundle Vite warning remains.

Browser checks use Chromium touch emulation, not physical Safari. They exercise all requested zoom levels, selection/rotation/locks/history, project autosave and actual profile reopening, JSON isolation, PNG downloads, panel overflow at 375×667 / 390×844 / 844×390, terrain cancellation/conflict previews and two-finger navigation. Source artwork integrity is checked by the release verifier and the existing read-only audit:

```sh
npm test
npm run build
npm run verify:release
python scripts/audit-grassland.py # Optional Pillow source audit
```

## Performance and limitations

The field initially builds once per immutable terrain/building/road/planning input; camera movement uses cached paths/surfaces. There are at most six field batches and one texture batch, never one React/Konva node per grass cell. The low-frequency field's close-view bitmap avoids repeated full-map path filling. Eighteen 384² masks consume 10.125 MiB RGBA, as before. Six shared originals add at most 18.375 MiB decoded RGBA plus their base64 strings; the extra field bitmap is at most 2.25 MiB on 192² maps, plus its small hit buffer. There are no new image assets or dependencies. Browser/GPU/export allocations add to these counts.

Unthrottled cloud Chromium touch emulation, 390×844 / DPR 3, 120 frames sampled during 40 touch-pan moves, run without competing browser/test jobs:

| Map / buildings | Fit p95 Off → On | 80% p95 Off → On |
| --- | ---: | ---: |
| 96² / 35 | 16.8 → 16.8 ms | 50.0 → 50.1 ms |
| 128² / 75 | 16.8 → 33.3 ms | 33.4 → 33.4 ms |
| 192² / 100 | 16.8 → 33.4 ms | 50.0 → 50.0 ms |

Medians were 16.7 ms. The 100-building On run reached 33.4 ms at Fit and 50.1 ms at 80% as its worst sampled frames. Some Fit tail frames cost more than Off; this is not a guarantee of 60 fps on a physical iPhone. Existing building image objects and forest/grassland drawing functions remained stable while panning. The first uncached-field implementation had slower close-view samples; the final bounded field bitmap removes repeated vector filling.

The supplied textures are still non-seamless and retain recognisable motifs. Close views intentionally show restrained local accents supported by a broader quiet field, rather than a continuous photographic carpet. A very crowded area may have no room for detailed art. Colour variation deliberately stays subtle to preserve settlement readability. Physical iPhone memory pressure and Safari-specific filtering must be checked on-device; use 1024/2048 PNG first on older phones.

## Physical iPhone acceptance

1. Reload Safari and verify footer **6C.2.1** and the published commit. Do not clear website data to refresh; local projects are stored there. Open a duplicate of Ravenfjord and export a JSON backup.
2. Choose **Illustrated**, open **Properties**, retain **Forest artwork → Canopy variety · 20 designs · 6C.1C**, then set **Illustrated grassland pilot → Off**. Close Properties with **Explore**, press Fit and take a baseline screenshot.
3. Set **On · restrained accents**, wait for **All six meadow textures ready**, then return to Explore/Fit. Detailed yellow-green flower stamps must be absent at Fit; subtle connected ground variation should remain. Forest species, colours, positions and buildings must look unchanged.
4. Locate a meadow at 50%. Compare Off/On without moving the camera, then inspect 40%, 80%, 100% and 150%. The patch should retain the same centre, orientation and design, with a narrower irregular edge and clearer grass/flowers. No square boundary, grey halo or black/white rectangle should appear.
5. Pinch slowly through roughly 18–38% and back. Detail should emerge smoothly from the ground field, without switching designs or flickering. Pan while pinching, then release: nothing should keep animating or reshuffling.
6. Inspect paths, entrances, fields, bridge banks, water and forest fringes. No new decoration should cover them. Select a building by its original centre and edges; move, resize, rotate, lock/unlock and undo/redo. The pilot must not alter its hitbox or geometry.
7. In Terrain, use two fingers to pan without painting; cancel a draft stroke, then commit one and undo it. Cancel a destructive terrain-conflict preview. Previously saved structures and terrain should be intact.
8. Wait for **Saved on this device**, close/reopen Safari, and confirm original appearance IDs, the opt-in setting and project data persist. Import an exported JSON as a separate project; restore an existing snapshot if desired. The pilot setting is browser-wide, not settlement JSON.
9. In Export, choose Illustrated, the approved canopy pack and grassland On. Download 1024, 2048 and (if memory permits) 4096 PNGs. Compare complete bounds, source artwork, roads, forests, labels, grid and districts. Export again after changing only the viewport zoom: output at the same settings must be unchanged. A compact 192²/1024 export intentionally uses quiet ground rather than miniature texture stamps.
10. Switch grassland Off and confirm the old terrain returns exactly. Switch to Planning and verify its previous technical appearance. Re-enable on a 75–100-building map and inspect pan/pinch for stalls or Safari reloads. Record phone model and iOS version for any device-specific issue.
