import type {GrasslandMode} from '../assets/grassland/registry';
export type GroundDetail='flat'|'subtle'|'rich';
export interface GroundOptions {groundDetail?:GroundDetail;ground63?:boolean;grassland?:GrasslandMode}
export function normalizeGroundDetail(v:unknown):GroundDetail|undefined{return v==='flat'||v==='subtle'||v==='rich'?v:undefined;}
/** Missing enum preserves pre-6C.3.1 preferences, including the older meadow pilot. */
export function groundMode(o:GroundOptions):GroundDetail|'legacy'{return normalizeGroundDetail(o.groundDetail)??(o.ground63?'rich':'legacy');}
export function groundUsesImages(o:GroundOptions){const mode=groundMode(o);return mode==='rich'||mode==='legacy'&&!!o.grassland&&o.grassland!=='off';}
export function subtleOpacity(pixelsPerTile:number){const t=Math.max(0,Math.min(1,(pixelsPerTile-4)/8));return t*t*(3-2*t);}
