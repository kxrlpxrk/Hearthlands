import {catalogue,type BuildingKind} from '../../model/catalogue';
import {symbolPaths} from '../../rendering/symbols';
import {priorityArtwork,materials} from './artwork';
import {architectureThemes,type BuildingAsset,type BuildingAssetPackManifest,type ArchitectureTheme} from './types';
export const priorityKinds=['longhouse','cottage','blacksmith','tavern','farm','warehouse','watchtower','market'] as const;
const names:Record<string,readonly [string,string]>={longhouse:['Bowed turf hall','Timber hall with side wing'],cottage:['Hipped-roof cottage','L-shaped homestead'],blacksmith:['Open forge yard','Enclosed chimney smithy'],tavern:['Alehouse and barrel yard','Courtyard tavern'],farm:['Long barn and cultivated yard','L-barn with round granary'],warehouse:['Loading shed','Twin store sheds'],watchtower:['Square timber lookout','Octagonal stone lookout'],market:['Market stall rows','Courtyard market']};
const assets:BuildingAsset[]=[];
for(const definition of catalogue)for(const theme of Object.keys(architectureThemes) as ArchitectureTheme[]){
 const priority=priorityKinds.some(k=>k===definition.kind),count=priority?2:1;
 for(let variant=0;variant<count;variant++){
  const name=definition.kind==='longhouse'&&variant===0?({viking:'Bowed turf hall',rural:'Thatched great hall',coastal:'Shingled trade hall'})[theme]:priority?names[definition.kind][variant]:`${definition.name} plan`,paths=priority?priorityArtwork(definition.kind,variant as 0|1,theme):[{data:symbolPaths[definition.symbol],fill:materials[theme].roof,stroke:materials[theme].light,width:2,level:'mass' as const}];
  const ratio=definition.width/definition.height;
  assets.push({id:`starter.${theme}.${definition.kind}.${variant+1}`,kind:definition.kind,name,theme,variation:priority?variant===0?({viking:'Turf / timber',rural:'Thatch / wattle',coastal:'Shingled / trading'})[theme]:'Timber / framed':'Classic fallback',artwork:{format:'vector',viewBox:priority?[0,0,100,100]:[0,0,64,64],paths},thumbnail:{view:'artwork',background:'#263a30'},footprint:{nominal:[definition.width,definition.height],aspectRange:[ratio*.4,ratio*2.5],fit:'adapt-or-contain'},canonicalOrientation:0,automatic:true});
 }
}
export const starterPack:BuildingAssetPackManifest={version:1,id:'hearthlands.starter.v1',name:'Hearthlands overhead starter collection',assets};
export const buildingAssets:readonly BuildingAsset[]=starterPack.assets;
export const assetById=new Map(buildingAssets.map(a=>[a.id,a]));
const byKind=new Map(catalogue.map(b=>[b.kind,buildingAssets.filter(a=>a.kind===b.kind)]));
export const assetsForKind=(kind:BuildingKind):readonly BuildingAsset[]=>byKind.get(kind)??[];
export function validateAssetRegistry(entries:readonly BuildingAsset[]=buildingAssets):string[]{
 const errors:string[]=[],ids=new Set<string>();for(const a of entries){
  if(!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(a.id)||ids.has(a.id))errors.push(`Invalid or duplicate asset ID: ${a.id}`);ids.add(a.id);
  if(!catalogue.some(b=>b.kind===a.kind)||!Object.hasOwn(architectureThemes,a.theme)||!a.name||!a.variation||a.canonicalOrientation!==0||typeof a.automatic!=='boolean')errors.push(`Invalid asset metadata: ${a.id}`);
  if(a.artwork.format!=='vector'||a.artwork.viewBox.length!==4||a.artwork.viewBox.some(n=>!Number.isFinite(n))||a.artwork.viewBox[2]<=0||a.artwork.viewBox[3]<=0||!a.artwork.paths.length)errors.push(`Invalid vector artwork: ${a.id}`);
  for(const p of a.artwork.paths)if(!/^[Mm]/.test(p.data)||/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]/.test(p.data)||!p.data.length||!/^#[0-9a-f]{6}$|^none$/i.test(p.fill)||p.stroke&&!/^#[0-9a-f]{6}$/i.test(p.stroke)||!['mass','structure','detail'].includes(p.level)||p.width!==undefined&&(!Number.isFinite(p.width)||p.width<=0))errors.push(`Invalid path: ${a.id}`);
  const [min,max]=a.footprint.aspectRange;if(a.footprint.nominal.some(n=>!Number.isFinite(n)||n<=0)||!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min||a.footprint.fit!=='adapt-or-contain'||a.thumbnail.view!=='artwork')errors.push(`Invalid footprint mapping: ${a.id}`);
 }
 return errors;
}
