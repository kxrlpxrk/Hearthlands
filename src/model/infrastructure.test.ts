import 'fake-indexeddb/auto';
import { describe,it,expect } from 'vitest';
import { createDocument, migrateDocument, type Road } from './document';
import { closestSegment, connectionProposal, deleteInfrastructure, deleteSegment, infrastructureWarnings, putInfrastructure, snapConnection, surfaces } from './infrastructure';
import { placeBuilding, resizeGrid } from './operations';
import { updateBuilding } from './buildings';
import { commit,undo,redo } from '../commands/history';
import { parseDocument,serializeDocument } from '../exports/json';
import { mapSvg } from '../exports/png';
import { roadGeometry } from '../rendering/roadGeometry';
import { ProjectDatabase,ProjectRepository } from '../persistence/database';
import { Autosave } from '../persistence/autosave';
import { generateSettlement } from '../generator/generate';
import { defaultSettings } from '../generator/settings';
const path=(patch:Partial<Road>={}):Road=>({id:'manual',layerId:'settlement',points:[{x:4,y:5},{x:10,y:5},{x:13,y:9}],editVersion:1,surface:'dirt',style:'organic',width:.4,...patch});
const river=()=>({...createDocument(),terrain:Array.from({length:96*3},(_,i)=>({x:10+i%3,y:Math.floor(i/3),kind:'water' as const}))});
describe('editable infrastructure',()=>{
  it('draws, reshapes, adds and removes control points without mutating source data',()=>{
    const doc=createDocument(),r=path(),a=putInfrastructure(doc,r),hit=closestSegment(r,{x:7,y:5});expect(doc.roads).toEqual([]);
    const points=[r.points[0],hit.point,...r.points.slice(1)],b=putInfrastructure(a,{...r,points});expect(b.roads[0].points).toHaveLength(4);expect(a.roads[0].points).toHaveLength(3);
    const c=putInfrastructure(b,{...r,points:points.filter((_,i)=>i!==1)});expect(c.roads).toEqual(a.roads);
  });
  it('snaps to segment interiors and preserves exact connected endpoints',()=>{
    const doc=putInfrastructure(createDocument(),path()),p=snapConnection(doc,{x:7.25,y:5.5});expect(p).toEqual({x:7.25,y:5});
    const a=putInfrastructure(doc,path({id:'spur',points:[{x:7.25,y:9},p]}));expect(roadGeometry(a,a.roads[1]).samples.at(-1)).toEqual({x:7.75,y:5.5});
  });
  it('pins curved path joins and snaps gates to defensive segments',()=>{
    const doc=putInfrastructure(createDocument(),path()),joined=putInfrastructure(doc,path({id:'spur',points:[{x:9,y:9},{x:9,y:5}]}));
    expect(roadGeometry(joined,joined.roads[0]).data).not.toContain('Q');
    const crossing=putInfrastructure(doc,path({id:'crossing',points:[{x:9,y:9},{x:9,y:5},{x:14,y:2}]}));expect(roadGeometry(crossing,crossing.roads[0]).data).not.toContain('Q');expect(roadGeometry(crossing,crossing.roads[1]).data).not.toContain('Q');
    const walls=putInfrastructure(doc,path({id:'wall',surface:'wall',points:[{x:2,y:20},{x:20,y:20}]}));expect(snapConnection(walls,{x:8,y:20.5},undefined,true)).toEqual({x:8,y:20});
  });
  it('keeps drafts out of persistent state and preserves them through explicit camera mode',async()=>{
    const {useStudio}=await import('../ui/store');const s=useStudio.getState();s.restore(createDocument());s.setTool('infrastructure');const before=useStudio.getState().present;
    s.setInfrastructure({draft:[{x:3,y:4},{x:5,y:4}]});s.setTool('pan');expect(useStudio.getState().infrastructure.draft).toHaveLength(2);expect(useStudio.getState().present).toBe(before);expect(useStudio.getState().past).toEqual([]);
    s.setInfrastructure({roadId:'selected'});s.setTool('select');expect(useStudio.getState().infrastructure.roadId).toBeNull();s.restore({...before,id:'another'});expect(useStudio.getState().infrastructure.draft).toEqual([]);expect(useStudio.getState().infrastructure.roadId).toBeNull();
  });
  it('cuts one segment into independent paths without changing unrelated roads',()=>{
    const a=putInfrastructure(putInfrastructure(createDocument(),path({points:[{x:2,y:2},{x:5,y:2},{x:8,y:2},{x:12,y:2}]})),path({id:'other'}));
    const b=deleteSegment(a,'manual',1,'split');expect(b.roads.map(r=>r.id)).toEqual(['manual','split','other']);expect(b.roads[0].points).toHaveLength(2);expect(b.roads[1].points).toHaveLength(2);expect(b.roads[2]).toBe(a.roads[1]);
  });
  it.each(['wooden-bridge','stone-bridge'] as const)('validates %s banks, water and footprints without changing the waterway',surface=>{
    const doc=river(),r=path({surface,points:[{x:8,y:20},{x:14,y:23}],width:1});expect(infrastructureWarnings(doc,r)).toEqual([]);expect(putInfrastructure(doc,r).terrain).toBe(doc.terrain);
    expect(infrastructureWarnings(doc,{...r,points:[{x:10,y:20},{x:14,y:20}]}).join()).toContain('endpoints');expect(infrastructureWarnings(createDocument(),r).join()).toContain('must cross water');
    const island={...doc,terrain:doc.terrain.filter(t=>t.x!==11)};expect(infrastructureWarnings(island,r).join()).toContain('continuous');
  });
  it('rejects water, buildings, impassable terrain, unsafe widths and out-of-map paths',()=>{
    expect(()=>putInfrastructure(river(),path({points:[{x:8,y:20},{x:14,y:20}]}))).toThrow('bridge');
    const b=placeBuilding(createDocument(),{x:7,y:4},'cottage','home');expect(()=>putInfrastructure(b,path())).toThrow('footprint');
    expect(()=>putInfrastructure(createDocument(),path({width:NaN}))).toThrow('width');expect(()=>putInfrastructure(createDocument(),path({points:[{x:-1,y:0},{x:1,y:1}]}))).toThrow('outside');
    expect(()=>putInfrastructure({...createDocument(),terrain:[{x:7,y:5,kind:'forest'}]},path())).toThrow('impassable');
  });
  it.each(['palisade','wall','fence','gate'] as const)('keeps %s corners independently editable and renders its appearance',surface=>{
    const doc=putInfrastructure(createDocument(),path({surface}));expect(doc.roads[0].points).toEqual(path().points);const svg=mapSvg(doc,{resolution:1024,grid:false,labels:false});expect(svg).toContain('data-road="manual"');expect((svg.match(/<path/g)??[]).length).toBeGreaterThan(4);
  });
  it('locks edits, deletion and segment cuts, and retains one-command undo/redo',()=>{
    const empty=createDocument(),drawn=putInfrastructure(empty,path());let h=commit({present:empty,past:[],future:[]},drawn);expect(undo(h).present).toBe(empty);expect(redo(undo(h)).present).toBe(drawn);
    const locked={...drawn,roads:[{...drawn.roads[0],locked:true}]};expect(putInfrastructure(locked,path({width:1}))).toBe(locked);expect(deleteInfrastructure(locked,'manual').roads).toEqual(locked.roads);expect(deleteSegment(locked,'manual',0,'split')).toBe(locked);
    h=commit(h,deleteSegment(drawn,'manual',0,'split'));expect(undo(h).present).toBe(drawn);expect(redo(undo(h)).present).toEqual(h.present);
  });
  it('keeps visual smoothing safe, widths explicit, and old roads compatible',()=>{
    const doc=createDocument(),r=path(),g=roadGeometry(doc,r);expect(g.data).toContain('Q');expect(g.width).toBe(.4);expect(infrastructureWarnings(doc,{...r,points:g.samples.map(p=>({x:p.x-.5,y:p.y-.5}))})).toEqual([]);
    expect(roadGeometry(doc,{...r,style:'planned'}).data).not.toContain('Q');
    const old={id:'old',layerId:'settlement',points:[{x:1,y:2},{x:2,y:2}]};expect(migrateDocument({...doc,version:1,roads:[old]}).roads).toEqual([old]);expect(roadGeometry(doc,old).width).toBe(.55);
    const edge=putInfrastructure(doc,path({points:[{x:90,y:90},{x:94,y:90}]}));expect(resizeGrid(edge,50,50)).toBe(edge);const wide=putInfrastructure(doc,path({width:3,points:[{x:46,y:40},{x:48,y:40}]}));expect(resizeGrid(wide,49,60)).toBe(wide);
  });
  it('offers an approved-only access spur after moving a building without changing locked roads',()=>{
    const doc=placeBuilding(putInfrastructure(createDocument(),path({locked:true,points:[{x:2,y:15},{x:25,y:15}]})),{x:6,y:5},'cottage','home');
    const moved=updateBuilding(doc,'home',{x:12}),proposal=connectionProposal(moved,'home');expect(proposal).not.toBeNull();expect(moved.roads).toEqual(doc.roads);
    const accepted=putInfrastructure(moved,proposal!);expect(accepted.roads[0]).toBe(doc.roads[0]);expect(accepted.roads).toHaveLength(2);expect(infrastructureWarnings(accepted,proposal!)).toEqual([]);
  });
  it('round trips every material and rejects unsupported infrastructure metadata',()=>{
    const doc={...createDocument(),roads:Object.keys(surfaces).map((surface,i)=>path({id:`r${i}`,surface:surface as Road['surface'],locked:i%2===0,name:'My <path>'}))};expect(parseDocument(serializeDocument(doc))).toEqual(doc);
    for(const patch of [{surface:'lava'},{width:Infinity},{locked:'yes'},{editVersion:9}])expect(()=>parseDocument(JSON.stringify({...doc,roads:[{...path(),...patch}]}))).toThrow();
  });
  it('autosaves, reopens and restores exact infrastructure snapshots with project isolation',async()=>{
    const db=new ProjectDatabase(`infrastructure-${crypto.randomUUID()}`),repo=new ProjectRepository(db);
    try{const a=await repo.create(createDocument()),other=await repo.create(createDocument());const save=new Autosave(0,(doc,rev)=>repo.save(doc,rev),()=>{},0),edited=putInfrastructure(a.document,path({surface:'palisade',locked:true}));save.schedule(edited);await save.flush();const snap=await repo.snapshot(edited.id,'Walls');
      const removed={...edited,roads:[]};await repo.save(removed,1);db.close();await db.open();expect((await repo.load(edited.id)).document).toEqual(removed);expect((await repo.load(other.document.id)).document.roads).toEqual([]);
      const restored=await repo.restore(edited.id,snap.id,2);expect(restored.document).toEqual(edited);expect(parseDocument(serializeDocument(restored.document))).toEqual(edited);save.dispose();
    }finally{await db.delete();}
  });
  it('preserves a generated 35-building river village and can independently edit its road network',()=>{
    const doc=generateSettlement(defaultSettings),r=doc.roads.find(r=>r.points.length>3)!;expect(doc.buildings).toHaveLength(35);
    const cut=deleteSegment(doc,r.id,1,'split-generated');expect(cut.buildings).toBe(doc.buildings);expect(cut.terrain).toBe(doc.terrain);expect(cut.roads.filter(p=>p.id!==r.id&&p.id!=='split-generated')).toEqual(doc.roads.filter(p=>p.id!==r.id));expect(parseDocument(serializeDocument(cut))).toEqual(cut);
  });
});
