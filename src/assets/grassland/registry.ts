import manifest from './manifest.json';
import integrity from './integrity.json';
export type GrasslandMode='off'|'restrained'|'accents';
export type GrasslandKind='base'|'flower'|'scrub'|'rocky'|'marsh';
export interface GrasslandAsset {id:string;name:string;file:string;kind:GrasslandKind;width:896;height:896;sha256:string;crop:{x:number;y:number;size:number}}
const expected:Readonly<Record<string,{kind:GrasslandKind;file:string}>>={
 'hearthlands.terrain.grassland.base.01':{kind:'base',file:'hearthlands-grassland-base-meadow-01.webp'},
 'hearthlands.terrain.grassland.flower.01':{kind:'flower',file:'hearthlands-grassland-wildflower-01.webp'},
 'hearthlands.terrain.grassland.flower.02':{kind:'flower',file:'hearthlands-grassland-wildflower-02.webp'},
 'hearthlands.terrain.grassland.scrub.01':{kind:'scrub',file:'hearthlands-grassland-scrubby-01.webp'},
 'hearthlands.terrain.grassland.rocky.01':{kind:'rocky',file:'hearthlands-grassland-rocky-01.webp'},
 'hearthlands.terrain.grassland.marsh.01':{kind:'marsh',file:'hearthlands-grassland-marsh-01.webp'},
};
/** Closed installed manifest. Neither documents nor UI can supply arbitrary paths. */
export function validateGrasslandManifest(input:unknown):GrasslandAsset[]{
 const m=input as typeof manifest,seen=new Set<string>();
 if(!m||m.pack_id!=='hearthlands-grassland-6c2-lite'||m.release_target!=='6C.2'||!Array.isArray(m.assets)||m.assets.length!==6)throw new Error('Invalid installed grassland pack.');
 return m.assets.map(a=>{
  const e=expected[a.id],sha256=integrity[a.id as keyof typeof integrity];
  if(!e||seen.has(a.id)||a.file!==`assets/${e.file}`||a.type!==e.kind||a.format!=='image/webp'||a.image_dimensions?.length!==2||a.image_dimensions.some(v=>v!==896)||typeof a.name!=='string'||!a.name.trim()||!/^[a-f0-9]{64}$/.test(sha256))throw new Error('Unsafe or inconsistent grassland asset.');
  seen.add(a.id);
  // The opaque marsh source contains painted pools. This audited dry crop has
  // reeds/flowers only; decorative artwork must not invent navigable water.
  return {id:a.id,name:a.name,file:a.file,kind:e.kind,width:896,height:896,sha256,crop:e.kind==='marsh'?{x:340,y:360,size:240}:{x:0,y:0,size:896}};
 });
}
export const grasslandAssets=validateGrasslandManifest(manifest);
export const grasslandAssetsById=new Map(grasslandAssets.map(a=>[a.id,a]));
export const normalizeGrasslandMode=(v:unknown):GrasslandMode=>v==='restrained'||v==='accents'?v:'off';
