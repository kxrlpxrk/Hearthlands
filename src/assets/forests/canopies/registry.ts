import manifest from './manifest.json';
import type {ForestImageAsset} from '../registry';
import type {ForestSpecies} from '../../../rendering/forestArt';
export interface CanopyAsset extends ForestImageAsset {species:ForestSpecies;role:'single';variation:number;weight:number}
/** Only the twenty approved, locally installed canopy files. No user paths or URLs. */
export function validateCanopyManifest(input:unknown):CanopyAsset[]{
 const m=input as typeof manifest;
 if(!m||m.packId!=='hearthlands.viking.canopies.6c1c'||m.version!==1||m.comparisonOnly!==true||!Array.isArray(m.assets)||m.assets.length!==20||!/^[a-f0-9]{64}$/.test(m.archiveSha256))throw new Error('Invalid installed canopy pack.');
 const seen=new Set<string>(),species=['beech','birch','oak','pine'];
 return m.assets.map(a=>{
  if(!a||!species.includes(a.species)||!Number.isInteger(a.variation)||a.variation<1||a.variation>5||a.id!==`hearthlands.viking.canopy.${a.species}.${String(a.variation).padStart(2,'0')}`||seen.has(a.id)||a.file!==`assets/${a.species}_${String(a.variation).padStart(2,'0')}.png`||typeof a.name!=='string'||!a.name.trim()||![a.pixelWidth,a.pixelHeight].every(v=>Number.isInteger(v)&&v>=32&&v<=2048)||!a.alpha||![a.alpha.x,a.alpha.y,a.alpha.width,a.alpha.height].every(v=>Number.isInteger(v)&&v>=0)||a.alpha.width<1||a.alpha.height<1||a.alpha.x+a.alpha.width>a.pixelWidth||a.alpha.y+a.alpha.height>a.pixelHeight||!Array.isArray(a.anchor)||a.anchor.length!==2||a.anchor.some(v=>!Number.isFinite(v)||v<0||v>1)||!Number.isFinite(a.diameter)||a.diameter<=0||a.diameter>6||!Number.isFinite(a.weight)||a.weight<=0||a.weight>10||!/^[a-f0-9]{64}$/.test(a.sha256))throw new Error('Unsafe or inconsistent canopy asset.');
  seen.add(a.id);return {...a,role:'single',species:a.species as ForestSpecies,anchor:a.anchor as [number,number]};
 });
}
export const forestCanopyAssets=validateCanopyManifest(manifest);
export const canopyVariants=(species:ForestSpecies)=>forestCanopyAssets.filter(a=>a.species===species).sort((a,b)=>a.variation-b.variation);
