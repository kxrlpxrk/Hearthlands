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
- `src/generator`: deterministic seeded random primitive; no generation yet.
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

Roads, districts and layers have document types for future tools. Road/district editing, procedural generation, selection and JSON import remain future work. The initial document is an empty 96×96 map.

## GitHub Pages deployment

In the GitHub repository, open **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**. Push the project, including `.github/workflows/deploy-pages.yml` and `package-lock.json`, to `main`.

The workflow uses Node.js 24, installs locked dependencies with `npm ci`, runs `npm test`, builds the application, and uploads `dist`. A separate deployment job runs only after the entire build job succeeds, so failed tests or builds prevent deployment. You can also run the workflow manually from the Actions tab (select `main`; Pages environment branch restrictions may reject other branches).

Vite uses `/Hearthlands/` as its base path for this repository. Local development is served under that same path.

After enabling Pages and pushing to `main`, check **Actions > Deploy GitHub Pages**. Wait for both jobs to succeed, then open the URL reported by the deployment's `github-pages` environment and verify the studio loads, assets load, and pan/zoom work. Configuration alone does not mean the site is published; no deployment or public URL has been verified yet.
