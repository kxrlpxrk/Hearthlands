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

Save settlement writes to IndexedDB on this device. Export JSON downloads the versioned document. Saving is explicit, not automatic. Mobile Library and Properties open bottom sheets; Explore closes them and activates pan. No credentials or external services are required.

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

After enabling Pages and pushing to `main`, check **Actions > Deploy GitHub Pages**. Wait for both jobs to succeed, then open the URL reported by the deployment's `github-pages` environment and verify the studio loads, assets load, and pan/zoom work. Configuration alone does not mean the site is published; no deployment or public URL has been verified yet.

## Phase 2: settlement generation

Choose **New** in the top toolbar. The mobile-friendly dialog creates an independent draft with a map preview. Choose Viking Fishing Village or Medieval Farming Village, forest/plains/river/coastal terrain, Organic/Planned/Contextual layout, a numeric seed, 24–192 tiles per side, and 20–60 buildings. Expand **Required buildings** to set catalogue quantities. Required buildings are placed first; supporting structures fill the remaining target. Switching presets resets required quantities to that preset's defaults. Incompatible resource demands, excessive quotas and insufficient capacity produce explicit errors rather than partial applied settlements.

**Generate complete settlement** runs all steps. Alternatively use **1. Terrain**, **2. Buildings**, and **3. Roads** in order; each updates the draft preview. Terrain discards draft buildings and paths, buildings discards draft paths, and changing settings discards the draft. Generation runs in a worker so the interface remains responsive. The same settings give identical terrain, placements, IDs and paths, including through the staged workflow.

Applying any draft requires the replacement checkbox and **Replace current project with draft**. No automatic save occurs. The current session can undo replacement; saving afterward intentionally replaces the existing local saved project. Canceling or failed generation leaves the current project and saved copy unchanged. Save or export work you want to keep before confirming replacement.

The generator uses coherent woodland, meandering rivers/coastlines and an open settlement clearing. It develops one connected land area, places waterfront structures within three tiles of water, sawmills within three tiles of woodland, and other footprints on open grass. Buildings keep at least one tile of spacing. Layout rules score central civic/housing placement, resource access, regular alignment or organic variation. Roads connect the south-facing entrance marker of each world footprint to the same accessible land network without crossing buildings, forests or water. Waterfront catalogue structures are placed on usable banks; automatic bridges across water and development across multiple banks are outside this phase.

Generated buildings use the existing v2 document and all Phase 1 editing tools, locks, history, IndexedDB saves and JSON export. No document schema or database migration is required for Phase 2. Roads remain document data and render below buildings. Manually moving a generated building does not reroute its existing path; advanced regeneration and manual road editing remain future work.

Generator modules are independent of React and rendering: `settings.ts` validates inputs, `terrain.ts` constructs terrain, `buildings.ts` places footprints, and `navigation.ts` connects entrances. `generate.ts` composes the pure steps; `generator.worker.ts` provides the UI adapter. Tests cover determinism, quotas, target limits, all environments/layouts, spacing, terrain restrictions, entrance connectivity, failure cases, legacy document compatibility and editor/history preservation.
