# Phase 6C.3 — Illustrated ground and natural vegetation

**Opt-in, visual only.** Properties → **Illustrated Ground 6C.3 · comparison** enables the countryside surface. Existing browsers default to Off. Off restores the user's previous 6C.2.1 grassland choice exactly, including its original patches. The previous grassland selector is retained and disabled while the new treatment is active. PNG has an independent checkbox, initially matching the browser preference.

No settlement schema, terrain types, generators, source images, asset IDs or project data change. The twenty Phase 6C.1C canopy PNGs, their positions, palette and renderer are untouched. Building assets, hitboxes, entrances, roads and infrastructure are untouched. Planning ignores the new option entirely.

## Composition

`illustratedGround.ts` builds a pure, deterministic world-space regional field. It uses the existing seeded noise, shared landscape queries and conservative grassland clearance field. Half-tile nodes contain coverage, RGB, wilderness strength, five contextual material weights and coordinate warps. Premultiplied bilinear interpolation (preventing dark matte edges at empty nodes) joins these values across the whole eligible countryside; there is no circular patch placement in this mode.

Three spatial scales (23, 7 and 2.7 tiles) produce broad green/golden regions, intermediate vegetation variation and finer ground variation. Fine world-anchored grain and small grass strokes add texture. Strokes are baked into the surface once, rather than processed during every camera redraw. None of these fields consume or modify generator state.

Existing building footprints and entrances, full road widths, bridge/defense geometry, planned communal grounds, fields, cultivated soil, water and woodland remain protected. Positive field nodes require more than 0.8 tiles of conservative clearance. Half-tile interpolation reaches at most √0.5 tiles from a node, retaining a safety margin. Extra fading is confined to already eligible ground; it cannot blur artwork across protected boundaries. Fine strokes require 1.5 tiles of clearance. Hidden and locked structures receive the same protection.

The wilderness field depends on distance from existing footprints: village interiors are calmer, while open country carries more vegetation. The ground remains beneath existing woodland, terrain relief, water, districts, roads, buildings and selection overlays. Forest-edge scrub is on adjacent eligible land only; no canopy is changed or placed over water.

## Installed textures and blending

All six original WebPs retain their bytes and stable registry IDs. They are used as **material samples**, not free-standing image stamps:

- Base meadow supplies restrained open-country texture.
- Both wildflower designs occupy occasional seeded flowering regions, with a separate regional variety field.
- Scrub favours rough country and eligible woodland fringes.
- Rocky detail requires elevated or rocky grassland; existing rock terrain artwork is not replaced.
- Marsh requires low, dry land near actual water. The previously audited dry marsh crop is retained, so decorative painted pools are not introduced.

The files are not seamless. Two differently oriented, offset, warped projections sample each material. A projection's contribution smoothly reaches zero before it wraps across a source border; the offset projection supplies the missing contribution. Regional weights and restrained opacity help suppress repeating motifs. Original source colours are sampled without recolouring, desaturation, shadows or dark overlays; the bright artwork is blended with a quiet green/golden procedural substrate. This does not convert the source files into genuinely seamless tiles, and very close inspection can still reveal familiar source details.

## Caches, zoom and export

The editor first prepares one overview surface at at most 16 pixels/tile and 2048 pixels per edge. Preparation yields between short row slices, with one build job active at a time. Six shared 512² RGBA sampling buffers are derived once from the already decoded approved images; source PNG/WebP files remain unchanged.

At close zoom, after 180 ms without camera movement, up to nine nearby 16×16-tile regions are prepared at 48 pixels/tile. A three-tile prefetch margin helps subsequent small pans. The regions sharpen the **same** material field and stroke geometry; no seed, habitat or composition is reassigned. They replace corresponding overview regions rather than stacking translucent images, avoiding double alpha and halos. Detail caches contain no encoded PNG strings. The renderer uses one non-listening Konva Shape, not a node per blade or tile. Reduced detail skips the close-region requests. Ordinary pan/pinch redraws cached images; it does not reconstruct the complete surface.

Close regions can sharpen shortly after a gesture stops. This is a resolution change, not an appearance switch; the overview remains visible while they prepare. Extremely close views and high-DPR screens can still exceed the bounded cache resolution.

PNG preparation uses output pixel density, never the editor viewport. The same regional field, material sampling, clearance, colours and baked strokes produce the exported surface. PNG ground surfaces are capped at 32 pixels/tile / 3072 pixels per edge, within the existing 1024/2048/4096 export bounds. A 4096 PNG therefore keeps a complete map while interpolating a bounded ground surface; buildings, canopy assets and other layers retain their existing export paths. Embedded PNG data makes SVG composition self-contained. An unprepared ground SVG fails explicitly in strict export mode. Preparation/allocation failures leave project data unchanged and recommend a smaller image or disabling the comparison.

Two overview/export surfaces and nine close regions are retained at most. Overview RGBA is at most 16 MiB; each close region is at most 2.25 MiB (20.25 MiB total); an export ground image is at most 36 MiB. Six sampling buffers add 6 MiB. A 192² regional field is about 6.8 MiB, with at most two retained plans. Encoded overview/export strings, temporary image buffers, existing meadow/forest/building caches, GPU copies and the final PNG canvas add to these figures. Older phones should start with 1024/2048 exports.

## Comparisons and verification

The reference is [Ravenfjord seed 1847](screenshots/phase6c1b1/reference.json), Viking / River / Contextual / 96² / 35 buildings, with its existing forest-heavy outskirts and all twenty approved canopy designs (2,241 sprites). Close cameras use world focus (60.455487, 38.053365). Off uses the previous restrained 6C.2.1 grassland setting.

