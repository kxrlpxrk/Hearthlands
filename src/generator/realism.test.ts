import { describe, it, expect } from 'vitest';
import { generateSettlement, generateBuildings, generateTerrain } from './generate';
import { defaultSettings, type GenerationSettings } from './settings';
import { cellKey, entrance, occupiedCells, terrainMap, neighbors } from './navigation';
import { buildingWarnings } from '../model/buildings';
import { roadContext, roadGeometry } from '../rendering/roadGeometry';
import { migrateDocument, type SettlementDocument } from '../model/document';
import { resourceDistance } from './buildings';
function valid(doc: SettlementDocument, s: GenerationSettings) {
  expect(doc.buildings).toHaveLength(s.count);
  expect(new Set(doc.buildings.map(b=>b.id)).size).toBe(s.count);
  const blocked=occupiedCells(doc.buildings),tiles=terrainMap(doc);
  const network=new Set(doc.roads.flatMap(r=>r.points.map(cellKey)));
  for(const[k,n]of Object.entries(s.required))expect(doc.buildings.filter(b=>b.kind===k).length).toBeGreaterThanOrEqual(n!);
  for(const b of doc.buildings){
    expect(buildingWarnings(doc,b)).toEqual([]);expect(network.has(cellKey(entrance(b)))).toBe(true);
    if(['fishinghut','harbour','shipyard','bridge'].includes(b.kind))expect(resourceDistance(doc,b,'water')).toBeLessThanOrEqual(3);
    if(b.kind==='sawmill')expect(resourceDistance(doc,b,'forest')).toBeLessThanOrEqual(3);
  }
  for(const k of blocked)expect(tiles.get(k)).toBe('grass');
  for(const r of doc.roads)for(let i=0;i<r.points.length;i++){
    const c=r.points[i],k=cellKey(c);expect(tiles.get(k)).toBe('grass');expect(blocked.has(k)).toBe(false);
    if(i)expect(Math.abs(c.x-r.points[i-1].x)+Math.abs(c.y-r.points[i-1].y)).toBe(1);
  }
  const remaining=new Set(network),queue=[remaining.values().next().value!];remaining.delete(queue[0]);
  for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const c of neighbors({x,y}))if(remaining.delete(cellKey(c)))queue.push(cellKey(c));}
  expect(remaining.size).toBe(0);
  expect(doc.planning!.clusters.length).toBeGreaterThanOrEqual(2);expect(doc.planning!.clusters.length).toBeLessThanOrEqual(4);
  for(const space of doc.planning!.openSpaces)for(const c of space.cells)expect(blocked.has(cellKey(c))).toBe(false);
}
describe('reference settlement realism',()=>{
  it('reserves a gathering place and populated residential clusters, with varied rotation and spacing',()=>{
    const doc=generateSettlement(defaultSettings);valid(doc,defaultSettings);const plan=doc.planning!;expect(generateSettlement(defaultSettings)).toEqual(doc);
    expect(plan.openSpaces.find(s=>s.kind==='gathering')!.cells.length).toBeGreaterThan(12);
    expect(new Set(doc.buildings.map(b=>b.rotation)).size).toBeGreaterThanOrEqual(3);
    const homes=doc.buildings.filter(b=>b.kind==='cottage');
    for(const cluster of plan.clusters.filter(c=>c.role==='residential'))expect(homes.some(b=>Math.hypot(b.x-cluster.centre.x,b.y-cluster.centre.y)<cluster.radius+4)).toBe(true);
    const hall=doc.buildings.find(b=>b.kind==='longhouse')!;expect(Math.hypot(hall.x-plan.centre.x,hall.y-plan.centre.y)).toBeLessThan(14);
    const gaps=doc.buildings.map(a=>Math.min(...doc.buildings.filter(b=>b.id!==a.id).map(b=>Math.hypot(a.x-b.x,a.y-b.y))));expect(Math.max(...gaps)-Math.min(...gaps)).toBeGreaterThan(2);
    expect(doc.roads.some(r=>r.kind==='primary')).toBe(true);expect(doc.roads.some(r=>r.kind==='secondary')).toBe(true);expect(doc.roads.some(r=>r.kind==='access')).toBe(true);
    const kinds=doc.terrain.reduce((counts,t)=>({...counts,[t.kind]:(counts[t.kind]??0)+1}),{} as Record<string,number>);expect(kinds.forest).toBeGreaterThan(200);expect(kinds.stone).toBeGreaterThan(0);
  });
  it('rounds and simplifies visual paths safely without changing navigation, including full stroke clearance',()=>{
    const doc=generateSettlement(defaultSettings),before=JSON.stringify(doc),context=roadContext(doc),blocked=occupiedCells(doc.buildings),tiles=terrainMap(doc);
    let curves=0;
    for(const road of doc.roads){const g=roadGeometry(doc,road,context);if(g.data.includes('Q'))curves++;
      for(const c of road.points.filter(c=>context.junctions.has(cellKey(c)))){const junction=roadGeometry(doc,{...road,points:[c]},context).samples[0];expect(g.samples.some(p=>Math.hypot(p.x-junction.x,p.y-junction.y)<1e-8)).toBe(true);}
      for(const p of g.samples)for(const dx of[-g.width/2,0,g.width/2])for(const dy of[-g.width/2,0,g.width/2]){
        const k=`${Math.floor(p.x+dx)},${Math.floor(p.y+dy)}`;expect(tiles.get(k)).toBe('grass');expect(blocked.has(k)).toBe(false);
      }
    }
    expect(curves).toBeGreaterThan(4);expect(JSON.stringify(doc)).toBe(before);
    expect(roadGeometry(doc,doc.roads[0],context)).toEqual(roadGeometry(doc,doc.roads[0],context));
  });
  it('rejects a waterfront quota when an impassable wooded bank separates the usable land from water',()=>{
    const s={...defaultSettings,count:20,required:{harbour:1}};
    const terrain=generateTerrain(s);
    terrain.terrain=terrain.terrain.map(c=>({...c,kind:c.x===70?'water' as const:c.x===69?'forest' as const:'grass' as const}));
    expect(()=>generateBuildings(terrain,s)).toThrow(/Required Harbour \/ dock.*cannot fit/);
  });
  it('leaves Planned routes intentionally straight and supports old roads without metadata',()=>{
    const doc=generateSettlement({...defaultSettings,layout:'planned'});valid(doc,{...defaultSettings,layout:'planned'});
    for(const road of doc.roads)expect(roadGeometry(doc,road).data).not.toContain('Q');
    const old={...doc,planning:undefined,roads:doc.roads.map(({id,points,layerId})=>({id,points,layerId}))};expect(migrateDocument(JSON.parse(JSON.stringify(old))).roads).toEqual(old.roads);expect(roadGeometry(old,old.roads[0]).width).toBe(.55);
  });
});
const cases: GenerationSettings[]=[];
for(const seed of [0,17,1847,52993])for(const environment of ['forest','plains','river','coastal'] as const)for(const preset of ['viking','medieval'] as const){
  const required:GenerationSettings['required']=preset==='viking'?{longhouse:1,sawmill:1}:{townhall:1,farm:3,sawmill:1};
  if(environment==='river'||environment==='coastal'){required.fishinghut=2;required.harbour=1;}
  cases.push({...defaultSettings,seed,environment,preset,count:seed===0?20:seed===52993?60:35,required,layout:seed===17?'organic':seed===0?'planned':'contextual'});
}
describe('generation stress matrix',()=>{
  it.each(cases)('$preset / $environment / seed $seed / $count buildings',s=>valid(generateSettlement(s),s));
});
