import 'fake-indexeddb/auto';
import {afterEach,describe,it,expect,vi} from 'vitest';
import manifest from '../assets/forests/canopies/manifest.json';
import {forestCanopyAssets,validateCanopyManifest} from '../assets/forests/canopies/registry';
import {forestPackAssets,allForestAssets,assetForestPack} from '../assets/forests/catalogue';
import {createDocument} from '../model/document';
import {legacyTerrain,terrainQuery} from '../model/terrain';
import {placeBuilding} from '../model/operations';
import {footprint} from '../model/buildings';
import {entrance} from '../generator/navigation';
import {sampledPath} from '../model/infrastructure';
import {roadContext,roadGeometry} from './roadGeometry';
import {forestScene,forestClearance} from './forestGeometry';
import {forestPilotScene,forestPilotSprites} from './forestPilot';
import {forestCanopyScene,forestCanopySprites,canopyVariation} from './forestCanopies';
import {createForestImageStore,forestCanopyImages,forestImagesForPack,approvedCanopyUrl} from './forestImages';
import {terrainScene} from './scene';
import {mapSvg} from '../exports/png';
import {serializeDocument,parseDocument} from '../exports/json';
import {defaultVisualPreferences,readVisualPreferences,useVisualPreferences} from '../ui/visualPreferences';
import {useStudio} from '../ui/store';
import {commit,undo,redo} from '../commands/history';
import {ProjectDatabase,ProjectRepository} from '../persistence/database';
const all=forestCanopyAssets.map(a=>a.id);
const files=import.meta.glob<string>('../assets/forests/canopies/png/*.png',{query:'?inline',import:'default'});
let sources:Readonly<Record<string,string>>|undefined;
async function inlineSources(){
 if(!sources)sources=Object.fromEntries(await Promise.all(forestCanopyAssets.map(async a=>[a.id,await files[`../assets/forests/canopies/png/${a.file.slice(7)}`]()] as const)));
 return sources;
}
function fixture(size=64){let d=createDocument();d.seed=1847;d.grid={...d.grid,width:size,height:size};
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(x<52+Math.sin(y/7)*4||x>size-10)d.terrain.push({x,y,kind:x>size-10?'water':'forest'});
 d=placeBuilding(d,{x:24,y:25},'longhouse','protected');d.buildings[0]={...d.buildings[0],rotation:90,locked:true};
 d.landscape.cells=Array.from({length:40},(_,i)=>({...legacyTerrain({x:35+i%8,y:30+Math.floor(i/8)}),vegetation:1,ground:'soil' as const}));
 d.roads=[{id:'road',layerId:'settlement',surface:'dirt',style:'organic',width:.7,editVersion:1,points:[{x:6,y:20},{x:20,y:20},{x:20,y:50}]},{id:'wall',layerId:'settlement',surface:'wall',style:'organic',width:.4,editVersion:1,points:[{x:4,y:6},{x:50,y:6},{x:50,y:55}]},{id:'bridge',layerId:'settlement',surface:'wooden-bridge',width:1,editVersion:1,points:[{x:54,y:46},{x:62,y:46}]}];
 d.planning={version:1,layout:'contextual',centre:{x:24,y:20},workshop:{x:24,y:20},farming:{x:24,y:20},clusters:[],primaryRoutes:[],openSpaces:[{kind:'field',cells:[{x:30,y:40},{x:31,y:40}]}]};return d;
}
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();useVisualPreferences.setState({...defaultVisualPreferences,error:''});});
describe('canopy-only installed pack',()=>{
 it('retains the exact twenty original RGBA sources, dimensions, hashes, alpha bounds and stable unique IDs',async()=>{
  const source=await inlineSources();expect(all).toHaveLength(20);expect(new Set(allForestAssets.map(a=>a.id)).size).toBe(26);
  expect(forestPackAssets.pilot).toHaveLength(6);
  for(const a of forestCanopyAssets){
   const bytes=Uint8Array.from(atob(source[a.id].split(',')[1]),c=>c.charCodeAt(0)),h=new DataView(bytes.buffer),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   expect(hash).toBe(a.sha256);expect(h.getUint32(0)).toBe(0x89504e47);expect(bytes[24]).toBe(8);expect(bytes[25]).toBe(6);expect(h.getUint32(16)).toBe(a.pixelWidth);expect(h.getUint32(20)).toBe(a.pixelHeight);
   expect(a.alpha).toEqual({x:4,y:4,width:a.pixelWidth-8,height:a.pixelHeight-8});expect(a.anchor).toEqual([.5,.5]);expect(assetForestPack(a.id)).toBe('canopies');
  }
  for(const species of ['beech','birch','oak','pine'])expect(forestCanopyAssets.filter(a=>a.species===species).map(a=>a.variation)).toEqual([1,2,3,4,5]);
 });
 it('rejects unsafe manifests, remote/traversing files, mismatched species/IDs and malformed bounds',()=>{
  for(const patch of [{file:'https://bad/tree.png'},{file:'assets/../tree.png'},{file:'assets/beech_01.svg'},{species:'bad'},{variation:6},{id:all[1]},{alpha:{x:-1,y:0,width:1,height:1}},{alpha:{x:0,y:0,width:9999,height:1}},{alpha:{x:0,y:0,width:0,height:1}},{pixelWidth:0},{pixelHeight:4096},{anchor:[Infinity,.5]},{diameter:NaN},{weight:0},{sha256:'wrong'}])expect(()=>validateCanopyManifest({...manifest,assets:[{...manifest.assets[0],...patch},...manifest.assets.slice(1)]})).toThrow();
  expect(()=>validateCanopyManifest({...manifest,comparisonOnly:false})).toThrow();expect(()=>validateCanopyManifest({...manifest,assets:manifest.assets.slice(1)})).toThrow();
 });
 it('chooses all five variants per species from a stable separate seeded stream',()=>{
  for(const species of ['beech','birch','oak','pine'] as const){const variants=new Map<string,number>();
   for(let i=0;i<1000;i++){const c={x:i*.73,y:i%37*.61,species},a=canopyVariation(1847,c);expect(a.species).toBe(species);expect(canopyVariation(1847,c)).toBe(a);variants.set(a.id,(variants.get(a.id)??0)+1);}
   expect(variants.size).toBe(5);expect(Math.min(...variants.values())).toBeGreaterThan(100);expect(Math.max(...variants.values())).toBeLessThan(300);
  }
 });
});
describe('stable groups, natural fringes and complete clearance',()=>{
 it('preserves original anchors/species/envelopes, adds safe edge candidates, and never writes the document',()=>{
  const d=fixture(),source=serializeDocument(d),base=forestScene(d),old=forestPilotSprites(d,base.crowns),s=forestCanopySprites(d),byPoint=new Map(s.map(s=>[`${s.x},${s.y}`,s]));
  expect(s.length).toBeGreaterThan(old.length);expect(new Set(s.map(s=>s.assetId)).size).toBe(20);
  const crowns=new Map(base.crowns.map(c=>[`${c.x},${c.y}`,c]));
  for(const p of s){const c=crowns.get(`${p.x},${p.y}`)!;expect(c).toBeTruthy();expect(canopyVariation(d.seed,c).id).toBe(p.assetId);}
  for(const p of old){const next=byPoint.get(`${p.x},${p.y}`)!;expect(next).toBeTruthy();expect(next.radius).toBeLessThanOrEqual(p.radius+1e-12);}
  expect(forestCanopySprites({...parseDocument(source),id:'duplicate',name:'Copy'})).toEqual(s);expect(serializeDocument(d)).toBe(source);
 });
 it('keeps every rotated alpha rectangle and edge envelope clear of structures, entrances, roads, water, fields and defenses',()=>{
  const d=fixture(),q=terrainQuery(d),s=forestCanopySprites(d),available=forestClearance(d),invalid=[];expect(d.terrain.some(t=>t.kind==='water')).toBe(true);
  const home=d.buildings[0],f=footprint(home),e=entrance(home),rects=[{x:home.x-.3,y:home.y-.3,width:f.width+.6,height:f.height+.6},{x:e.x-.3,y:e.y-.2,width:1.6,height:1.5},...d.planning!.openSpaces[0].cells.map(p=>({...p,width:1,height:1}))];
  for(const c of s){expect(c.radius).toBeLessThanOrEqual(available(c)+1e-12);
   for(let v=0;v<=3;v++)for(let u=0;u<=3;u++){
    const x=c.left+c.width*u/3,y=c.top+c.height*v/3,p={x:c.x+x*Math.cos(c.angle)-y*Math.sin(c.angle),y:c.y+x*Math.sin(c.angle)+y*Math.cos(c.angle)},t=q.at(p);
    if(!q.inside(p)||t.vegetation<.35||t.water>.05||t.ground==='soil'||rects.some(r=>p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y&&p.y<=r.y+r.height))invalid.push(p);
   }
  }
  expect(invalid).toEqual([]);let margin=Infinity;const context=roadContext(d);
  for(const r of d.roads){const g=roadGeometry(d,r,context);for(const p of sampledPath(g.samples,.18))for(const c of s)margin=Math.min(margin,Math.hypot(p.x-c.x,p.y-c.y)-c.radius-g.width/2);}
  expect(margin).toBeGreaterThan(.11);
 });
 it('uses the same zoom-independent sprites without procedural remnants, dark overlays or unrelated detail substitutions',()=>{
  const d=fixture(),scene=forestCanopyScene(d,all);expect(scene.paths).toEqual([]);expect(scene.detail).toEqual([]);
  for(const reduced of [true,false])for(const detail of [true,false]){
   const p=terrainScene(d,{style:'illustrated',detail,contours:true,reduced,forestPilot:true,forestPack:'canopies',forestAssets:all});expect(p.find(p=>p.sprites)?.sprites).toBe(scene.sprites);
  }
  const options={style:'illustrated' as const,detail:true,contours:true,forestPilot:true,forestAssets:forestPackAssets.pilot.map(a=>a.id)};
  expect(terrainScene(d,{...options,forestPack:'pilot'})).toBe(terrainScene(d,options));expect(forestPilotScene(d,options.forestAssets).sprites?.some(s=>s.assetId.includes('.canopy.'))).toBe(false);
  expect(terrainScene(d,{...options,forestPilot:false,forestPack:'canopies'})).toEqual(terrainScene(d,{...options,forestPilot:false}));
  expect(terrainScene(d,{...options,style:'planning',forestPack:'canopies',forestAssets:all})).toEqual(terrainScene(d,{...options,style:'planning'}));
 });
 it('falls back for missing images without rerolling healthy assignments',()=>{
  const d=fixture(),planned=forestCanopyScene(d,all),one=forestCanopyScene(d,[all[0]]);
  expect(one.sprites).toEqual(planned.sprites!.filter(s=>s.assetId===all[0]));expect(one.paths.length).toBeGreaterThan(0);expect(forestCanopyScene(d,[])).toBe(forestScene(d));expect(forestCanopyScene(d,['unknown'])).toBe(forestScene(d));
 });
 it.each([96,128,192])('bounds forest-heavy %s² layouts with 100 protected buildings and reuses the composition',size=>{
  const d=fixture(size);d.terrain=[];d.roads=[];
  for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(x<size*.72+Math.sin(y/9)*3)d.terrain.push({x,y,kind:'forest'});
  d.buildings=Array.from({length:100},(_,i)=>({...d.buildings[0],id:`protected-${i}`,x:4+i%10*5,y:4+Math.floor(i/10)*5}));
  const source=serializeDocument(d),start=performance.now(),scene=forestCanopyScene(d,all),cold=performance.now()-start,hit=performance.now();
  for(let i=0;i<50;i++)expect(forestCanopyScene(d,all)).toBe(scene);
  expect(scene.sprites!.length).toBeGreaterThan(100);expect(scene.sprites!.length).toBeLessThanOrEqual(scene.crowns.length);expect(scene.paths).toEqual([]);expect(serializeDocument(d)).toBe(source);
  console.log(`Canopies ${size}²/100: ${cold.toFixed(1)}ms cold; ${(performance.now()-hit).toFixed(1)}ms / 50 cache hits + invariants; ${scene.sprites!.length} sprites in one image batch`);
 });
 it('keeps opt-in preferences out of documents/history and preserves terrain painting, autosave, snapshots and reopening',async()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const d=fixture(),before=serializeDocument(d),sprites=forestCanopySprites(d);useStudio.getState().restore(d);const state=useStudio.getState();
  expect(readVisualPreferences({getItem:()=>JSON.stringify({version:1,style:'illustrated',detail:'auto',labels:false,forestPilot:true})}).forestPack).toBe('pilot');
  useVisualPreferences.getState().change({forestPilot:true,forestPack:'canopies',style:'illustrated'});expect(readVisualPreferences(globalThis.localStorage).forestPack).toBe('canopies');expect(useStudio.getState().present).toBe(state.present);expect(useStudio.getState().past).toBe(state.past);expect(serializeDocument(d)).toBe(before);expect(before).not.toContain('forestPack');
  const db=new ProjectDatabase('canopies-'+crypto.randomUUID()),repo=new ProjectRepository(db);
  try{const record=await repo.create(d),doc=record.document,snap=await repo.snapshot(doc.id,'Canopy baseline');
   const edited={...doc,landscape:{...doc.landscape,cells:[...doc.landscape.cells,{...legacyTerrain({x:12,y:12}),vegetation:0}]}};
   const h=commit({present:doc,past:[],future:[]},edited);expect(forestCanopySprites(undo(h).present)).toEqual(sprites);expect(forestCanopySprites(redo(undo(h)).present)).not.toEqual(sprites);
   await repo.save(edited,0);db.close();await db.open();expect(forestCanopySprites((await repo.load(doc.id)).document)).toEqual(forestCanopySprites(edited));
   expect(forestCanopySprites((await repo.restore(doc.id,snap.id,1)).document)).toEqual(sprites);
  }finally{db.close();await db.delete();}
 });
});
function imageMocks(){let decodes=0,draws=0;class ReadyImage{naturalWidth=0;naturalHeight=0;width=0;height=0;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(value:string){decodes++;const bytes=Uint8Array.from(atob(value.split(',')[1]),c=>c.charCodeAt(0)),h=new DataView(bytes.buffer);this.width=this.naturalWidth=h.getUint32(16);this.height=this.naturalHeight=h.getUint32(20);queueMicrotask(()=>this.onload?.());}}
 vi.stubGlobal('Image',ReadyImage);vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:()=>draws++})})});return()=>({decodes,draws});
}
async function bundledMocks(){const data=await inlineSources(),urls=(await import('../assets/forests/canopies/images')).forestImageSources;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const a=forestCanopyAssets.find(a=>urls[a.id]===url)!;return {ok:true,arrayBuffer:async()=>Uint8Array.from(atob(data[a.id].split(',')[1]),c=>c.charCodeAt(0)).buffer};}));return urls;
}
describe('bounded bundled PNG loading and matching export',()=>{
 it('admits only base-safe approved PNG references',()=>{
  const a=forestCanopyAssets[0];expect(approvedCanopyUrl('/assets/beech_01-aB_12.png',a)).toBe(true);
  for(const url of ['https://bad/beech_01.png','//bad/beech_01.png','/assets/../beech_01.png','/assets/beech_01-aB_12.svg','/other/beech_01-aB_12.png','/assets/beech_01-aB_12.png?redirect=bad','data:image/png;base64,AAAA'])expect(approvedCanopyUrl(url,a)).toBe(false);
 });
 it('decodes each of twenty sources once, reuses forty image-pyramid surfaces and keeps packs separate',async()=>{
  const counts=imageMocks(),urls=await bundledMocks(),store=createForestImageStore(async()=>({forestImageSources:urls}),forestCanopyAssets,true),notify=vi.fn();store.subscribe(notify);
  const state=await store.prepare();expect(await store.prepare()).toBe(state);expect(state.ready).toEqual(all);expect(state.failed).toEqual([]);expect(counts()).toEqual({decodes:20,draws:40});expect(notify).toHaveBeenCalledTimes(2);expect(fetch).toHaveBeenCalledTimes(20);
  expect(forestImagesForPack('canopies')).toBe(forestCanopyImages);expect(forestImagesForPack('pilot')).not.toBe(forestCanopyImages);
  for(const v of state.images.values()){expect(v.source).toMatch(/^data:image\/png;base64,/);expect(v.medium).toBeTruthy();expect(v.distant).toBeTruthy();}
 });
 it('limits downloads to four concurrent jobs, rejects corrupted PNGs and settles partial failures',async()=>{
  imageMocks();const urls=await bundledMocks(),data=await inlineSources();let active=0,peak=0;
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;const a=forestCanopyAssets.find(a=>urls[a.id]===url)!;return {ok:true,arrayBuffer:async()=>a.id===all[0]?new Uint8Array(40).buffer:Uint8Array.from(atob(data[a.id].split(',')[1]),c=>c.charCodeAt(0)).buffer};}));
  const state=await createForestImageStore(async()=>({forestImageSources:urls}),forestCanopyAssets,true).prepare();expect(peak).toBeLessThanOrEqual(4);expect(state.failed).toEqual([all[0]]);expect(state.ready).toHaveLength(19);
 });
 it('rejects remote URLs without requests and bounds stalled fetches with aborts',async()=>{
  imageMocks();const requests=vi.fn();vi.stubGlobal('fetch',requests);
  const invalid=await createForestImageStore(async()=>({forestImageSources:Object.fromEntries(all.map(id=>[id,'https://bad/tree.png']))}),forestCanopyAssets,true).prepare();expect(invalid.failed).toHaveLength(20);expect(requests).not.toHaveBeenCalled();
  const urls=await bundledMocks();vi.useFakeTimers();const signals:AbortSignal[]=[];vi.stubGlobal('fetch',vi.fn((_url:string,o:{signal:AbortSignal})=>{signals.push(o.signal);return new Promise(()=>{});}));
  const pending=createForestImageStore(async()=>({forestImageSources:urls}),forestCanopyAssets.slice(0,4),true).prepare();await vi.advanceTimersByTimeAsync(10100);expect((await pending).failed).toHaveLength(4);expect(signals.every(s=>s.aborted)).toBe(true);
 });
 it('embeds the exact twenty designs once and uses identical ordered transforms at all PNG resolutions',async()=>{
  imageMocks();await bundledMocks();await forestCanopyImages.prepare();const d=fixture(),source=serializeDocument(d),sprites=forestCanopyScene(d,all).sprites!;
  for(const resolution of [1024,2048,4096])for(const reduced of [false,true]){
   const svg=mapSvg(d,{style:'illustrated',forestPilot:true,forestPack:'canopies',resolution,reduced,labels:false,grid:false});expect(svg).not.toContain('data-forest-fallback');expect(svg).not.toContain('href="http');expect(svg).not.toContain('<filter');expect((svg.match(/id="forest-pilot-source-/g)??[]).length).toBe(20);
   const actual=[...svg.matchAll(/<g data-forest-asset="[^"]+" transform="[^"]+"><svg x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"/g)].map(m=>m[0]);
   expect(actual).toEqual(sprites.map(s=>`<g data-forest-asset="${s.assetId}" transform="translate(${s.x} ${s.y}) rotate(${s.angle*180/Math.PI})"><svg x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}"`));
  }
  const o={style:'planning' as const,resolution:1024,labels:false,grid:false};expect(mapSvg(d,{...o,forestPilot:true,forestPack:'canopies'})).toBe(mapSvg(d,o));expect(serializeDocument(d)).toBe(source);
 });
});