| Zoom | Off | On |
| --- | --- | --- |
| Fit | [Off](screenshots/phase6c3/before-fit.jpg) | [On](screenshots/phase6c3/after-fit.jpg) |
| 40% | [Off](screenshots/phase6c3/before-40.jpg) | [On](screenshots/phase6c3/after-40.jpg) |
| 50% | [Off](screenshots/phase6c3/before-50.jpg) | [On](screenshots/phase6c3/after-50.jpg) |
| 80% | [Off](screenshots/phase6c3/before-80.jpg) | [On](screenshots/phase6c3/after-80.jpg) |
| 150% | [Off](screenshots/phase6c3/before-150.jpg) | [On](screenshots/phase6c3/after-150.jpg) |

These are Chromium touch-emulation captures, not photographs from a physical iPhone. Existing source motifs cannot provide unique botanical artwork for every part of an unlimited landscape. The new treatment favours continuous, restrained countryside over a dense flower carpet. Deliberate protected clearings remain quiet, and the old terrain's technical edges around water, fields and village infrastructure are preserved for later phases.

## Physical iPhone checklist

1. Reload Safari and check footer **6C.3** plus the published commit. Do not clear website data; that contains saved projects. Duplicate Ravenfjord and download a JSON backup.
2. Select Illustrated, open Properties, and retain **Forest artwork → Canopy variety · 20 designs · 6C.1C**. Set the old grassland pilot to **On · restrained accents**, leaving the new **Illustrated Ground 6C.3** checkbox Off. Close with Explore, press Fit and take a baseline screenshot.
3. Enable the new checkbox. Wait for **Continuous illustrated ground ready**, return to Explore and compare the same camera at Fit, 40%, 50%, 80% and 150%. Look for connected green/golden variation rather than isolated meadow stamps. Pause briefly at close zoom for sharper regional caches.
4. Check woodland fringes, flowering country, raised rocky grass and dry land beside water. No flowers should cover roads, buildings, bridge banks, cultivated fields or water. Forest crowns, golden foliage and all building appearances must retain their identities and positions.
5. Pan and pinch repeatedly, including immediately after enabling and on a 75–100-building map. Nothing should reshuffle or switch to unrelated symbols. Record phone model/iOS, preparation delays, stalls or Safari reloads; cloud results do not certify physical-device frame rates.
6. Select a building at its original centre/edges. Move, rotate, resize, lock/unlock and undo/redo. Test a cancelled terrain stroke and two-finger navigation in Terrain. No decorative layer should intercept touch or commit a brush accidentally.
7. Wait for Saved, close/reopen Safari and confirm the opt-in preference and existing project data. Export/import JSON as a separate project; restore a named snapshot. The browser-wide visual option is intentionally absent from settlement JSON and snapshots.
8. In Export choose Illustrated, the approved forest pack and **Illustrated Ground 6C.3 in PNG**. Download 1024 and 2048, then 4096 if memory allows. Inspect full bounds, ground regions, forest/building artwork, roads, grid/labels/district options. Export again after changing only camera zoom; the same resolution/options must produce the same map.
9. Disable the new comparison and verify the previous 6C.2.1 ground returns exactly. Switch to Planning and confirm its technical renderer and editing remain unchanged.

## Measured performance

Unthrottled Chromium touch emulation, 390×844 / DPR 3, 120 frames sampled during a 40-move touch pan. Close surfaces were allowed to prepare before the steady-state sample. These are cloud measurements, not physical Safari certification.

| Map / buildings | Fit p95 Off → On | 80% p95 Off → On | Cold overview preparation |
| --- | --- | --- | --- |
| 96² / 35 | 16.8 → 16.7 ms | 50.1 → 50.1 ms | 0.94 s |
| 128² / 75 | 33.3 → 33.4 ms | 50.0 → 50.0 ms | 2.27 s |
| 192² / 100 | 33.4 → 33.4 ms | 50.1 → 66.6 ms | 2.40 s |

Medians were 16.7 ms. The final 100-building On sample reached 66.7 ms as its worst close frame; On adds visible tail cost on that scene. Cold regional preparation can temporarily cost more, and close detail resolves after the gesture stops. A first implementation that stroked fine grass during pan measured larger tail delays; strokes are now baked once, sampling is bilinear, and image draws are cropped to the visible world. The comparison remains opt-in.

## Check results

The full suite passes **360 tests in 32 files**. Production TypeScript/Vite build and release verification pass; the existing large-chunk warning remains. Added coverage checks opt-in persistence and project/history isolation, exact Off/Planning restoration, deterministic fields after JSON/duplication, protected-cell clearance, contextual use of all six IDs, connected coverage, premultiplied edge colour, source-border blending, bounded caches, SVG embedding and allocation failures.

Production touch checks cover 375×667, 390×844 and 844×390 layouts, selection/rotation/locks/history, actual browser-profile close/reopen, separate-project JSON import, PNG downloads at all three sizes and a 100-building 192² export. [Recorded results](screenshots/phase6c3/verification.json) contain exact zooms, region-cache counts and frame samples. Pixel comparisons confirm that Off reproduces 6C.2.1 restrained output exactly, and forest, water and building-footprint interiors remain unchanged in 2048 PNGs.

Side-by-side comparisons: [Fit](screenshots/phase6c3/comparison-fit.jpg), [40%](screenshots/phase6c3/comparison-40.jpg), [50%](screenshots/phase6c3/comparison-50.jpg), [80%](screenshots/phase6c3/comparison-80.jpg), [150%](screenshots/phase6c3/comparison-150.jpg).

Additional production checks pass for cancelled terrain strokes, one-stroke undo, two-finger navigation without painting, terrain-conflict cancellation, and all six WebPs failing: a clear warning, procedural countryside fallback, healthy canopy rendering, PNG download, no retry loop and unchanged document data.
