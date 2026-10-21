/** Lazy, base-path-safe Vite URLs. No image bytes load before opt-in. */
import base from './webp/hearthlands-grassland-base-meadow-01.webp?url';
import flowerA from './webp/hearthlands-grassland-wildflower-01.webp?url';
import flowerB from './webp/hearthlands-grassland-wildflower-02.webp?url';
import scrub from './webp/hearthlands-grassland-scrubby-01.webp?url';
import rocky from './webp/hearthlands-grassland-rocky-01.webp?url';
import marsh from './webp/hearthlands-grassland-marsh-01.webp?url';
export const grasslandSources:Readonly<Record<string,string>>={
 'hearthlands.terrain.grassland.base.01':base,
 'hearthlands.terrain.grassland.flower.01':flowerA,
 'hearthlands.terrain.grassland.flower.02':flowerB,
 'hearthlands.terrain.grassland.scrub.01':scrub,
 'hearthlands.terrain.grassland.rocky.01':rocky,
 'hearthlands.terrain.grassland.marsh.01':marsh,
};
