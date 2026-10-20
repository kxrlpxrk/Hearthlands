# Hearthlands

A browser-only Viking settlement design studio built with Vite, React, TypeScript, react-konva, Zustand and Dexie.

## Develop

```sh
npm install
npm run dev
npm run build
npm test
```

Open the Vite development server. Choose Pan and drag to move the world, scroll or pinch to zoom, or use the zoom buttons and Fit. Search the grouped building library or select a terrain tile, then tap the map to place it. Buildings use catalogue footprints and original top-down plan symbols. Erase removes content from a tile. Undo/redo supports toolbar buttons and Ctrl/Cmd+Z / Shift+Z. World dimensions can be configured from 8 to 192 tiles per side; shrinking cannot discard placed content.

Edits autosave to IndexedDB on this device; Save settlement flushes pending changes immediately. Export downloads a versioned project document or a complete PNG map. Mobile Library and Properties open bottom sheets; Explore closes them and activates pan. No credentials or external services are required.

## Architecture

- `src/model`: versioned document types and immutable operations.
- `src/commands`: bounded snapshot command history.
- `src/generator`: deterministic terrain, building and road generation with a worker adapter.
- `src/rendering`: Konva canvas, viewport and mouse/touch interactions.
- `src/ui`: responsive shell and Zustand state.
- `src/persistence`: Dexie document storage.
- `src/exports`: JSON download.

## Building editing

Choose **Select** (also available in the mobile bottom navigation), tap a building, and drag it to move. Camera dragging is reserved for **Pan / Explore**; two-finger pinch zoom works in either mode and never moves a building. Use **Properties** to edit the selected building on mobile.

The building inspector supports rename, numeric X/Y position, width/height, quarter-turn rotation, duplicate, delete, and lock/unlock. Commit numeric/name edits with Enter or by leaving the field. Width/height describe the building's local axes; rotating swaps its world footprint around its top-left anchor. Grid snapping rounds placement and movement to tiles; turn it off for fractional positions. Locks block moves, transforms, rename, eraser and deletion until unlocked. Duplicating a locked building creates an unlocked copy.

Overlapping footprints and footprints outside the map display warnings, including during drag. They remain editable so you can resolve them. An already occupied exact origin is not placed twice. Shrinking the map cannot clip an existing footprint. Each completed placement, drag, resize, rotation, or deletion is one history command. **Delete / Backspace** removes the selected unlocked building; **Escape**, a blank-map tap in Select mode, or **Clear selection** clears selection. Keyboard editing shortcuts leave text/number inputs alone.

Document schema v2 stores building identity, kind, name, local dimensions, rotation, lock state, and position. Saved v1 documents migrate without moving or enlarging their original one-tile buildings. IndexedDB save and JSON export include all editable building data.

### Manual acceptance check

Place a 20-building village using the catalogue, switch to Select, drag buildings, edit dimensions and rotate, then undo/redo each operation. Lock one building and try dragging, deleting and erasing it. Try overlapping another footprint and moving one beyond the map edge to check warnings. On a touch viewport, repeat selection, dragging and inspector edits, then pinch to zoom and confirm the building stays in place. Save and reload to confirm the edits persist.

Roads, districts and layers have document types for future tools. Manual road/district editing, advanced regeneration and JSON import remain future work. The initial document is an empty 96×96 map.

## GitHub Pages deployment

In the GitHub repository, open **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**. Push the project, including `.github/workflows/deploy-pages.yml` and `package-lock.json`, to `main`.

The workflow uses Node.js 24, installs locked dependencies with `npm ci`, runs `npm test`, builds the application, and uploads `dist`. A separate deployment job runs only after the entire build job succeeds, so failed tests or builds prevent deployment. You can also run the workflow manually from the Actions tab (select `main`; Pages environment branch restrictions may reject other branches).

Vite uses `/Hearthlands/` as its base path for this repository. Local development is served under that same path.

