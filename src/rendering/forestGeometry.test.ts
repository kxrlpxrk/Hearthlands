import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {generateTerrain} from '../generator/terrain';
import {defaultSettings} from '../generator/settings';
import {createDocument,type SettlementDocument} from '../model/document';
import {legacyTerrain,terrainQuery} from '../model/terrain';
import {placeBuilding} from '../model/operations';
import {updateBuilding} from '../model/buildings';
import {nativeTerrainChunks,terrainChunkVisible,visibleTerrainPath} from './nativeTerrain';
import {vi} from 'vitest';
import {forestCrowns,forestScene} from './forestGeometry';
import {forestArt,resolveForestArt} from './forestArt';
import {terrainScene} from './scene';
import {roadContext,roadGeometry} from './roadGeometry';
import {mapSvg} from '../exports/png';
import {parseDocument,serializeDocument} from '../exports/json';
import {ProjectDatabase,ProjectRepository} from '../persistence/database';
import {commit,undo,redo} from '../commands/history';
function fixture(size=32):SettlementDocument{
 const d=createDocument();d.grid={...d.grid,width:size,height:size};
 d.terrain=Array.from({length:size*size},(_,i)=>({x:i%size,y:Math.floor(i/size),kind:i%size>size-5?'water':'forest'}));
 d.landscape.cells=[{...legacyTerrain({x:12,y:12}),ground:'soil',vegetation:1},{...legacyTerrain({x:16,y:16}),vegetation:0}];
 let doc=placeBuilding(d,{x:8.25,y:8.25},'longhouse','home');doc=updateBuilding(doc,'home',{rotation:90,locked:true});
 doc.roads=[{id:'curve',layerId:'settlement',surface:'dirt',style:'organic',editVersion:1,width:.7,points:[{x:3,y:5},{x:20,y:5},{x:20,y:25}]},{id:'wall',surface:'palisade',layerId:'settlement',width:.45,editVersion:1,points:[{x:3,y:23},{x:16,y:23}]}];
 doc.planning={version:1,layout:'organic',centre:{x:5,y:20},workshop:{x:5,y:20},farming:{x:5,y:20},clusters:[],primaryRoutes:[],openSpaces:[{kind:'field',cells:[{x:6,y:20},{x:7,y:20}]}]};
 return doc;
}
const rectangleDistance=(p:{x:number;y:number},x:number,y:number,w=1,h=1)=>Math.hypot(Math.max(x-p.x,0,p.x-x-w),Math.max(y-p.y,0,p.y-y-h));
describe('deterministic illustrated forest layout',()=>{
 it('repeats geometry after JSON round trips, duplication and unrelated project changes without editing source data',()=>{
  const d=fixture(),before=serializeDocument(d),first=forestCrowns(d);
  expect(first.length).toBeGreaterThan(150);
  for(const copy of [parseDocument(before),{...structuredClone(d),id:'duplicate',name:'Copy',districts:[]}])expect(forestCrowns(copy)).toEqual(first);
  expect(forestCrowns({...d,seed:d.seed+1})).not.toEqual(first);
  expect(serializeDocument(d)).toBe(before);
 });
 it('mixes crown shapes, sizes, tones and density, with smaller sparse boundary crowns',()=>{
  const crowns=forestCrowns(fixture()),interior=crowns.filter(c=>c.density==='interior'),fringe=crowns.filter(c=>c.density==='fringe');
  expect(new Set(crowns.map(c=>c.species)).size).toBe(4);expect(new Set(crowns.map(c=>c.tone)).size).toBe(4);
  expect(interior.length).toBeGreaterThan(50);expect(fringe.length).toBeGreaterThan(20);
  const average=(v:typeof crowns)=>v.reduce((n,c)=>n+c.radius,0)/v.length;
  expect(average(interior)).toBeGreaterThan(average(fringe)*2);
  expect(new Set(crowns.map(c=>Math.round(c.radius*100))).size).toBeGreaterThan(35);
 });
 it('keeps the whole crown envelope inside woodland, map edges and dry uncultivated terrain, retaining clearings',()=>{
  const d=fixture(),q=terrainQuery(d),crowns=forestCrowns(d);
  for(const c of crowns){
   expect(c.x-c.radius).toBeGreaterThanOrEqual(0);expect(c.y-c.radius).toBeGreaterThanOrEqual(0);
   expect(c.x+c.radius).toBeLessThanOrEqual(d.grid.width);expect(c.y+c.radius).toBeLessThanOrEqual(d.grid.height);
   for(let y=Math.floor(c.y-c.radius);y<=Math.floor(c.y+c.radius);y++)for(let x=Math.floor(c.x-c.radius);x<=Math.floor(c.x+c.radius);x++){
    const t=q.at({x,y});if(t.water>.05||t.vegetation<.35||t.ground==='soil')expect(rectangleDistance(c,x,y)).toBeGreaterThanOrEqual(c.radius);
   }
   for(const p of d.planning!.openSpaces[0].cells)expect(rectangleDistance(c,p.x,p.y)).toBeGreaterThanOrEqual(c.radius);
  }
 });
 it('clears rotated/locked footprints, entrances and full rendered curved roads, bridges and defenses',()=>{
  const d=fixture();d.roads.push({id:'bridge',layerId:'settlement',surface:'wooden-bridge',width:1,editVersion:1,points:[{x:22,y:17},{x:30,y:17}]});
  const context=roadContext(d),roads=d.roads.map(r=>roadGeometry(d,r,context));
  for(const c of forestCrowns(d)){
   expect(rectangleDistance(c,8.25,8.25,2,4)).toBeGreaterThan(c.radius+.2);
   expect(rectangleDistance(c,9.25,12.25)).toBeGreaterThan(c.radius);
   for(const g of roads)for(const p of g.samples)expect(Math.hypot(c.x-p.x,c.y-p.y)).toBeGreaterThan(c.radius+g.width/2+.11);
  }
 });
 it('follows partial vegetation, tiny patches and irregular shorelines without creating crowns over water',()=>{
  const d=createDocument();d.grid={...d.grid,width:24,height:24};d.landscape.cells=[];
  for(let y=1;y<23;y++)for(let x=1;x<23;x++)d.landscape.cells.push({...legacyTerrain({x,y}),vegetation:x<10+Math.sin(y)*3?(x%3?.8:.45):0,water:x>=11+Math.sin(y)*3?1:0});
  const q=terrainQuery(d),crowns=forestCrowns(d);expect(crowns.length).toBeGreaterThan(20);
  expect(crowns.every(c=>q.at(c).vegetation>=.35&&!q.water(c))).toBe(true);
  expect(forestCrowns(createDocument())).toEqual([]);
 });
 it.each([0,1847,52993])('keeps seeded woodland masks unchanged across forest/river/coastal environments (seed %s)',seed=>{
  for(const environment of ['forest','river','coastal'] as const){
   const d=generateTerrain({...defaultSettings,environment,seed,required:{longhouse:1,sawmill:1}}),bytes=serializeDocument(d),a=forestCrowns(d),q=terrainQuery(d);
   expect(a.length).toBeGreaterThan(20);expect(forestCrowns(parseDocument(bytes))).toEqual(a);
   expect(a.every(c=>q.at(c).vegetation>=.35&&!q.water(c))).toBe(true);expect(serializeDocument(d)).toBe(bytes);
  }
 });
});
describe('forest presentation, cache and persistence integration',()=>{
 it('keeps identical coloured silhouettes at all zoom/detail levels and uses the same paths for full-map SVG/PNG',()=>{
  const d=fixture(),scene=forestScene(d),full=terrainScene(d,{style:'illustrated',detail:true,contours:true}),low=terrainScene(d,{style:'illustrated',detail:true,contours:true,reduced:true}),clean=terrainScene(d,{style:'illustrated',detail:false,contours:false});
  for(const p of scene.paths){expect(full).toContain(p);expect(low).toContain(p);expect(clean).toContain(p);}
  for(const reduced of [false,true])for(const resolution of [1024,2048,4096]){
   const svg=mapSvg(d,{style:'illustrated',resolution,reduced,grid:false,labels:false});
   for(const p of scene.paths){expect(svg).toContain(p.data);expect(svg).toContain(p.fill);}
  }
  for(const p of scene.detail){expect(full).toContain(p);expect(low).not.toContain(p);}
  const planning=mapSvg(d,{style:'planning',resolution:1024,grid:false,labels:false});for(const p of scene.paths)expect(planning).not.toContain(p.data);
 });
 it('reuses layouts through camera/detail and metadata changes; invalidates after terrain, roads, buildings and fields change',()=>{
  const d=fixture(),scene=forestScene(d),options={style:'illustrated' as const,detail:true,contours:true},paths=terrainScene(d,options);
  expect(forestScene({...d,name:'Rename',grid:{...d.grid,visible:false}})).toBe(scene);
  terrainScene(d,{...options,reduced:true});expect(forestScene(d)).toBe(scene);
  const moved={...d,buildings:d.buildings.map(b=>({...b,x:14}))};
  expect(forestScene(moved)).not.toBe(scene);expect(terrainScene(moved,options)).not.toBe(paths);
  expect(forestScene({...d,roads:[]})).not.toEqual(scene);
  expect(forestScene({...d,landscape:{...d.landscape,cells:[]}})).not.toEqual(scene);
  expect(forestScene({...d,planning:{...d.planning!,openSpaces:[]}})).not.toEqual(scene);
 });
 it('preserves crowns across history, autosaved reopening, snapshot restore and project duplication',async()=>{
  const db=new ProjectDatabase(`forest-${crypto.randomUUID()}`),repo=new ProjectRepository(db);
  try{
   const record=await repo.create(fixture()),doc=record.document,before=forestScene(doc).crowns,snap=await repo.snapshot(doc.id,'Forest baseline');
   const edited={...doc,landscape:{...doc.landscape,cells:[...doc.landscape.cells,{...legacyTerrain({x:4,y:4}),vegetation:0}]}};
   const h=commit({present:doc,past:[],future:[]},edited);expect(forestScene(undo(h).present).crowns).toEqual(before);expect(forestScene(redo(undo(h)).present).crowns).toEqual(forestScene(edited).crowns);
   await repo.save(edited,0);db.close();await db.open();expect(forestScene((await repo.load(doc.id)).document).crowns).toEqual(forestScene(edited).crowns);
   expect(forestScene((await repo.restore(doc.id,snap.id,1)).document).crowns).toEqual(before);
   const duplicate=await repo.create({...doc,id:'copy',name:'Copy'});expect(forestScene(duplicate.document).crowns).toEqual(before);
  }finally{db.close();await db.delete();}
 });
 it('culls only off-screen chunks and parses spatial paths once without allocating during pan',()=>{
  const b={x:16,y:16,width:16,height:16},identity={a:1,b:0,c:0,d:1,e:0,f:0};
  expect(terrainChunkVisible(b,identity,10,10)).toBe(false);
  expect(terrainChunkVisible(b,{...identity,e:-20,f:-20},10,10)).toBe(true);
  expect(terrainChunkVisible(b,{a:0,b:1,c:-1,d:0,e:32,f:-16},20,20)).toBe(true);
  let parses=0;class NativePath{constructor(public data?:string){parses++;}addPath(_p:unknown){}}
  vi.stubGlobal('Path2D',NativePath);
  try{const p=forestScene(fixture()).paths[0],chunks=nativeTerrainChunks(p);expect(chunks!.length).toBeGreaterThan(1);expect(p.chunks!.reduce((n,c)=>n+(c.data.match(/M/g)?.length??0),0)).toBe(p.data.match(/M/g)!.length);const count=parses;expect(nativeTerrainChunks(p)).toBe(chunks);expect(parses).toBe(count);
   const a=visibleTerrainPath(p,chunks!,identity,10,10),after=parses;expect(visibleTerrainPath(p,chunks!,{...identity,e:.1},10,10)).toBe(a);expect(parses).toBe(after);
   expect(visibleTerrainPath(p,chunks!,{...identity,e:-1000},10,10)).toBeNull();
   for(const c of p.chunks!){expect(p.data).toContain(c.data.split('Z')[0]+'Z');expect(c.bounds.width).toBe(18.7);}
  }finally{vi.unstubAllGlobals();}
 });
 it('defines local asset-ready species and cluster roles without installing images or storing visual metadata',()=>{
  expect(new Set(forestArt.map(a=>a.id)).size).toBe(6);
  for(const role of ['beech','birch','oak','pine','mixed-cluster','forest-edge'])expect(forestArt.some(a=>a.role===role)).toBe(true);
  for(const species of ['beech','birch','oak','pine'] as const){const a=resolveForestArt(species);expect(a.source.kind).toBe('procedural');expect(a.anchor).toEqual({x:.5,y:.5});expect(a.nominalDiameter).toBe(2);}
 });
 it.each([96,128,192])('benchmarks forest-heavy %s² maps with 100 protected buildings and bounded batched paths',size=>{
  const d=fixture(size);d.roads=[];d.buildings=Array.from({length:100},(_,i)=>({...d.buildings[0],id:`b${i}`,x:5+i%10*5,y:5+Math.floor(i/10)*5}));
  const bytes=serializeDocument(d),start=performance.now(),scene=forestScene(d),built=performance.now();
  for(let i=0;i<50;i++)expect(forestScene(d)).toBe(scene);
  const paths=terrainScene(d,{style:'illustrated',detail:true,contours:true});
  console.info(`Forest ${size}²/100: ${(built-start).toFixed(1)}ms cold; ${(performance.now()-built).toFixed(1)}ms scene+50 layout hits; ${scene.crowns.length} crowns / ${paths.length} Konva batches`);
  expect(scene.crowns.length).toBeLessThan(size*size*1.8);expect(scene.crowns.length).toBeGreaterThan(100);expect(paths.length).toBeLessThan(80);expect(serializeDocument(d)).toBe(bytes);
 },10000);
});
