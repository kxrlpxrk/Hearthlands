# Phase 4B: landscape editing

The Terrain tool uses the existing studio and local project system. Single-finger painting is a temporary patch until release; a safe stroke becomes one undo command. Two fingers cancel the current uncommitted stroke and pan/pinch instead. Desktop Escape or the active **Cancel stroke** button also cancels without saving. Use Undo for a stroke that has already finished. **Pan terrain camera / Resume terrain** explicitly switches one-finger navigation. Conflicting strokes remain explicitly unsaved previews until cancelled or applied to unaffected cells. Project switches, renames, generation replacement and restores are blocked while a terrain review is unresolved.

## Landscape rules

Document version **3** adds `landscape: { version: 1, cells, contours, detail }`. Each sparse landscape cell stores integer coordinates, elevation, ground material, vegetation coverage, water coverage and rocky-detail coverage. Legacy `terrain` records are retained unchanged: grass is dry meadow, forest has dense vegetation, water has full water coverage, and stone has rocky ground and impassable rocky details. Unedited cells resolve through those original records. Loading v1/v2 documents lazily adds an empty landscape layer; old database rows and snapshots need no destructive rewrite. Saving/JSON export writes the complete v3 document. Imports validate both legacy terrain and the new layer, including finite values, bounds, duplicate coordinates and supported versions.

Elevation is in **metres**, bounded from **−16 to 32 m**; a grid tile has no prescribed horizontal real-world scale. Raise/lower changes height by up to 4 × strength m per stroke, and ridge/valley by 8 × strength m. Circular brushes have soft edges; square brushes have uniform coverage. Overlapping dabs use the greatest weight per cell within one stroke, so holding still or receiving more pointer events does not repeatedly raise the same cell. Repeat a stroke to build more height. Smooth averages the original 3×3 neighbourhood rather than feeding partially smoothed cells back into itself. Square + 100% Flatten produces an exact pad.

Ground (grass, dirt, sand, rock, cultivated soil), vegetation, water and elevation are independent. Ground materials are categorical, so their strength control is disabled; size and shape still apply. Coverage brushes and sculpting use strength. Clearing woodland removes vegetation, not ground or water; removing rocks clears rocky details. **Restore original terrain** removes landscape changes back to the generated/legacy terrain. **Reset to meadow** resets all landscape layers to level, dry, clear grass. These tools never delete structures.

Shared terrain queries define navigation and building rules. Water coverage ≥0.5, vegetation ≥0.6 and rocks ≥0.6 block ordinary paths/buildings. Ground rock by itself is walkable; legacy stone retains impassable rocks. A cardinal elevation difference above 2 m indicates a cliff and blocks walking; building sites require differences and footprint height variation ≤1 m. A bridge needs accessible banks, one continuous water span, and bank elevations within 2 m. Painting water is explicit coverage editing: it does not simulate flow, erosion, sea levels or automatic inundation. Forest coverage under water stays stored but is not an accessible woodland resource.

Terrain changes never move, resize or delete objects. A cached safety index covers footprints, entrance approaches, full-width infrastructure (including its visible curves) and a conservative one-cell margin for slopes/banks. Height changes around structures, changes that block usable ground and any landscape change near locked objects are held for review. Bridge water and bank changes receive additional protection. Affected cells and objects appear red, with a named list in **Review affected structures**. **Apply unaffected cells** keeps every protected cell unchanged; **Cancel terrain preview** discards the whole stroke. The protection margin may exclude more cells than strictly necessary; use a smaller brush farther from a structure rather than expecting an override for locks or invalid banks.

## Exact iPhone acceptance steps

Use Safari with this repository's deployed app. Browser storage is device/browser-specific; export a JSON backup before testing.