After enabling Pages and pushing to `main`, check **Actions > Deploy GitHub Pages**. Wait for both jobs to succeed, then open the URL reported by the deployment's `github-pages` environment and verify the studio loads, assets load, and pan/zoom work. Configuration alone does not mean the site is published; check the Actions run for the commit being deployed before assuming that version is published.

## Phase 2: settlement generation

Choose **New** in the top toolbar. The mobile-friendly dialog creates an independent draft with a map preview. Choose Viking Fishing Village or Medieval Farming Village, forest/plains/river/coastal terrain, Organic/Planned/Contextual layout, a numeric seed, 24–192 tiles per side, and 20–60 buildings. Expand **Required buildings** to set catalogue quantities. Required buildings are placed first; supporting structures fill the remaining target. Switching presets resets required quantities to that preset's defaults. Incompatible resource demands, excessive quotas and insufficient capacity produce explicit errors rather than partial applied settlements.

**Generate complete settlement** runs all steps. Alternatively use **1. Terrain**, **2. Buildings**, and **3. Roads** in order; each updates the draft preview. Terrain discards draft buildings and paths, buildings discards draft paths, and changing settings discards the draft. Generation runs in a worker so the interface remains responsive. The same settings give identical terrain, placements, IDs and paths, including through the staged workflow.

A generated draft defaults to **Create project from draft**, preserving the current project separately. Replacing the current project remains an explicit destination choice with confirmation and an automatic restore point; autosave persists the committed result. Previewing or canceling generation never changes a saved project.

The generator uses coherent woodland, meandering rivers/coastlines and an open settlement clearing. It develops one connected land area, places waterfront structures within three tiles of water, sawmills within three tiles of woodland, and other footprints on open grass. Buildings keep at least one tile of spacing. Layout rules score central civic/housing placement, resource access, regular alignment or organic variation. Roads connect the south-facing entrance marker of each world footprint to the same accessible land network without crossing buildings, forests or water. Waterfront catalogue structures are placed on usable banks; automatic bridges across water and development across multiple banks are outside this phase.

Generated buildings use the existing v2 document and all Phase 1 editing tools, locks, history, IndexedDB saves and JSON export. No document schema or database migration is required for Phase 2. Roads remain document data and render below buildings. Manually moving a generated building does not reroute its existing path; advanced regeneration and manual road editing remain future work.

Generator modules are independent of React and rendering: `settings.ts` validates inputs, `terrain.ts` constructs terrain, `buildings.ts` places footprints, and `navigation.ts` connects entrances. `generate.ts` composes the pure steps; `generator.worker.ts` provides the UI adapter. Tests cover determinism, quotas, target limits, all environments/layouts, spacing, terrain restrictions, entrance connectivity, failure cases, legacy document compatibility and editor/history preservation.

## Phase 2.1: organic settlement realism

New drafts begin with a landscape-aware settlement plan: gathering ground, 2–4 neighbourhood anchors where space permits, waterfront working ground, homesteads, resource workshops and reserved expansion space. Medieval plans also reserve farmland. Seeded weighted supporting choices replace the repeated catalogue sequence. Required quotas stay mandatory; optional choices adapt to constrained shorelines rather than exhausting the entire generation run.

Organic and Contextual layouts vary household pockets, quarter-turn orientation and spacing. Primary routes connect the plan before buildings are placed; secondary tracks serve important destinations and smaller access paths reach every building entrance. Planned retains regular alignment and straight routing. Coherent multi-scale noise makes woodland edges, clearings, river/coast variation and occasional rocky ground without the old circular patches or rectangular resource grove.

Logical roads remain the existing connected `points` arrays. Optional `kind` and `style` fields add hierarchy. Rendering simplifies and rounds only where the full stroke clears terrain and footprints, pins junctions, and never mutates navigation data. Existing roads without these fields keep their original visual treatment. Optional `planning` metadata has its own `version: 1` inside the existing v2 document; saves, exports and v1/v2 loading remain compatible. Planning reservations guide initial generation, not later manual editing; saved geometry does not regenerate on reopen.

