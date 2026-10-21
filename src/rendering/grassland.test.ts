import 'fake-indexeddb/auto';
import {afterEach,describe,it,expect,vi} from 'vitest';
import manifest from '../assets/grassland/manifest.json';
import {grasslandAssets,validateGrasslandManifest,normalizeGrasslandMode} from '../assets/grassland/registry';
import {grasslandAlpha,grasslandPatches,grasslandClearance,grasslandMaskEdge} from './grasslandGeometry';
import {approvedGrasslandUrl,createGrasslandImageStore,grasslandImages,maskGrasslandImage} from './grasslandImages';
import {createDocument} from '../model/document';
import {legacyTerrain,terrainQuery} from '../model/terrain';
import {placeBuilding} from '../model/operations';
import {footprint} from '../model/buildings';
import {roadContext,roadGeometry} from './roadGeometry';
import {sampledPath} from '../model/infrastructure';
import {terrainScene} from './scene';
import {mapSvg} from '../exports/png';
import {forestCanopyScene} from './forestCanopies';
import {forestCanopyAssets} from '../assets/forests/canopies/registry';
import {parseDocument,serializeDocument} from '../exports/json';
import {defaultVisualPreferences,readVisualPreferences,useVisualPreferences} from '../ui/visualPreferences';
import {useStudio} from '../ui/store';
import {commit,undo,redo} from '../commands/history';
import {ProjectDatabase,ProjectRepository} from '../persistence/database';
const all=grasslandAssets.map(a=>a.id),options={style:'illustrated' as const,detail:true,contours:true,grassland:'restrained' as const,grasslandAssets:all};
const files=import.meta.glob<string>('../assets/grassland/webp/*.webp',{query:'?inline',import:'default'});
let sources:Readonly<Record<string,string>>|undefined;
async function inlineSources(){return sources??=Object.fromEntries(await Promise.all(grasslandAssets.map(async a=>[a.id,await files[`../assets/grassland/webp/${a.file.slice(7)}`]()] as const)));}
function fixture(size=96){
 let d=createDocument();d.seed=1847;d.grid={...d.grid,width:size,height:size};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  if(x<4)d.terrain.push({x,y,kind:'water'});
  if(x>size*.8&&y<size*.5)d.terrain.push({x,y,kind:'forest'});
  if(x>size*.5&&x<size*.75)d.landscape.cells.push({...legacyTerrain({x,y}),elevation:2,rocks:.2});
 }
 d=placeBuilding(d,{x:28,y:29},'longhouse','manual');d.buildings[0]={...d.buildings[0],rotation:90,locked:true};
 d.roads=[{id:'road',surface:'dirt',style:'organic',editVersion:1,width:.8,layerId:'settlement',points:[{x:15,y:12},{x:22,y:40},{x:22,y:65}]},{id:'wall',surface:'palisade',width:.6,editVersion:1,layerId:'settlement',points:[{x:20,y:10},{x:70,y:10}]},{id:'bridge',surface:'wooden-bridge',width:1.2,layerId:'settlement',points:[{x:1,y:44},{x:8,y:44}]}];
 d.landscape.cells.push({...legacyTerrain({x:40,y:40}),ground:'soil'},{...legacyTerrain({x:41,y:40}),ground:'sand'});
 d.planning={version:1,layout:'contextual',centre:{x:25,y:30},workshop:{x:25,y:30},farming:{x:25,y:30},clusters:[],primaryRoutes:[],openSpaces:[{kind:'field',cells:[{x:30,y:40},{x:31,y:40}]}]};return d;
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();useVisualPreferences.setState({...defaultVisualPreferences,error:''});});
describe('original installed WebP pack',()=>{
 it('retains exact six supplied image bytes and registry identities without changing source art',async()=>{
  expect(new Set(all).size).toBe(6);const data=await inlineSources();
  for(const a of grasslandAssets){const bytes=Uint8Array.from(atob(data[a.id].split(',')[1]),c=>c.charCodeAt(0)),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');expect(hash).toBe(a.sha256);expect(String.fromCharCode(...bytes.subarray(0,4))).toBe('RIFF');expect(String.fromCharCode(...bytes.subarray(8,12))).toBe('WEBP');expect(a.width).toBe(896);expect(a.height).toBe(896);}
  expect(grasslandAssets.find(a=>a.kind==='marsh')!.crop).toEqual({x:340,y:360,size:240});
 });
 it('rejects arbitrary URLs, paths, unsupported formats, dimensions and duplicate IDs',()=>{
  for(const patch of [{id:'unknown'},{id:all[1]},{file:'https://bad/art.webp'},{file:'assets/../art.webp'},{file:'assets/art.svg'},{type:'water'},{format:'image/png'},{image_dimensions:[0,896]},{image_dimensions:[896,4096]},{name:''}])expect(()=>validateGrasslandManifest({...manifest,assets:[{...manifest.assets[0],...patch},...manifest.assets.slice(1)]})).toThrow();
  expect(()=>validateGrasslandManifest({...manifest,assets:manifest.assets.slice(1)})).toThrow();
  const a=grasslandAssets[0];expect(approvedGrasslandUrl('/assets/hearthlands-grassland-base-meadow-01-Ab_12.webp',a)).toBe(true);
  for(const u of ['https://bad/art.webp','//bad/art.webp','/assets/../art.webp','/assets/hearthlands-grassland-base-meadow-01-A.png','/assets/hearthlands-grassland-base-meadow-01-A.webp?redirect=bad','data:image/webp;base64,AAAA'])expect(approvedGrasslandUrl(u,a)).toBe(false);
 });
});
describe('restrained, context-aware deterministic composition',()=>{
 it('repeats after import, duplication and unrelated edits with no document writes',()=>{
  const d=fixture(),before=serializeDocument(d),p=grasslandPatches(d,'restrained');expect(p.length).toBeGreaterThan(15);
  expect(grasslandPatches(d,'restrained')).toBe(p);expect(grasslandPatches(parseDocument(before),'restrained')).toEqual(p);expect(grasslandPatches({...parseDocument(before),id:'duplicate',name:'Copy'},'restrained')).toEqual(p);
  expect(grasslandPatches({...d,seed:1848},'restrained')).not.toEqual(p);expect(serializeDocument(d)).toBe(before);
 });
 it('uses all six stable IDs in appropriate ecological contexts, with bounded low coverage',()=>{
  const used=new Set<string>();
  for(const seed of [1847,17,81,129,707]){const d={...fixture(),seed},q=terrainQuery(d),p=grasslandPatches(d,'accents');
   for(const c of p){used.add(c.assetId);const a=grasslandAssets.find(a=>a.id===c.assetId)!;if(a.kind==='rocky')expect(q.at(c).rocks>.15||q.at(c).elevation>1).toBe(true);
    if(a.kind==='marsh'){expect(c.x).toBeLessThan(10);expect(q.at(c).water).toBe(0);expect(q.at(c).elevation).toBeLessThanOrEqual(1.5);}}
   // Even the conservative enclosing circles occupy a minority of the map;
   // actual feathered coverage is much smaller.
   expect(p.reduce((n,c)=>n+Math.PI*c.radius*c.radius,0)/(96*96)).toBeLessThan(.25);
  }expect([...used].sort()).toEqual([...all].sort());
 });
 it('protects the complete rotated envelope from water, woodland, fields, footprints, entrances and infrastructure',()=>{
  const d=fixture(),q=terrainQuery(d),p=grasslandPatches(d,'accents'),clearance=grasslandClearance(d),b=d.buildings[0],f=footprint(b);
  for(const c of p){expect(c.radius).toBeLessThan(clearance(c));
   for(let angle=0;angle<Math.PI*2;angle+=.1)for(const scale of [0,.5,1]){const point={x:c.x+Math.cos(angle)*c.radius*scale,y:c.y+Math.sin(angle)*c.radius*scale},t=q.at(point);expect(q.inside(point)).toBe(true);expect(t.ground).toBe('grass');expect(t.water).toBe(0);expect(t.vegetation).toBeLessThan(.2);expect(point.x>=b.x&&point.x<=b.x+f.width&&point.y>=b.y&&point.y<=b.y+f.height).toBe(false);}
  }
  const context=roadContext(d);let gap=Infinity;
  for(const r of d.roads){const g=roadGeometry(d,r,context);for(const point of sampledPath(g.samples,.18))for(const c of p)gap=Math.min(gap,Math.hypot(point.x-c.x,point.y-c.y)-c.radius-g.width/2);}
  expect(gap).toBeGreaterThan(.24);
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)expect(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)).toBeGreaterThan(p[i].radius+p[j].radius);
 });
 it('keeps existing Planning and disabled Illustrated paths identical, including the approved forests',()=>{
  const d=fixture(),original=terrainScene(d,{...options,grassland:'off'}),enabled=terrainScene(d,options);
  expect(terrainScene(d,{...options,grassland:undefined})).toBe(original);expect(enabled.filter(p=>!p.grassland)).toEqual(original);
  const forest=forestCanopyScene(d,forestCanopyAssets.map(a=>a.id));
  expect(terrainScene(d,{...options,forestPilot:true,forestPack:'canopies',forestAssets:forestCanopyAssets.map(a=>a.id)}).find(p=>p.sprites)?.sprites).toBe(forest.sprites);
  expect(terrainScene(d,{...options,style:'planning'})).toBe(terrainScene(d,{...options,style:'planning',grassland:'off'}));
  for(const reduced of [true,false])for(const detail of [true,false])expect(terrainScene(d,{...options,reduced,detail}).find(p=>p.grassland)?.grassland).toEqual(grasslandPatches(d,'restrained'));
  expect(terrainScene(d,{...options,grasslandAssets:[]})).toEqual(original);
  expect(terrainScene(d,{...options,grasslandAssets:[all[0]]}).find(p=>p.grassland)?.grassland).toEqual(grasslandPatches(d,'restrained').filter(p=>p.assetId===all[0]));
 });
 it('keeps every mask fully transparent outside its safe circle, irregular and smoothly feathered',()=>{
  const areas:number[]=[];
  for(let v=0;v<3;v++){let coverage=0,partial=0;
   for(let y=-1;y<=1;y+=.025)for(let x=-1;x<=1;x+=.025){const a=grasslandAlpha(x,y,v);expect(a).toBeGreaterThanOrEqual(0);expect(a).toBeLessThanOrEqual(1);if(Math.hypot(x,y)>=1)expect(a).toBe(0);if(a>0&&a<1)partial++;coverage+=a;}
   expect(partial).toBeGreaterThan(500);areas.push(coverage);expect(grasslandAlpha(0,0,v)).toBe(1);expect(new Set(Array.from({length:24},(_,i)=>grasslandAlpha(Math.cos(i*Math.PI/12)*.76,Math.sin(i*Math.PI/12)*.76,v))).size).toBeGreaterThan(2);
  }expect(new Set(areas).size).toBe(3);
 });
 it.each([96,128,192])('bounds %s² forest-heavy/100-building work, reuses geometry and handles fully blocked land',size=>{
  const d=fixture(size);d.buildings=Array.from({length:100},(_,i)=>({...d.buildings[0],id:`protected-${i}`,x:12+i%10*5,y:15+Math.floor(i/10)*5}));const before=serializeDocument(d),p=grasslandPatches(d,'restrained');expect(p.length).toBeLessThan(size*size/70);expect(grasslandPatches(d,'restrained')).toBe(p);expect(serializeDocument(d)).toBe(before);
  const blocked={...d,terrain:Array.from({length:size*size},(_,i)=>({x:i%size,y:Math.floor(i/size),kind:'water' as const})),landscape:{...d.landscape,cells:[]}};expect(grasslandPatches(blocked,'accents')).toEqual([]);
 });
 it('preserves local-only preferences, history, JSON, snapshots and reopened geometry',async()=>{
  const d=fixture(),source=serializeDocument(d),p=grasslandPatches(d,'restrained'),state=useStudio.getState();
  expect(defaultVisualPreferences.grassland).toBe('off');expect(normalizeGrasslandMode('bad')).toBe('off');
  expect(readVisualPreferences({getItem:()=>JSON.stringify({...defaultVisualPreferences,grassland:undefined})}).grassland).toBe('off');
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  useVisualPreferences.getState().change({style:'illustrated',grassland:'restrained'});expect(readVisualPreferences(globalThis.localStorage).grassland).toBe('restrained');expect(useStudio.getState().present).toBe(state.present);expect(useStudio.getState().past).toBe(state.past);
  const db=new ProjectDatabase('grassland-'+crypto.randomUUID()),repo=new ProjectRepository(db);
  try{const record=await repo.create(d),doc=record.document,snap=await repo.snapshot(doc.id,'Before meadow');
   const edit={...doc,landscape:{...doc.landscape,cells:[...doc.landscape.cells,{...legacyTerrain({x:48,y:48}),vegetation:1}]}},h=commit({present:doc,past:[],future:[]},edit);
   expect(grasslandPatches(undo(h).present,'restrained')).toEqual(p);expect(grasslandPatches(redo(undo(h)).present,'restrained')).toEqual(grasslandPatches(edit,'restrained'));
   await repo.save(edit,0);db.close();await db.open();expect(grasslandPatches((await repo.load(doc.id)).document,'restrained')).toEqual(grasslandPatches(edit,'restrained'));expect(grasslandPatches((await repo.restore(doc.id,snap.id,1)).document,'restrained')).toEqual(p);
  }finally{db.close();await db.delete();}expect(serializeDocument(d)).toBe(source);expect(source).not.toContain('grassland');
 });
});
function browserMocks(){let decodes=0,draws=0;const pixels:Uint8ClampedArray[]=[];
 class ReadyImage {naturalWidth=896;naturalHeight=896;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(v:string){if(v){decodes++;queueMicrotask(()=>this.onload?.());}}}
 vi.stubGlobal('Image',ReadyImage);vi.stubGlobal('document',{createElement:()=>({width:0,height:0,toDataURL:()=> 'data:image/png;base64,AAAA',getContext:()=>({drawImage:()=>draws++,getImageData:()=>{const data=new Uint8ClampedArray(grasslandMaskEdge**2*4).fill(81);pixels.push(data);return {data};},putImageData:()=>{}})})});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:approved-local');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 return()=>({decodes,draws,pixels});
}
async function sourceMocks(){const data=await inlineSources(),urls=(await import('../assets/grassland/images')).grasslandSources;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const a=grasslandAssets.find(a=>urls[a.id]===url)!;return {ok:true,arrayBuffer:async()=>Uint8Array.from(atob(data[a.id].split(',')[1]),c=>c.charCodeAt(0)).buffer};}));return urls;
}
describe('bounded loading, feather caches and export parity',()=>{
 it('decodes six textures once, builds eighteen shared masks, modifies alpha only, and embeds identical transforms at every resolution',async()=>{
  const counts=browserMocks();await sourceMocks();const notify=vi.fn();grasslandImages.subscribe(notify);const images=await grasslandImages.prepare();expect(await grasslandImages.prepare()).toBe(images);expect(images.ready).toEqual(all);expect(images.failed).toEqual([]);expect(counts().decodes).toBe(6);expect(new Set([...images.images.values()].flatMap(v=>v.map(i=>i.original))).size).toBe(6);for(const v of images.images.values()){expect(v.every(i=>i.original===v[0].original)).toBe(true);expect(v[0].originalSource).toMatch(/^data:image\/webp;base64,/);}expect(counts().draws).toBe(18);expect(notify).toHaveBeenCalledTimes(2);expect(fetch).toHaveBeenCalledTimes(6);
  for(const pixels of counts().pixels){expect(pixels[0]).toBe(81);expect(pixels[1]).toBe(81);expect(pixels[2]).toBe(81);expect(pixels[3]).toBe(0);expect(pixels[(192*384+192)*4+3]).toBe(255);}
  const d=fixture(),before=serializeDocument(d),patches=grasslandPatches(d,'restrained');
  for(const resolution of [1024,2048,4096]){const svg=mapSvg(d,{style:'illustrated',grassland:'restrained',resolution,grid:false,labels:false});expect(svg).not.toContain('href="http');expect(svg).not.toContain('<filter');expect(svg).not.toContain('data-grassland-fallback');expect((svg.match(/data-grassland-asset=/g)??[]).length).toBe(patches.length);
   for(const p of patches)expect(svg).toContain(`data-grassland-asset="${p.assetId}" transform="translate(${p.x} ${p.y}) rotate(${p.angle*180/Math.PI})"><svg x="${-p.radius}" y="${-p.radius}" width="${2*p.radius}" height="${2*p.radius}" viewBox="0 0 384 384">`);
   expect(svg.indexOf('data-grassland-asset=')).toBeLessThan(svg.indexOf('data-road='));
  }
  const o={style:'planning' as const,resolution:1024,grid:false,labels:false};expect(mapSvg(d,{...o,grassland:'restrained'})).toBe(mapSvg(d,o));expect(serializeDocument(d)).toBe(before);
 });
 it('rejects unsafe/corrupted sources without changing the previous renderer or retrying every frame',async()=>{
  browserMocks();const urls=await sourceMocks();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(40).buffer})));
  const store=createGrasslandImageStore(async()=>({grasslandSources:urls})),state=await store.prepare();expect(state.failed).toEqual(all);expect(await store.prepare()).toBe(state);expect(fetch).toHaveBeenCalledTimes(6);
  vi.mocked(fetch).mockClear();const remote=await createGrasslandImageStore(async()=>({grasslandSources:Object.fromEntries(all.map(id=>[id,'https://bad/image.webp']))})).prepare();expect(remote.failed).toEqual(all);expect(fetch).not.toHaveBeenCalled();
 });
 it('bounds stalled modules and image requests, using at most two concurrent downloads',async()=>{
  browserMocks();const urls=await sourceMocks();vi.useFakeTimers();const signals:AbortSignal[]=[];
  vi.stubGlobal('fetch',vi.fn((_u:string,o:{signal:AbortSignal})=>{signals.push(o.signal);return new Promise(()=>{});}));
  const pending=createGrasslandImageStore(async()=>({grasslandSources:urls})).prepare();await vi.advanceTimersByTimeAsync(30100);expect((await pending).failed).toEqual(all);expect(signals).toHaveLength(6);expect(signals.every(s=>s.aborted)).toBe(true);
  const stalled=createGrasslandImageStore(()=>new Promise(()=>{})).prepare();await vi.advanceTimersByTimeAsync(8100);expect((await stalled).failed).toEqual(all);
 });
 it('fails safely if canvas memory or pixel access is unavailable',()=>{
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>null})});expect(()=>maskGrasslandImage({} as HTMLImageElement,grasslandAssets[0],0)).toThrow('Meadow cache unavailable');
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,toDataURL:()=> 'data:,',getContext:()=>({drawImage:()=>{},getImageData:()=>({data:new Uint8ClampedArray(grasslandMaskEdge**2*4)}),putImageData:()=>{}})})});expect(()=>maskGrasslandImage({} as HTMLImageElement,grasslandAssets[0],0)).toThrow('Meadow image encoding unavailable');
 });
});
