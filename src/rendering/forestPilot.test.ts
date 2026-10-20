import {afterEach,describe,it,expect,vi} from 'vitest';
import manifest from '../assets/forests/manifest.json';
import {forestImageAssets,validateForestManifest} from '../assets/forests/registry';
import {forestScene,forestClearance,type ForestCrown} from './forestGeometry';
import {forestPilotScene,forestPilotSprites,fitForestSprite,forestCanopySizes} from './forestPilot';
import {createForestImageStore,forestImages,forestImageLevel} from './forestImages';
import {terrainScene} from './scene';
import {createDocument} from '../model/document';
import {legacyTerrain,terrainQuery} from '../model/terrain';
import {placeBuilding} from '../model/operations';
import {roadContext,roadGeometry} from './roadGeometry';
import {sampledPath} from '../model/infrastructure';
import {serializeDocument,parseDocument} from '../exports/json';
import {mapSvg} from '../exports/png';
import {readVisualPreferences,defaultVisualPreferences,useVisualPreferences} from '../ui/visualPreferences';
import {useStudio} from '../ui/store';
function fixture(){const d=createDocument();d.grid={...d.grid,width:96,height:96};for(let y=3;y<90;y++)for(let x=2;x<92;x++)if(y>12+Math.sin(x/8)*8&&y%18>3)d.terrain.push({x,y,kind:x>86?'water':'forest'});return d;}
const all=forestImageAssets.map(a=>a.id);
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();useVisualPreferences.setState({...defaultVisualPreferences,error:''});});
describe('installed forest PNG pilot',()=>{
 it('installs all six approved original RGBA files with exact hashes, dimensions, bounds and disabled automatic flags',async()=>{
  const {forestImageSources}=await import('../assets/forests/images');expect(forestImageAssets).toHaveLength(6);
  expect(new Set(all).size).toBe(6);
  for(const [i,a] of forestImageAssets.entries()){
   const src=forestImageSources[a.id],bytes=Uint8Array.from(atob(src.split(',')[1]),c=>c.charCodeAt(0)),header=new DataView(bytes.buffer);
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   expect(hash).toBe(a.sha256);expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(bytes[24]).toBe(8);expect(bytes[25]).toBe(6);expect(header.getUint32(16)).toBe(a.pixelWidth);expect(header.getUint32(20)).toBe(a.pixelHeight);
   expect(src).toMatch(/^data:image\/png;base64,/);
   expect(a.alpha.x).toBeGreaterThan(0);expect(a.alpha.y).toBeGreaterThan(0);expect(a.anchor).toEqual([.5,.5]);
   expect(manifest.assets[i].automaticEnabled).toBe(false);expect(manifest.assets[i].manualApproved).toBe(false);
  }
 });
 it('rejects traversal, remote references, malformed metadata and duplicate IDs',()=>{
  for(const patch of [{file:'https://bad/a.png'},{file:'assets/../a.png'},{file:'assets/x.svg'},{pixelWidth:4096},{pixelHeight:0},{anchorNormalized:[2,.5]},{suggestedDiameterTiles:100},{automaticEnabled:true},{sha256:'bad'},{id:manifest.assets[1].id}])expect(()=>validateForestManifest({...manifest,assets:[{...manifest.assets[0],...patch},...manifest.assets.slice(1)]})).toThrow();
 });
 it('keeps baseline Illustrated and Planning scenes byte-identical when off, including legacy preferences',()=>{
  const d=fixture(),before=serializeDocument(d);
  for(const style of ['planning','illustrated'] as const){const o={style,detail:true,contours:true};expect(terrainScene(d,{...o,forestPilot:false,forestAssets:all})).toEqual(terrainScene(d,o));}
  const o={style:'planning' as const,detail:true,contours:true};expect(terrainScene(d,{...o,forestPilot:true,forestAssets:all})).toEqual(terrainScene(d,o));
  expect(readVisualPreferences({getItem:()=>JSON.stringify({version:1,style:'illustrated',labels:true,detail:'auto'})}).forestPilot).toBe(false);
  expect(serializeDocument(d)).toBe(before);
 });
 it('packs substantial overlapping canopies, stable across ordering, IDs, JSON and zoom',()=>{
  const d=fixture(),base=forestScene(d),a=forestPilotSprites(d,base.crowns),before=serializeDocument(d);
  expect(a.length).toBeGreaterThan(100);expect(a.length).toBeLessThan(base.crowns.length);
  expect(new Set(a.map(s=>s.assetId)).size).toBe(4);
  expect(a.filter(s=>s.width>2).length/a.length).toBeGreaterThan(.5);
  expect(forestPilotSprites(d,[...base.crowns].reverse())).toEqual(a);
  expect(forestPilotSprites({...parseDocument(before),id:'duplicate',name:'Copy'},forestScene(parseDocument(before)).crowns)).toEqual(a);
  const pilot=forestPilotScene(d,all);expect(pilot.crowns).toBe(base.crowns);expect(pilot.paths).not.toBe(base.paths);
  expect(pilot.paths.every(p=>!p.stroke&&p.opacity!<=.22)).toBe(true);expect(pilot.detail).toEqual([]);
  for(const reduced of [true,false]){const p=terrainScene(d,{style:'illustrated',detail:true,contours:true,reduced,forestPilot:true,forestAssets:all});expect(p.find(p=>p.sprites)?.sprites).toBe(pilot.sprites);}
  expect(serializeDocument(d)).toBe(before);
 });
 it('fits every alpha rectangle proportionally inside its certified group circle at arbitrary rotations',()=>{
  const c:ForestCrown={x:10,y:20,radius:1.2,species:'oak',tone:0,variant:.3,angle:0,density:'edge'};
  for(const a of forestImageAssets)for(const radius of [.3,.5,.9,1.2,2,3,8])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
   const s=fitForestSprite({...c,radius},a,angle);if(!s)continue;
   expect(s.width/s.height).toBeCloseTo(a.alpha.width/a.alpha.height,12);expect(Math.max(s.width,s.height)).toBeLessThanOrEqual((a.role==='single'?forestCanopySizes[a.species as keyof typeof forestCanopySizes]:a.diameter)+1e-12);
   expect(s.radius).toBeLessThanOrEqual(radius+1e-12);
   for(const x of [s.left,s.left+s.width])for(const y of [s.top,s.top+s.height]){
    const px=x*Math.cos(angle)-y*Math.sin(angle),py=x*Math.sin(angle)+y*Math.cos(angle);expect(Math.hypot(px,py)).toBeLessThan(radius-.024);
   }
  }
 });
 it('withholds flat-bottom clusters instead of mass-stamping cropped sheet edges; all originals remain installed',()=>{
  const d=fixture(),sprites=forestPilotSprites(d,forestScene(d).crowns);
  expect(forestImageAssets.filter(a=>a.role!=='single')).toHaveLength(2);
  expect(sprites.every(s=>forestImageAssets.find(a=>a.id===s.assetId)?.role==='single')).toBe(true);
 });
 it('uses larger landscape-certified envelopes and suppresses most procedural interior crowns',()=>{
  const d=fixture(),base=forestScene(d),sprites=forestPilotSprites(d,base.crowns),available=forestClearance(d);
  let larger=0;for(const s of sprites){
   expect(s.radius).toBeLessThanOrEqual(available(s)+1e-12);
   const old=base.crowns.find(c=>c.x===s.x&&c.y===s.y)!;if(s.radius>old.radius*1.5)larger++;
  }
  expect(larger/sprites.length).toBeGreaterThan(.5);
  const pilot=forestPilotScene(d,all),ground=pilot.paths.filter(p=>p.opacity===.12),fringe=pilot.paths.filter(p=>p.opacity===.22);
  const count=(paths:typeof ground)=>paths.reduce((n,p)=>n+(p.data.match(/M/g)?.length??0),0);
  expect(count(ground)).toBe(base.crowns.length);expect(count(fringe)).toBeLessThan(base.crowns.length*.4);
 });
 it('certifies larger artwork against water, cultivated land, gathering spaces, rotated buildings, entrances and curved defenses',()=>{
  let d=fixture();d=placeBuilding(d,{x:30,y:30},'longhouse','protected');d.buildings[0]={...d.buildings[0],rotation:90,locked:true};
  d.landscape.cells=Array.from({length:32},(_,i)=>({...legacyTerrain({x:46+i%8,y:40+Math.floor(i/8)}),vegetation:1,ground:'soil' as const}));
  d.planning={version:1,layout:'contextual',centre:{x:35,y:35},workshop:{x:35,y:35},farming:{x:35,y:35},clusters:[],primaryRoutes:[],openSpaces:[{kind:'gathering',cells:[{x:50,y:50},{x:51,y:50}]}]};
  d.roads=[{id:'wall',layerId:'settlement',surface:'palisade',width:.4,style:'organic',editVersion:1,points:[{x:8,y:20},{x:60,y:20},{x:60,y:75}]},{id:'bridge',layerId:'settlement',surface:'wooden-bridge',width:1,editVersion:1,points:[{x:83,y:60},{x:91,y:60}]}];
  const available=forestClearance(d),q=terrainQuery(d),sprites=forestPilotSprites(d,forestScene(d).crowns),context=roadContext(d);
  expect(sprites.length).toBeGreaterThan(100);const invalid=[];
  for(const s of sprites){
   expect(s.radius).toBeLessThanOrEqual(available(s)+1e-12);
   // Sample the entire rotated source rectangle, not just its anchor or opaque centre.
   for(let v=0;v<=4;v++)for(let u=0;u<=4;u++){
    const x=s.left+s.width*u/4,y=s.top+s.height*v/4,p={x:s.x+x*Math.cos(s.angle)-y*Math.sin(s.angle),y:s.y+x*Math.sin(s.angle)+y*Math.cos(s.angle)};
    const t=q.at(p);if(!q.inside(p)||t.vegetation<.35||t.water>.05||t.ground==='soil'||!(p.x<29.7||p.x>32.3||p.y<29.7||p.y>35.3)||!(p.x<30.7||p.x>32.3||p.y<33.8||p.y>35.3))invalid.push({asset:s.assetId,p,t});
   }
  }
  let margin=Infinity;for(const r of d.roads){const g=roadGeometry(d,r,context);for(const p of sampledPath(g.samples,.18))for(const s of sprites)margin=Math.min(margin,Math.hypot(s.x-p.x,s.y-p.y)-s.radius-g.width/2);}
  expect(invalid).toEqual([]);expect(margin).toBeGreaterThan(.11);
 });
 it('falls back only for unavailable images without reassigning anything or editing terrain/buildings/roads',()=>{
  const d=fixture(),base=forestScene(d),planned=forestPilotScene(d,all),id=all[0],partial=forestPilotScene(d,all.filter(a=>a!==id));
  expect(forestPilotScene(d,[])).toBe(base);expect(partial.sprites).toEqual(planned.sprites!.filter(s=>s.assetId!==id));
  expect(partial.crowns).toBe(base.crowns);expect(partial.paths.every(p=>p.layer==='nature')).toBe(true);
  expect(partial.paths.some(p=>p.opacity===1)).toBe(true);expect(planned.paths.some(p=>p.opacity===1)).toBe(false);
  expect(forestPilotScene(d,all.slice(4))).toBe(base);
 });
 it('persists only a default-off browser preference, preserving projects, source geometry and history',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const d=fixture();useStudio.getState().restore(d);const source=useStudio.getState().present,past=useStudio.getState().past;
  useVisualPreferences.getState().change({forestPilot:true,style:'illustrated'});expect(readVisualPreferences(globalThis.localStorage).forestPilot).toBe(true);expect(useStudio.getState().present).toBe(source);expect(useStudio.getState().past).toBe(past);expect(serializeDocument(source)).not.toContain('forestPilot');
  useVisualPreferences.getState().change({forestPilot:false});expect(readVisualPreferences(globalThis.localStorage).forestPilot).toBe(false);
 });
});
function readyImages(){let decodes=0,draws=0;class ReadyImage{
 naturalWidth=0;naturalHeight=0;width=0;height=0;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
 set src(value:string){decodes++;const bytes=Uint8Array.from(atob(value.split(',')[1]),c=>c.charCodeAt(0)),header=new DataView(bytes.buffer);this.width=this.naturalWidth=header.getUint32(16);this.height=this.naturalHeight=header.getUint32(20);queueMicrotask(()=>this.onload?.());}
 }
 vi.stubGlobal('Image',ReadyImage);vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:()=>draws++})})});return()=>({decodes,draws});
}
describe('bounded forest loading, LOD and export',()=>{
 it('loads each source once, builds two same-image caches, reuses surfaces and publishes a single ready set',async()=>{
  const count=readyImages();let loads=0;const store=createForestImageStore(async()=>{loads++;return import('../assets/forests/images');}),notify=vi.fn(),unsubscribe=store.subscribe(notify);
  const state=await store.prepare();expect(await store.prepare()).toBe(state);expect(loads).toBe(1);expect(count()).toEqual({decodes:6,draws:12});expect(state.ready).toEqual(all);expect(state.failed).toEqual([]);expect(notify).toHaveBeenCalledTimes(2);
  for(const v of state.images.values()){expect(forestImageLevel(v,'high')).toBe(v.image);expect(Math.max(v.medium!.width,v.medium!.height)).toBe(256);expect(Math.max(v.distant!.width,v.distant!.height)).toBe(64);expect(forestImageLevel(v,'distant')).toBe(v.distant);}
  unsubscribe();
 });
 it('retains decoded original artwork if cache allocation fails',async()=>{readyImages();vi.stubGlobal('document',{createElement:()=>{throw new Error('Out of memory');}});const state=await createForestImageStore().prepare();expect(state.ready).toHaveLength(6);for(const v of state.images.values())expect(forestImageLevel(v,'distant')).toBe(v.image);});
 it('caches failed pack loads and rejects unsafe image URLs without any image requests',async()=>{
  readyImages();let loads=0;const missing=createForestImageStore(async()=>{loads++;throw new Error('Missing module');});expect((await missing.prepare()).failed).toHaveLength(6);await missing.prepare();expect(loads).toBe(1);
  const state=await createForestImageStore(async()=>({forestImageSources:Object.fromEntries(all.map(id=>[id,'https://bad/tree.png']))})).prepare();expect(state.ready).toEqual([]);expect(state.failed).toEqual(all);
 });
 it('rejects one mismatched image while keeping the other five ready for stable partial fallback',async()=>{
  readyImages();const original=await import('../assets/forests/images'),store=createForestImageStore(async()=>({forestImageSources:{...original.forestImageSources,[all[0]]:original.forestImageSources[all[1]]}}));
  const state=await store.prepare();expect(state.failed).toEqual([all[0]]);expect(state.ready).toEqual(all.slice(1));expect(state.images.has(all[0])).toBe(false);
 });
 it('bounds stalled image decodes and lazy module loading rather than hanging export',async()=>{
  vi.useFakeTimers();class StalledImage{set src(_value:string){}}vi.stubGlobal('Image',StalledImage);
  const a=createForestImageStore(),decode=a.prepare();await vi.advanceTimersByTimeAsync(5100);expect((await decode).failed).toHaveLength(6);
  const module=createForestImageStore(()=>new Promise(()=>{})).prepare();await vi.advanceTimersByTimeAsync(8100);expect((await module).failed).toHaveLength(6);
 });
 it('embeds originals once, shares editor transforms at every export size, and leaves Planning untouched',async()=>{
  readyImages();await forestImages.prepare();const d=fixture(),source=serializeDocument(d),sprites=forestPilotScene(d,all).sprites!;
  for(const resolution of [1024,2048,4096])for(const reduced of [false,true]){
   const svg=mapSvg(d,{style:'illustrated',forestPilot:true,resolution,reduced,labels:false,grid:false});expect(svg).not.toContain('data-forest-fallback');expect(svg).not.toContain('href="http');expect((svg.match(/id="forest-pilot-source-/g)??[]).length).toBe(4);
   const actual=[...svg.matchAll(/<g data-forest-asset="[^"]+" transform="[^"]+"><svg x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+"/g)].map(m=>m[0]);
   expect(actual).toEqual(sprites.map(s=>`<g data-forest-asset="${s.assetId}" transform="translate(${s.x} ${s.y}) rotate(${s.angle*180/Math.PI})"><svg x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}"`));
  }
  const o={style:'planning' as const,resolution:1024,labels:false,grid:false};expect(mapSvg(d,{...o,forestPilot:true})).toBe(mapSvg(d,o));expect(serializeDocument(d)).toBe(source);
 });
});