See [the original/improved reference maps and reproduction instructions](docs/generation-comparison.md). Automated checks include the 1847 reference map, full-stroke visual clearance, junction preservation, legacy roads, and a 32-case matrix covering four seeds, four environments, both presets and 20/35/60-building targets. Manual checks use Chromium desktop and touch emulation; physical iPhone testing remains a user-side check.

## Phase 3: projects, autosave, restore points and files

**Projects** opens the responsive local project library. Create a blank project, rename, open, duplicate or delete a settlement there. Each project has its own identity and document; duplicate/import operations create new identities while preserving building IDs and geometry. Deletion explicitly confirms removal of that project's restore points. The last open project is remembered. The previous single `hearthlands-local` save is migrated into the library automatically, retaining its ID and original document. Data stays in the same `hearthlands` IndexedDB database; no account or backend is used.

Edits autosave after about 650 ms. The footer shows **Saving**, **Saved on this device**, or a visible storage error with **Retry save** and **Export backup**. Writes are serialized and checked against the revision originally loaded, with an additional project-identity guard. A late write cannot overwrite a newer revision or another project. Switching, duplicating, taking a snapshot and generating a new project flush pending edits first; write failures block the transition rather than discard the current document. On a conflict with another tab, export your current edits and reload to read the other writer's latest saved document.

The app attempts a flush when hidden or leaving and warns about pending changes where the browser supports it. Wait for **Saved** before closing Safari. No browser can guarantee completion if iOS forcibly terminates a tab during a pending write. Clearing browser/site data or using private browsing can remove local projects; keep JSON backups for work you want to retain.

Under **Projects → Restore points**, create named snapshots of the active project, browse them, and confirm restoration. Restoration saves the current state as an automatic backup in the same transaction before restoring exact document geometry. The generator now defaults to **New separate project**. Preview generation never autosaves over the current document. Explicit replacement remains available with confirmation, an automatic restore point and editor undo/redo.

**Export → Download project JSON** exports the complete current v2 document, including in-memory edits, building IDs, terrain, roads, layers, districts and planning metadata. **Import JSON as a new project** validates v1/v2 files up to 20 MB, checks types, IDs/references and complexity, and creates a separate project. Import never writes over the file's existing ID. V1 geometry migrates to its original one-tile footprints. Unsupported versions, corrupt data and unsafe input display errors without changing any project. Restore-point history is local library data and is not bundled into a document JSON file.

**Export → Complete map PNG** prepares the full map at 1024, 2048 or 4096 pixels on its longest edge, independently of camera pan/zoom, with grid and building-name options. It uses visible document layers and the existing terrain, building and road geometry, without external images or fonts. Rectangular maps retain their aspect ratio; objects outside map bounds are clipped. Select **Prepare PNG**, then tap the download link after preparation. On iPhone use Safari Downloads / Files; if the image opens instead, use **Share → Save to Files**. A smaller resolution can recover from image-memory/encoding failures. Temporary download URLs remain available long enough for delayed mobile downloads.

Project switching/restoring starts a fresh editor undo history; autosaving ordinary edits does not clear undo/redo. Named restore points persist across browser restarts. Snapshot browsing loads lightweight summaries instead of retaining every full document in the dashboard.

### Storage/export implementation and validation

- `src/persistence/database.ts`: additive Dexie v2 upgrade, project metadata, revision-checked document transactions, restore points and active-project preference.
- `src/persistence/autosave.ts`: debounced serialized writes, coalescing, retries and save states.
- `src/persistence/session.ts`: safe project transitions and subscription ownership.
- `src/model/validation.ts`, `src/exports/json.ts`: bounded v1/v2 import validation and lossless document serialization.
- `src/exports/png.ts`: full-map SVG scene and browser PNG encoding, with bounded image dimensions and failure cleanup.
- `src/ui/ProjectLibrary.tsx`, `ExportPanel.tsx`: mobile project/snapshot/file screens.

