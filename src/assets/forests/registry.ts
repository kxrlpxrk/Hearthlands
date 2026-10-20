import manifest from './manifest.json';
import bounds from './bounds.json';
import type {ForestSpecies} from '../../rendering/forestArt';
export interface ForestImageAsset {
 id:string;name:string;file:string;species:ForestSpecies|'mixed';role:'single'|'cluster'|'edge';
 pixelWidth:number;pixelHeight:number;anchor:readonly[number,number];diameter:number;
 alpha:{x:number;y:number;width:number;height:number};sha256:string;
}
export function validateForestManifest(input:unknown):ForestImageAsset[]{
 const m=input as typeof manifest;
 if(!m||m.packId!=='hearthlands.viking.forest-pilot.6c1b'||m.version!=='1.0-pilot'||!Array.isArray(m.assets)||m.assets.length!==6)throw new Error('Invalid installed forest pilot manifest.');
 const seen=new Set<string>();return m.assets.map(a=>{
  const alpha=bounds[a.id as keyof typeof bounds];
  if(!/^hearthlands\.viking\.tree\.[a-z0-9-]+$/.test(a.id)||seen.has(a.id)||!/^assets\/hearthlands-tree-[a-z0-9-]+\.png$/.test(a.file)||!['beech','birch','oak','pine','mixed'].includes(a.species)||!['single','cluster','edge'].includes(a.role)||a.automaticEnabled!==false||a.manualApproved!==false||!a.name||!alpha||!a.anchorNormalized||a.anchorNormalized.length!==2||a.anchorNormalized.some(v=>!Number.isFinite(v)||v<0||v>1)||![a.pixelWidth,a.pixelHeight].every(v=>Number.isInteger(v)&&v>=32&&v<=2048)||!Number.isFinite(a.suggestedDiameterTiles)||a.suggestedDiameterTiles<=0||a.suggestedDiameterTiles>4||!/^[a-f0-9]{64}$/.test(a.sha256)||alpha.x<0||alpha.y<0||alpha.x+alpha.width>a.pixelWidth||alpha.y+alpha.height>a.pixelHeight)throw new Error('Unsafe or unsupported installed forest asset.');
  seen.add(a.id);return {id:a.id,name:a.name,file:a.file,species:a.species as ForestImageAsset['species'],role:a.role as ForestImageAsset['role'],pixelWidth:a.pixelWidth,pixelHeight:a.pixelHeight,anchor:a.anchorNormalized as [number,number],diameter:a.suggestedDiameterTiles,alpha,sha256:a.sha256};
 });
}
/** These assets are admitted only by explicit pilot opt-in, never default art pools. */
export const forestImageAssets=validateForestManifest(manifest);
export const forestImageById=new Map(forestImageAssets.map(a=>[a.id,a]));
