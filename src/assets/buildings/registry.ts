import {rasterBounds} from './rasterBounds';
import {safeImageReference,bundledImageInfo} from './images';
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
export const demoImageAssets:readonly BuildingAsset[]=['timber','turf'].map((material,i)=>({
 id:`demo.viking.longhouse.${material}`,kind:'longhouse',name:`Demo ${material==='timber'?'timber cross-wing':'turf-roof'} longhouse`,theme:'viking',variation:'Bundled transparent PNG · manual only',
 artwork:{format:'bundled-image',source:`buildings/demo-viking-${material}-longhouse.png`,visibleBounds:rasterBounds[`demo-viking-${material}-longhouse.png`],mime:'image/png',pixelWidth:1024,pixelHeight:512,fallback:assets.find(a=>a.id===`starter.viking.longhouse.${i===0?2:1}`)!.artwork as import('./types').VectorArtwork},
 thumbnail:{view:'artwork',background:'#263a30'},footprint:{nominal:[4,2],aspectRange:[1.6,2.4],fit:'adapt-or-contain'},canonicalOrientation:0,automatic:false,
}));
export const customImageAssets:readonly BuildingAsset[]=[{
 id:'hearthlands.viking.longhouse.01',kind:'longhouse',name:'Ravenfjord Timber Longhouse',theme:'viking',variation:'Custom timber roof · manual only',
 artwork:{format:'bundled-image',source:'buildings/hearthlands-viking-longhouse-01.png',visibleBounds:rasterBounds['hearthlands-viking-longhouse-01.png'],mime:'image/png',pixelWidth:1024,pixelHeight:512,fallback:assets.find(a=>a.id==='starter.viking.longhouse.2')!.artwork as import('./types').VectorArtwork},
 thumbnail:{view:'artwork',background:'#263a30'},footprint:{nominal:[4,2],aspectRange:[1.6,2.4],fit:'adapt-or-contain'},canonicalOrientation:0,automatic:false,
},...([['02','Ravenfjord Painted Timber Hall','Painted timber roof'],['03','Ravenfjord Mossy Timber Hall','Mossy timber roof']] as const).map(([number,name,variation]):BuildingAsset=>({
 id:`hearthlands.viking.longhouse.${number}`,kind:'longhouse',name,theme:'viking',variation:`${variation} · manual only`,
 artwork:{format:'bundled-image',source:`buildings/hearthlands-viking-longhouse-${number}.png`,visibleBounds:rasterBounds[`hearthlands-viking-longhouse-${number}.png`],mime:'image/png',pixelWidth:1024,pixelHeight:512,fallback:assets.find(a=>a.id==='starter.viking.longhouse.2')!.artwork as import('./types').VectorArtwork},
 thumbnail:{view:'artwork',background:'#263a30'},footprint:{nominal:[4,2],aspectRange:[1.6,2.4],fit:'adapt-or-contain'},canonicalOrientation:0,automatic:false,
}))];
/** Sheet-extracted visual pilot: deliberately excluded from every automatic pool. */
const sheet4Definitions:readonly {kind:BuildingKind;name:string;nominal:[number,number];pixels:[number,number]}[]=[
 {kind:'cottage',name:'Viking Cottage – Sheet 4',nominal:[2,2],pixels:[768,768]},
 {kind:'tavern',name:'Viking Tavern – Sheet 4',nominal:[3,2],pixels:[1024,768]},
 {kind:'farm',name:'Viking Farmstead – Sheet 4',nominal:[4,3],pixels:[1024,768]},
];
export const sheet4PilotAssets:readonly BuildingAsset[]=sheet4Definitions.map(({kind,name,nominal,pixels}):BuildingAsset=>({
 id:`hearthlands.sheet4.${kind}.01`,kind,name,theme:'viking',variation:'Sheet-extracted PNG pilot · manual only',
 artwork:{format:'bundled-image',source:`buildings/hearthlands-sheet4-${kind}-01.png`,visibleBounds:rasterBounds[`hearthlands-sheet4-${kind}-01.png`],mime:'image/png',pixelWidth:pixels[0],pixelHeight:pixels[1],fallback:assets.find(a=>a.id===`starter.viking.${kind}.1`)!.artwork as import('./types').VectorArtwork},
 thumbnail:{view:'artwork',background:'#263a30'},footprint:{nominal,aspectRange:[nominal[0]/nominal[1]*.4,nominal[0]/nominal[1]*2.5],fit:'adapt-or-contain'},canonicalOrientation:0,automatic:false,
}));
export const buildingAssets:readonly BuildingAsset[]=[...starterPack.assets,...demoImageAssets,...customImageAssets,...sheet4PilotAssets];
export const assetById=new Map(buildingAssets.map(a=>[a.id,a]));
const byKind=new Map(catalogue.map(b=>[b.kind,buildingAssets.filter(a=>a.kind===b.kind)]));
export const assetsForKind=(kind:BuildingKind):readonly BuildingAsset[]=>byKind.get(kind)??[];
export function validateAssetRegistry(entries:readonly BuildingAsset[]=buildingAssets):string[]{
 const errors:string[]=[],ids=new Set<string>();for(const a of entries){
  if(!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(a.id)||ids.has(a.id))errors.push(`Invalid or duplicate asset ID: ${a.id}`);ids.add(a.id);
  if(!catalogue.some(b=>b.kind===a.kind)||!Object.hasOwn(architectureThemes,a.theme)||!a.name||!a.variation||a.canonicalOrientation!==0||typeof a.automatic!=='boolean')errors.push(`Invalid asset metadata: ${a.id}`);
  const art=a.artwork,vector=art.format==='bundled-image'?art.fallback:art,installed=art.format==='bundled-image'?bundledImageInfo(art.source):undefined;
  if(art.format==='bundled-image'&&(!safeImageReference(art.source)||!installed||installed.width!==art.pixelWidth||installed.height!==art.pixelHeight||art.mime!=='image/png'||![art.pixelWidth,art.pixelHeight].every(n=>Number.isInteger(n)&&n>=32&&n<=4096)||art.pixelWidth*art.pixelHeight>8_388_608))errors.push(`Invalid bundled image: ${a.id}`);
  if(art.format==='bundled-image'&&art.visibleBounds!==undefined){const b=art.visibleBounds;if(!b||![b.x,b.y,b.width,b.height].every(Number.isInteger)||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>art.pixelWidth||b.y+b.height>art.pixelHeight)errors.push(`Invalid image bounds: ${a.id}`);}
  if(!vector||vector.format!=='vector'||!Array.isArray(vector.viewBox)||vector.viewBox.length!==4||vector.viewBox.some(n=>!Number.isFinite(n))||vector.viewBox[2]<=0||vector.viewBox[3]<=0||!Array.isArray(vector.paths)||!vector.paths.length){errors.push(`Invalid vector artwork: ${a.id}`);continue;}
  for(const p of vector.paths)if(!/^[Mm]/.test(p.data)||/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]/.test(p.data)||!p.data.length||!/^#[0-9a-f]{6}$|^none$/i.test(p.fill)||p.stroke&&!/^#[0-9a-f]{6}$/i.test(p.stroke)||!['mass','structure','detail'].includes(p.level)||p.width!==undefined&&(!Number.isFinite(p.width)||p.width<=0))errors.push(`Invalid path: ${a.id}`);
  const [min,max]=a.footprint.aspectRange;if(a.footprint.nominal.some(n=>!Number.isFinite(n)||n<=0)||!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<min||a.footprint.fit!=='adapt-or-contain'||a.thumbnail.view!=='artwork')errors.push(`Invalid footprint mapping: ${a.id}`);
 }
 return errors;
}