1. Tap **Projects**, find Ravenfjord, tap **Duplicate**, then **Open** on *Ravenfjord copy*. Under **Restore points**, name a point *Before landscape* and tap **Create restore point**. Close the project screen.
2. Tap bottom navigation **Terrain → Sculpt**. Set size **11**, strength **100%**, shape **Circular**, then **Raise terrain**. Drag a short stroke on clear ground away from structures. Lift to commit. If protection appears, cancel and choose another area, or apply unaffected cells. A two-finger pinch while a painting finger is still down must cancel that uncommitted stroke.
3. Reopen **Terrain → Sculpt**. Choose shape **Square**, size **5**, strength **100%**, enter **4** in *Flatten elevation (metres)*, and choose **Flatten terrain**. Tap the hill's centre to make a level 4 m pad. **Sample elevation**, then **Use sampled elevation**, is an alternative for choosing a local height.
4. In **Nature**, use **Clear woodland** and, if necessary, **Remove rocks** on the pad. Open **Library → Buildings**, search for **Watchtower** and place it wholly inside the pad. Use Select/Properties to confirm there is no terrain warning.
5. In **Terrain → Water**, choose **Draw water**, Circular size **15**, strength **100%**. Paint across a riverbank near a bridge. Release and inspect the red cells, highlighted infrastructure and named conflicts. First tap **Cancel terrain preview** to verify nothing changes. Repeat and tap **Apply unaffected cells**. The river widens around the protected banks/span; the bridge remains in place and usable.
6. With **Draw water**, Circular size **7**, paint a short curved stroke in unoccupied land outside the village to form a small lake. **Reclaim land** narrows or removes water. Use 100% for a complete change at the brush centre; softer edges remain partial coverage.
7. In **Nature**, use **Paint forest**, Circular size **7**, along the outskirts. Use **Clear woodland**, Square size **5**, for a clearing. Clearing does not level steep ground or remove rocks; use Flatten/Remove rocks where necessary before placing buildings.
8. In **Ground**, choose **Cultivated soil**, Square size **5**, and paint open land beside a farmhouse/cottage. Ground painting preserves heights, water and vegetation, so clear woodland first if trees hide the field.
9. Tap **Undo** and **Redo** several times. Verify each completed stroke is one step. Wait for **Saved on this device**, close/reopen Safari and open the copy from Projects. Verify the hill, pad/watchtower, river, lake, forest clearing and field remain. The original Ravenfjord should be unchanged. Optionally restore *Before landscape* after confirming the warning; an automatic backup of your edited terrain will be made.
10. Tap **Export → Download project JSON** for a portable project backup. For an image, choose **2048 px**, enable **Show elevation contours in PNG** and **Show terrain detail in PNG**, then **Prepare PNG → Download PNG**. Find it in Safari Downloads/Files; if Safari opens the image, use **Share → Save to Files**. The export covers the full map irrespective of camera position. Importing that JSON creates a separate project.

**Elevation contours** and **Terrain detail** toggles are in the Terrain panel. Turn detail off for a clean planning appearance; shading/cliff indicators remain functional. PNG offers its own contour/detail/grid/label switches. The same vector scene produces interactive terrain and full-map exports, including deterministic material variation, forest crowns, soil furrows, coverage-based banks, contour lines and cliffs.

## Checks and performance

Run `npm test` and `npm run build`. Focused model, migration, safety, persistence, export and benchmark checks are in `src/model/terrain.test.ts`; run them with `npx vitest run src/model/terrain.test.ts`.

The benchmark uses 96×96 and 192×192 maps with 35 buildings, a 9-tile brush and 100 incremental samples. Observed development-machine runs after caching/batching changes measured the following ranges (including a slower run under load):

| Map | Dab p50 | Dab p95 | Stroke and review | Full scene construction |
| --- | ---: | ---: | ---: | ---: |
| 96×96 | 0.02–0.03 ms | 0.12–0.22 ms | 4.8–7.4 ms | 44–110 ms |
| 192×192 | 0.03–0.05 ms | 0.11–0.41 ms | 5.3–12.9 ms | 150–1411 ms |

These are model/vector-construction timings, not physical iPhone frame-rate claims. Full scene construction happens on committed terrain/view changes, not each pointer move. Live brush patches use a separate canvas layer; map grid geometry stays stable while painting. Detailed 192×192 commits and high-resolution PNG preparation can still pause on slower devices; clean planning and 1024/2048 px exports reduce work. No artificial passing performance threshold is imposed in tests.

Browser validation uses Chromium with a 390×844 touch viewport and real browser close/reopen; physical iPhone/Safari remains unverified. Existing build bundle-size warnings remain a limitation. No hydrology simulation, terrain-driven relocation, district editing, settlement expansion or backend is included.

Validation performed for this phase:

- Complete 127-test suite and production build, including all existing generator/realism stress tests.
- 390×844 Chromium touch acceptance on a duplicate of a v2 Ravenfjord village: migration, hill, exact flattened watchtower pad and placement, pinch cancellation, bridge-protected river widening (cancel and unaffected-cell approval), lake stroke, forest/clearing, cultivated ground, undo/redo, isolated autosave, complete JSON/2048 px PNG, and a full browser close/reopen without regeneration.
- Production bundle: edited v3 JSON import, touch painting, negative flattening and elevation sampling, named snapshot restoration with automatic backup, exact terrain/object JSON comparison and PNG pixel checks for water, forest and cultivated soil.
- Existing desktop 20-building editor workflow and production touch bridge construction/export regression checks.

These browser results are touch emulation on the development machine, not a claim that physical Safari has been tested.
