import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { createDocument, migrateDocument, type SettlementDocument } from './document';
import { defaultBrush, TerrainStroke, commitTerrain, type BrushSettings } from './terrainStroke';
import { legacyTerrain, terrainQuery } from './terrain';
import { placeBuilding } from './operations';
import { buildingWarnings } from './buildings';
import { infrastructureWarnings, putInfrastructure } from './infrastructure';
import { landCells } from '../generator/navigation';
import { commit,undo,redo } from '../commands/history';
import { parseDocument,serializeDocument } from '../exports/json';
import { mapSvg } from '../exports/png';
import { terrainGeometry } from '../rendering/terrainGeometry';
import { ProjectDatabase,ProjectRepository } from '../persistence/database';
import { Autosave } from '../persistence/autosave';
const brush=(patch:Partial<BrushSettings>={}):BrushSettings=>({...defaultBrush,size:3,shape:'square',strength:1,...patch});
function stroke(doc:SettlementDocument,patch:Partial<BrushSettings>,points=[{x:20.5,y:20.5}]){const s=new TerrainStroke(doc,brush(patch));for(const p of points)s.add(p);return s.preview();}
const apply=(doc:SettlementDocument,patch:Partial<BrushSettings>,points?:{x:number;y:number}[])=>commitTerrain(doc,stroke(doc,patch,points));
const height=(doc:SettlementDocument,x=20,y=20)=>terrainQuery(doc).at({x,y}).elevation;
describe('independent landscape layers and migrations',()=>{
  it('preserves the exact legacy meanings of grass, water, forest and stone',()=>{
    const {landscape:_,...base}=createDocument(),old={...base,version:2,terrain:['grass','water','forest','stone'].map((kind,x)=>({x,y:3,kind}))},doc=migrateDocument(old),q=terrainQuery(doc);
    expect(doc.version).toBe(3);expect(doc.terrain).toEqual(old.terrain);expect(q.walkable({x:0,y:3})).toBe(true);expect(q.water({x:1,y:3})).toBe(true);expect(q.woodland({x:2,y:3})).toBe(true);for(const x of [1,2,3])expect(q.buildable({x,y:3})).toBe(false);
    expect(parseDocument(JSON.stringify(old))).toEqual(doc);expect(migrateDocument(doc)).toEqual(doc);
  });
  it('keeps ground, elevation, water and vegetation independent, including clearing',()=>{
    let doc=apply(createDocument(),{brush:'soil'});doc=apply(doc,{brush:'raise',strength:.25});doc=apply(doc,{brush:'forest'});expect(terrainQuery(doc).at({x:20,y:20})).toMatchObject({ground:'soil',elevation:1,vegetation:1,water:0});
    doc=apply(doc,{brush:'clear-forest'});expect(terrainQuery(doc).at({x:20,y:20})).toMatchObject({ground:'soil',elevation:1,vegetation:0});
    doc=apply(doc,{brush:'water'});doc=apply(doc,{brush:'land'});expect(terrainQuery(doc).at({x:20,y:20})).toMatchObject({ground:'soil',elevation:1,water:0});
  });
  it('restores the original generated terrain without altering its legacy records',()=>{
    const doc={...createDocument(),terrain:[{x:20,y:20,kind:'forest' as const}]},cleared=apply(doc,{brush:'clear-forest'}),restored=apply(cleared,{brush:'restore'});expect(restored.landscape.cells).toEqual([]);expect(restored.terrain).toBe(doc.terrain);expect(terrainQuery(restored).woodland({x:20,y:20})).toBe(true);
  });
  it('round trips complete landscape JSON and rejects malformed layers, bounds and unsupported versions',()=>{
    const doc=apply(apply(createDocument(),{brush:'water'}),{brush:'raise'});expect(parseDocument(serializeDocument(doc))).toEqual(doc);
    for(const patch of [{elevation:33},{elevation:-17},{water:2},{vegetation:NaN},{rocks:-1},{ground:'lava'},{x:192}])expect(()=>parseDocument(JSON.stringify({...doc,landscape:{...doc.landscape,cells:[{...doc.landscape.cells[0],...patch}]}}))).toThrow();
    expect(()=>parseDocument(JSON.stringify({...doc,landscape:{...doc.landscape,version:2}}))).toThrow();expect(()=>parseDocument(JSON.stringify({...doc,landscape:{...doc.landscape,cells:[doc.landscape.cells[0],doc.landscape.cells[0]]}}))).toThrow('duplicate');
  });
});
describe('sculpting and stroke transactions',()=>{
  it('raises, lowers and clamps the metre heightmap to -16…32',()=>{let doc=createDocument();for(let i=0;i<6;i++)doc=apply(doc,{brush:'ridge'});expect(height(doc)).toBe(32);for(let i=0;i<8;i++)doc=apply(doc,{brush:'valley'});expect(height(doc)).toBe(-16);doc=apply(doc,{brush:'raise',strength:.5});expect(height(doc)).toBe(-14);});
  it('flattens an exact pad and smooths from immutable surrounding heights',()=>{
    const hill=apply(createDocument(),{brush:'raise'}),flat=apply(hill,{brush:'flatten',elevation:2});expect(height(flat)).toBe(2);
    const spike={...createDocument(),landscape:{...createDocument().landscape,cells:[{...legacyTerrain({x:20,y:20}),elevation:9}]}},smoothed=apply(spike,{brush:'smooth',size:1});expect(height(smoothed)).toBe(1);expect(height(spike)).toBe(9);
  });
  it('samples without changing data and paints a one-tile brush even when tapped near a corner',()=>{
    const doc=apply(createDocument(),{brush:'raise'}),sample=stroke(doc,{brush:'sample',size:1},[{x:20.01,y:20.01}]);expect(sample.changes).toEqual([]);expect(commitTerrain(doc,sample)).toBe(doc);
    const single=stroke(createDocument(),{brush:'water',size:1,shape:'circle'},[{x:20.01,y:20.01}]);expect(single.changes).toHaveLength(1);expect(single.changes[0]).toMatchObject({x:20,y:20,water:1});
  });
  it('uses bounded square/circular brushes and strength with soft edges',()=>{
    const doc=createDocument(),square=stroke(doc,{size:5}),circle=stroke(doc,{size:5,shape:'circle'});expect(square.changes).toHaveLength(25);expect(circle.changes.length).toBeLessThan(25);expect(circle.changes.find(c=>c.x===20&&c.y===20)?.elevation).toBe(4);expect(circle.changes.find(c=>c.x===22&&c.y===20)!.elevation).toBeLessThan(4);
    const edge=stroke(doc,{size:9},[{x:0,y:0}]);expect(edge.changes.every(c=>c.x>=0&&c.y>=0&&c.x<96&&c.y<96)).toBe(true);expect(()=>new TerrainStroke(doc,brush({strength:NaN}))).toThrow();
  });
  it('interpolates long pointer jumps without holes and is independent of repeated events',()=>{
    const doc=createDocument(),s=new TerrainStroke(doc,brush({brush:'water',size:3}));s.add({x:10.5,y:10.5});s.add({x:60.5,y:10.5});const before=s.preview();for(let i=0;i<20;i++)s.add({x:60.5,y:10.5});expect(s.preview().changes).toEqual(before.changes);const result=commitTerrain(doc,before);for(let x=10;x<=60;x++)expect(terrainQuery(result).water({x,y:10})).toBe(true);
  });
  it('does not mutate the document before commit, groups the complete stroke into one history entry, and rejects stale previews',()=>{
    const doc=createDocument(),before=JSON.stringify(doc),preview=stroke(doc,{brush:'raise'},[{x:10.5,y:10.5},{x:25.5,y:15.5}]);expect(JSON.stringify(doc)).toBe(before);expect(doc.landscape.cells).toEqual([]);
    const h=commit({present:doc,past:[],future:[]},commitTerrain(doc,preview));expect(h.past).toHaveLength(1);expect(undo(h).present).toBe(doc);expect(redo(undo(h)).present).toBe(h.present);expect(()=>commitTerrain({...doc,name:'New edit'},preview)).toThrow('changed');
  });
  it.each(['grass','dirt','sand','rock','soil'] as const)('paints %s as ground without creating water or vegetation',ground=>{const doc=apply(createDocument(),{brush:ground});expect(terrainQuery(doc).at({x:20,y:20})).toMatchObject({ground,vegetation:0,water:0,elevation:0});});
  it('adds and clears rocky details separately from rocky ground',()=>{let doc=apply(createDocument(),{brush:'rock'});expect(terrainQuery(doc).walkable({x:20,y:20})).toBe(true);doc=apply(doc,{brush:'boulders'});expect(terrainQuery(doc).walkable({x:20,y:20})).toBe(false);doc=apply(doc,{brush:'clear-rocks'});expect(terrainQuery(doc).at({x:20,y:20})).toMatchObject({ground:'rock',rocks:0});});
});
describe('structure safety and shared navigation',()=>{
  it('previews affected building IDs and applies only unaffected cells without moving/removing anything',()=>{
    const doc=placeBuilding(createDocument(),{x:20,y:20},'cottage','home'),preview=stroke(doc,{brush:'water',size:9});expect(preview.conflicts.some(c=>c.id==='home')).toBe(true);expect(()=>commitTerrain(doc,preview)).toThrow('Review');expect(doc.landscape.cells).toEqual([]);
    const safe=commitTerrain(doc,preview,true);expect(safe.buildings).toBe(doc.buildings);expect(safe.roads).toBe(doc.roads);expect(buildingWarnings(safe,safe.buildings[0])).toEqual([]);expect(safe.landscape.cells.length).toBeLessThan(preview.changes.length);expect(safe.landscape.cells.length).toBeGreaterThan(0);
  });
  it('protects entrance approach heights and actual curved path footprints',()=>{
    const doc=placeBuilding(createDocument(),{x:20,y:20},'cottage','home'),entry={x:21,y:22},p=stroke(doc,{brush:'ridge',size:1},[{x:21.5,y:23.5}]);expect(p.conflicts.some(c=>c.id==='home')).toBe(true);expect(terrainQuery(commitTerrain(doc,p,true)).walkable(entry)).toBe(true);
    const road=putInfrastructure(createDocument(),{id:'curve',layerId:'settlement',points:[{x:10,y:10},{x:50,y:10},{x:50,y:50}],style:'organic',editVersion:1,width:.4});const changed=stroke(road,{brush:'water',size:1},[{x:47.5,y:13.5}]);expect(changed.conflicts.some(c=>c.id==='curve')).toBe(true);
  });
  it('keeps one-tile diagonal water strokes cardinally connected',()=>{
    const doc=apply(createDocument(),{brush:'water',size:1,shape:'circle'},[{x:10.5,y:10.5},{x:30.5,y:30.5}]),remaining=new Set(doc.landscape.cells.map(c=>`${c.x},${c.y}`)),queue=[remaining.values().next().value!];remaining.delete(queue[0]);for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const key of [`${x+1},${y}`,`${x-1},${y}`,`${x},${y+1}`,`${x},${y-1}`])if(remaining.delete(key))queue.push(key);}expect(remaining.size).toBe(0);
  });
  it('protects roads and locked defenses, including harmless materials beneath locked objects',()=>{
    const doc=putInfrastructure(createDocument(),{id:'road',layerId:'settlement',points:[{x:15,y:20},{x:25,y:20}],width:1,editVersion:1}),fence=putInfrastructure(doc,{id:'fence',layerId:'settlement',points:[{x:17,y:18},{x:25,y:18}],surface:'fence',locked:true,editVersion:1});
    const water=stroke(fence,{brush:'water',size:15}),safe=commitTerrain(fence,water,true);expect(water.conflicts.map(c=>c.id)).toEqual(expect.arrayContaining(['road','fence']));for(const r of safe.roads)expect(infrastructureWarnings(safe,r)).toEqual([]);expect(stroke(fence,{brush:'soil',size:15}).conflicts.find(c=>c.id==='fence')?.locked).toBe(true);
  });
  it('widens waterways while preserving bridge water, banks and bank heights',()=>{
    const river={...createDocument(),terrain:Array.from({length:96*3},(_,i)=>({x:20+i%3,y:Math.floor(i/3),kind:'water' as const}))},doc=putInfrastructure(river,{id:'bridge',surface:'wooden-bridge',editVersion:1,layerId:'settlement',width:1,points:[{x:18,y:20},{x:24,y:20}]});
    for(const brush of ['water','land','ridge'] as const){const p=stroke(doc,{brush,size:15}),safe=commitTerrain(doc,p,true);expect(p.conflicts.some(c=>c.id==='bridge')).toBe(true);expect(infrastructureWarnings(safe,safe.roads[0])).toEqual([]);expect(safe.roads).toBe(doc.roads);expect(terrainQuery(safe).at({x:18,y:20}).elevation).toBe(0);}
  });
  it('updates pathfinding, building checks and manual road checks consistently for water and cliffs',()=>{
    const wet=apply(createDocument(),{brush:'water'});expect(landCells(wet).has('20,20')).toBe(false);const road={id:'bad',layerId:'settlement',points:[{x:15,y:20},{x:25,y:20}]};expect(infrastructureWarnings(wet,road).join()).toContain('bridge');
    const high=apply(createDocument(),{brush:'ridge'});expect(terrainQuery(high).walkable({x:21,y:20})).toBe(false);expect(infrastructureWarnings(high,road).join()).toContain('slope');const built=placeBuilding(high,{x:21,y:20},'watchtower','tower');expect(buildingWarnings(built,built.buildings[0]).length).toBeGreaterThan(0);
  });
});
describe('landscape persistence and rendering',()=>{
  it('autosaves and reopens terrain, isolates projects and restores full snapshots',async()=>{
    const db=new ProjectDatabase(`terrain-${crypto.randomUUID()}`),repo=new ProjectRepository(db);try{const a=await repo.create(createDocument()),b=await repo.create(createDocument()),doc=apply(a.document,{brush:'soil'}),saver=new Autosave(0,(d,r)=>repo.save(d,r),()=>{},0);saver.schedule(doc);await saver.flush();const snap=await repo.snapshot(doc.id,'Landscape');await repo.save(apply(doc,{brush:'water'}),1);db.close();await db.open();expect(terrainQuery((await repo.load(doc.id)).document).water({x:20,y:20})).toBe(true);expect((await repo.load(b.document.id)).document.landscape.cells).toEqual([]);expect((await repo.restore(doc.id,snap.id,2)).document).toEqual(doc);saver.dispose();}finally{await db.delete();}
  });
  it('blocks project transitions while a destructive terrain preview is unresolved',async()=>{
    const {useStudio}=await import('../ui/store'),{projectSession}=await import('../persistence/session'),doc=placeBuilding(createDocument(),{x:20,y:20},'cottage','home'),preview=stroke(doc,{brush:'water',size:9});useStudio.getState().restore(doc);useStudio.getState().setTerrainEditor({pending:preview});
    try{await expect(projectSession.create()).rejects.toThrow('Apply or cancel');await expect(projectSession.restore('snapshot')).rejects.toThrow('preview');expect(useStudio.getState().present).toEqual(migrateDocument(doc));expect(useStudio.getState().terrainEditor.pending).toBe(preview);}finally{useStudio.getState().setTerrainEditor({pending:null});}
  });
  it('loads and restores v2 database documents and snapshots without rewriting legacy geometry or terrain',async()=>{
    const db=new ProjectDatabase(`legacy-terrain-${crypto.randomUUID()}`),repo=new ProjectRepository(db);
    try{const original=placeBuilding(createDocument(),{x:20,y:20},'cottage','old-home');original.roads=[{id:'old-road',layerId:'settlement',points:[{x:20,y:23},{x:30,y:23}]}];original.terrain=[{x:1,y:1,kind:'forest'}];const {landscape:_,...old}=original,legacy={...old,version:2};
      await db.projects.add({id:legacy.id,name:legacy.name,revision:0,updatedAt:0});await db.documents.add(legacy as unknown as SettlementDocument);await db.snapshots.add({id:'old-snapshot',projectId:legacy.id,name:'Old map',createdAt:0,document:legacy as unknown as SettlementDocument});
      const loaded=await repo.load(legacy.id);expect(loaded.document.version).toBe(3);expect(loaded.document.landscape.cells).toEqual([]);expect(loaded.document.buildings).toEqual(original.buildings);expect(loaded.document.roads).toEqual(original.roads);expect((await db.documents.get(legacy.id))?.version).toBe(2);
      await repo.save(apply(loaded.document,{brush:'soil'},[{x:40.5,y:40.5}]),0);const restored=await repo.restore(legacy.id,'old-snapshot',1);expect(restored.document).toEqual(loaded.document);expect((await repo.snapshotsFor(legacy.id)).find(s=>s.name.startsWith('Automatic'))?.document.landscape.cells.length).toBeGreaterThan(0);
    }finally{await db.delete();}
  });
  it('renders shared full-map ground, vegetation, water, contours and cliffs with clean-planning options',()=>{
    let doc=apply(createDocument(),{brush:'ridge'});doc=apply(doc,{brush:'water'},[{x:40.5,y:40.5}]);doc=apply(doc,{brush:'soil'},[{x:50.5,y:50.5}]);doc=apply(doc,{brush:'forest'},[{x:60.5,y:60.5}]);const scene=terrainGeometry(doc),svg=mapSvg(doc,{resolution:2048,grid:false,labels:false});for(const t of scene)expect(svg).toContain(t.data);for(const color of ['#355d69','#294c3e','#66523b','#c1ac7b','#e7d6a2'])expect(svg).toContain(color);const clean=mapSvg(doc,{resolution:2048,grid:false,labels:false,contours:false,detail:false});expect(clean).not.toContain('#e7d6a2');expect(clean.length).toBeLessThan(svg.length);expect(terrainGeometry(doc)).toEqual(scene);
  });
  it.each([96,192])('benchmarks incremental strokes and full-map rendering at %s²',size=>{
    let doc=createDocument();doc={...doc,grid:{...doc.grid,width:size,height:size}};for(let i=0;i<35;i++)doc=placeBuilding(doc,{x:5+i%7*6,y:5+Math.floor(i/7)*6},'cottage',`b${i}`);
    const begin=performance.now(),s=new TerrainStroke(doc,brush({size:9})),prepared=performance.now(),times:number[]=[];for(let i=0;i<100;i++){const start=performance.now();s.add({x:10+i*(size-20)/100,y:size*.7+Math.sin(i/8)*7});times.push(performance.now()-start);}const preview=s.preview(),end=performance.now(),result=commitTerrain(doc,preview,true),renderStart=performance.now(),scene=terrainGeometry(result),renderEnd=performance.now();times.sort((a,b)=>a-b);
    console.info(`Terrain benchmark ${size}²: prepare ${(prepared-begin).toFixed(1)}ms; dab p50 ${times[50].toFixed(2)}ms p95 ${times[95].toFixed(2)}ms; stroke+review ${(end-begin).toFixed(1)}ms; scene ${(renderEnd-renderStart).toFixed(1)}ms; ${scene.length} paths / ${preview.changes.length} cells`);expect(result.buildings).toBe(doc.buildings);expect(preview.changes.length).toBeGreaterThan(100);expect(scene.length).toBeLessThan(200);
  });
});
