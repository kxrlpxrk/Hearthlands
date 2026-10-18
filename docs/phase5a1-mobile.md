# Phase 5A.1: Mobile sheets and release visibility

## Fixed layout

A single shared action host now moves the existing controls between the map and the open editing sheet. The portal host stays the same DOM node, so moving it does not reset replacement approval, errors or operation state. Library and Properties sheets both support inline actions. Opening a sheet removes action controls from the map; closing it returns active operations to a compact, scrollable map strip. Cancel and primary approval buttons lead the strip. Passive district Select mode has no action box. Polygon/paint operations, terrain conflict review, infrastructure drafts and development previews keep their required controls.

The selected district summary is at the top of Districts, with **Develop district immediately after its heading**. Choosing or re-choosing a district scrolls that summary into view. Locked districts retain the button with a visible/accessibly associated explanation. Development settings follow the button. While an operation is active, reopening a sheet prioritises its inline review controls instead of scrolling past them.

Sheets scroll independently of the canvas, including in short landscape viewports. The layout uses Safari safe-area insets, dynamic/visual viewport height and keyboard-aware field scrolling. Inputs/selects use 16 px text to avoid iPhone focus zoom. The bottom navigation fits all seven tools without horizontal page scrolling. Notifications occupy a layout row rather than floating over zoom or forms; nonessential notices are hidden while a sheet is open. Green/gold styling is retained. These are layout/navigation changes; generator, terrain, document model and persistence algorithms are unchanged.

## Release and stale-page investigation

The previous Phase 5A source and its successful Pages workflow contained Develop district. Its old placement below creation controls and the district list, compounded by the floating toolbar, could hide it on a phone. There is no application service-worker cache. A particular Safari tab/CDN response cannot be diagnosed remotely from source alone: direct requests to `kxrlpxrk.github.io` from this environment fail with **Tunnel connection failed: 403 Forbidden**, so stale live assets have not been asserted as the confirmed cause.

The footer now exposes an accessible **5A.1 · commit** build indicator. GitHub Actions builds embed the actual seven-character `GITHUB_SHA`; local previews say `local`. The same build marker appears in HTML metadata and `/Hearthlands/release.json`. Vite still uses content-hashed assets and the existing repository base path. **npm run verify:release** checks matching HTML/release metadata, the deployment commit when available, and Phase 5A development controls in the actual production entry bundle. Pages runs this check after tests/build and before artifact upload/deployment.

After deployment, reload Safari and check the footer marker. If an older tab still shows no marker or an older release, open:

`https://kxrlpxrk.github.io/Hearthlands/?release=5A.1`

This requests a fresh document URL on the same origin and preserves IndexedDB projects. Do **not** clear Safari website data to fix an old release: that can delete locally saved projects. Export a JSON backup before troubleshooting device storage. The marker identifies the loaded code; `release.json` identifies the published artifact when network access permits checking it.

## Production touch verification

Actual built assets were served through Vite preview, with touch emulation at **375 × 667, 390 × 844, 667 × 375 and 844 × 390**. Checks covered:

- Selecting/reselecting Market quarter exposes Develop beneath its heading without test-forced scrolling; locked districts expose the disabled button and explanation.
- Independent library scrolling, no passive Districts action box, no floating action host behind an open sheet, and no document/panel horizontal overflow.
- Fill configuration, worker preview, inline and map approval/cancel placement, and cancellation without persisted changes.
- Real polygon taps/handles with pan/pinch, boundary review/cancel, water-edit conflict review/cancel and road draft Finish/Cancel controls in the sheet.
- Replacement approval remains checked while moving between sheet/map and rotating. Cancelling preserves the complete document.
- A keyboard-sized visual viewport keeps the focused field visible. Rename/autosave/reload, project duplication, JSON import/export and a complete 2048 px PNG download still work.
- Acceptance from the inline development review creates an automatic restore point and one undoable saved change.

`npm test`: **169 tests across 13 files pass**, including action-routing and active/passive district-control coverage. `npm run build` and `npm run verify:release` pass. The existing Vite bundle-size warning remains. Chromium touch/viewport simulation does not verify the physical iPhone Safari keyboard, notch or browser chrome; use the device steps below.

## Screenshots from the production preview

The build indicator says `local` in these captures because they were taken before the commit was deployed. GitHub Actions substitutes the deployment commit.

[375 × 667 selected district](screenshots/phase5a1/district-375x667.png) · [390 × 844 selected district](screenshots/phase5a1/district-390x844.png) · [667 × 375 landscape](screenshots/phase5a1/district-667x375.png) · [844 × 390 landscape](screenshots/phase5a1/district-844x390.png)

[Development settings](screenshots/phase5a1/development-settings-390x844.png) · [Inline development review](screenshots/phase5a1/development-review-390x844.png) · [Boundary review](screenshots/phase5a1/district-boundary-375x667.png) · [Terrain conflict confirmation](screenshots/phase5a1/terrain-conflict-375x667.png) · [Road controls in landscape](screenshots/phase5a1/roads-844x390.png)

## Physical iPhone steps

1. Reload the deployed application and check **5A.1 · [commit]** in the footer. Keep a JSON backup and open a duplicate settlement. Do not delete website data.
2. Open **Districts**, swipe through the full menu, and select **Market quarter**. Its heading and Develop button should appear together, with no floating “Districts · select” box. Select a different district, then select Market again; reselect it after scrolling too.
3. Lock a district and confirm Develop remains visible, disabled, with the unlock explanation. Unlock only if you intend to develop it; object locks remain independent.
4. Open Develop, choose Fill, set count/types/density, and generate a preview. Close/open the sheet using its close button or Library/Explore navigation. Confirm/Cancel should move between inline review and the compact map strip. Cancel and verify no change. For a replacement preview, check approval, open/close the sheet and rotate; approval must remain checked until you cancel or apply.
5. Draw/reshape a district at a comfortable zoom, pan/pinch, then open Districts. Preview/Confirm/Cancel must be reachable inside the sheet. Cancel to preserve the test map.
6. Paint water across a building/bridge to trigger terrain protection; open Terrain and inspect Apply unaffected cells/Cancel. Cancel. Draw a road draft, reopen Roads and inspect Finish/Back/Cancel; cancel it.
7. Focus a district-name or numeric field, open the keyboard, rotate, and expand/collapse Safari's bars. The sheet should scroll while the map stays still. Fields and buttons must remain reachable; dismissing the keyboard must restore the layout.
8. Rename a district, wait for Saved, reopen the browser, duplicate/open a project, and test JSON and full-map PNG downloads. Confirm existing settlement content is preserved.