Tests use `fake-indexeddb` only as a development dependency to exercise real Dexie transactions and upgrades. Browser checks cover two generated Viking settlements, isolated autosaves across a full browser close/reopen, confirmed restore with backup, JSON round trips, corrupt-file rejection, duplicate/delete, quota and concurrent-writer errors, camera-independent PNG output, 4096px dimensions and encoding-failure retry. Mobile checks use Chromium touch emulation; physical iPhone/Safari validation remains a user-side check.

One additional production-preview test—downloading a blob immediately after restarting the system Chromium persistent profile—aborted the test browser. The same failure reproduced on a plain HTTP page with all Hearthlands scripts blocked. Production generation, project/snapshot operations, imports, initial JSON/PNG downloads and post-restart project identity/building counts passed; the full development-browser workflow also passed. This is a remaining browser-test-runtime limitation, not a verified Safari outcome. Confirm the download/reopen flow on your physical iPhone before relying on it as your only backup route.

## Phase 4A: roads, bridges and defenses

Open **Roads** in the toolbar or phone navigation. Choose a material and width, then **Draw on map**. Tap successive corners or drag to trace a path; **Finish path** commits the whole drawing as one undoable edit. **Back a point** and **Cancel path** affect only the preview. Roads offer dirt, gravel, cobblestone and timber surfaces, with smooth curves or straight sections. Drawing previews are not autosaved until finished.

Use **Select / reshape** to select a path and drag its handles. On a crowded generated network, zoom in for more handles or use the existing-path list. The selected point also has numeric coordinates in the Roads panel. **Add control point** inserts a point in the tapped segment. **Delete segment** cuts only the tapped span, retaining both remaining sections as separate objects; **Delete point** removes a selected interior/control point while retaining a valid path. The panel also supports material/width/name changes, locks and whole-path deletion. Locked infrastructure rejects movement, segment cuts and deletion. Undo/redo includes all committed infrastructure edits.

Road endpoints snap to existing path segments within 0.8 tile. Choose **Wooden bridge** or **Stone bridge**, then tap two banks and finish. Bridges support arbitrary orientation and length, require accessible land at both ends and one continuous water crossing, and never paint or remove water. Connect approach roads to the bridge endpoints with the road tool. Invalid crossings, impassable ground, building intersections, unsafe widths and map boundaries are reported; rejected edits leave the document unchanged. Clear an obstructed bank with existing terrain tools if appropriate before drawing a bridge.

Palisades, stone walls, fences and defensive gates use the same independent path objects and controls. Draw corners, split sections, and place a gate across a wall opening; gate endpoints snap to nearby defense segments. Make openings with **Delete segment** rather than expecting gate placement to erase a wall automatically. Defenses may pass through woodland/rock but cannot cross water or buildings.

On touchscreens, single-finger gestures draw or reshape in the active infrastructure mode. **Pan camera / Resume infrastructure** explicitly switches one-finger camera movement; an unfinished path survives that switch. Two fingers pan/pinch in either mode and cancel the current uncommitted pointer gesture without adding points. The map action strip and phone Roads bottom sheet keep editing controls available without keyboard shortcuts. Escape cancels the active drawing/selection; Delete removes the selected unlocked path.

Select a moved building and open **Properties → Optional road connection** when its entrance no longer touches a path. Preview a new access spur and explicitly approve it, or dismiss it. Existing roads, including locked paths, are never rewritten. A blocked route is reported rather than forced through water, buildings or defenses. This assistance is local entrance repair, not a settlement-wide traffic/navigation simulation.

### Data and verification

