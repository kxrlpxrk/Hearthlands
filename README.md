# Hearthlands

A browser-only Viking settlement design studio built with Vite, React, TypeScript, react-konva, Zustand and Dexie.

## Develop

```sh
npm install
npm run dev
npm run build
npm test
```

Open the Vite development server. Choose Pan and drag to move the world, scroll or pinch to zoom, or use the zoom buttons and Fit. Select a building or terrain tile and tap the map to place it. Erase removes content from a tile. Undo/redo supports toolbar buttons and Ctrl/Cmd+Z / Shift+Z. World dimensions can be configured from 8 to 192 tiles per side; shrinking cannot discard placed content.

Save settlement writes to IndexedDB on this device. Export JSON downloads the versioned document. Saving is explicit, not automatic. Mobile Library and Properties open bottom sheets; Explore closes them and activates pan. No credentials or external services are required.

## Architecture

- `src/model`: versioned document types and immutable operations.
- `src/commands`: bounded snapshot command history.
- `src/generator`: deterministic seeded random primitive; no generation yet.
- `src/rendering`: Konva canvas, viewport and mouse/touch interactions.
- `src/ui`: responsive shell and Zustand state.
- `src/persistence`: Dexie document storage.
- `src/exports`: JSON download.

Roads, districts and layers have document types for future tools. Road/district editing, procedural generation, selection and JSON import remain future work. The initial document is an empty 96×96 map.

## GitHub Pages deployment

In the GitHub repository, open **Settings > Pages > Build and deployment > Source** and select **GitHub Actions**. Push the project, including `.github/workflows/deploy-pages.yml` and `package-lock.json`, to `main`.

The workflow uses Node.js 24, installs locked dependencies with `npm ci`, runs `npm test`, builds the application, and uploads `dist`. A separate deployment job runs only after the entire build job succeeds, so failed tests or builds prevent deployment. You can also run the workflow manually from the Actions tab (select `main`; Pages environment branch restrictions may reject other branches).

Vite uses `/Hearthlands/` as its base path for this repository. Local development is served under that same path. The npm cache is explicitly redirected to the runner's temporary directory in CI because `.npmrc` configures a workspace cache for this cloud development environment.

After enabling Pages and pushing to `main`, check **Actions > Deploy GitHub Pages**. Wait for both jobs to succeed, then open the URL reported by the deployment's `github-pages` environment and verify the studio loads, assets load, and pan/zoom work. Configuration alone does not mean the site is published; no deployment or public URL has been verified yet.