`Road` retains its original points, layer and generator metadata. Optional infrastructure fields (`editVersion: 1`, `surface`, `width`, `locked`, `name`) extend document version 2 without rewriting old roads or changing project identity. Older v1/v2 documents continue to migrate/import as before. Paths, bridges and defenses all live in `document.roads`, so existing autosave, snapshots, project isolation and JSON round trips retain complete editable objects. Shared vector geometry/styles feed the interactive canvas and viewport-independent PNG export. Visual rounding never replaces stored control/navigation points and falls back to straight segments near obstacles.

The focused infrastructure suite covers point edits, connections, bridge banks/water, defensive materials, full-width obstacle checks, locks, segment splitting, history, legacy roads, JSON validation, IndexedDB reopening/snapshot restoration and edits to the seed-1847 35-building river village. Browser checks use desktop and Chromium phone touch emulation; verify physical Safari interactions/downloads on an iPhone before treating that device as your only backup route.

## Phase 4B: terrain and landscape editor

Open **Terrain** from the toolbar or phone navigation for Sculpt, Water, Ground and Nature tools. Elevation, ground, vegetation and water are independent document layers. Strokes support circular/square brushes, adjustable size/strength, sampled elevation, undo/redo, cancel and two-finger camera gestures. Unsafe changes pause for a named structure preview; apply only unaffected cells or cancel. Existing structures are never relocated or deleted by terrain tools.

Document v3 lazily migrates older projects and snapshots without rewriting legacy terrain meanings. Generation, navigation, building warnings, bridge/road validation and exports use shared terrain queries. Canvas and PNG share deterministic terrain geometry, contours, shading, cliffs and optional detail. See [landscape rules, exact iPhone steps, tests and benchmarks](docs/phase4b-terrain.md).

### District designer (Phase 4C)

Open **Districts** for deterministic detection previews, polygon/cell editing, membership statistics and overlays. Confirm/cancel changes explicitly; locked and hidden areas retain their cells. Districts remain compatible with v1/v2/v3 project files, autosave, restore points and JSON. PNG exports have independent district overlay/name options. See [district controls, data rules and iPhone verification](docs/phase4c-districts.md).

### Selective district development (Phase 5A)

Select a district and choose **Develop district** for fill-only growth, explicitly selected replacements or proposed access connections. Every proposal is previewed separately; acceptance creates a restore point and one undo command. Existing objects are protected regardless of IDs/provenance. See [development rules, limitations and physical-iPhone acceptance](docs/phase5a-development.md).

### Mobile layout and loaded release (Phase 5A.1)

Editing actions move inside the open mobile sheet; passive district selection has no floating toolbar. The selected district heading and **Develop district** stay together. Check the footer build marker when troubleshooting old Safari tabs. See [screenshots, release checks and iPhone verification](docs/phase5a1-mobile.md). Deployment also runs `npm run verify:release` to check the actual production bundle and commit marker.

Phase 5B adds protected, preview-first settlement growth and optional east/south map enlargement. See [expansion controls, limits, screenshots and physical-iPhone verification](docs/phase5b-expansion.md).

Phase 6A adds Planning / Illustrated styles, shared visual layers, zoom-aware terrain rendering and style-selectable PNG exports without editing settlement documents. See [visual architecture, screenshots, performance and iPhone checks](docs/phase6a-visual-engine.md).

Phase 6B adds a versioned building asset registry, themed automatic variations, manual appearance thumbnails and matching Illustrated exports. See [starter artwork, manifest architecture, validation and physical-iPhone steps](docs/phase6b-building-assets.md).

Bundled PNG artwork installation and iPhone checks: [Phase 6B.5](docs/phase6b5-image-assets.md).

Illustrated canopy rendering, export parity, screenshots, performance and iPhone checks: [Phase 6C.1A](docs/phase6c1a-forests.md).

Optional supplied Viking tree PNGs, enablement, screenshots and iPhone playtest: [Phase 6C.1B](docs/phase6c1b-forest-pilot.md).
