import { catalogue } from '../model/catalogue';
import { describe, it, expect } from 'vitest';
import { generateTerrain, generateBuildings, generateRoads, generateSettlement } from './generate';
import { defaultSettings, type GenerationSettings } from './settings';
import { entrance, cellKey, neighbors, occupiedCells, terrainMap } from './navigation';
import { resourceDistance } from './buildings';
import { buildingWarnings, updateBuilding } from '../model/buildings';
import { migrateDocument, createDocument, type SettlementDocument } from '../model/document';
import { commit, undo, redo } from '../commands/history';
const settings: GenerationSettings = {...defaultSettings,required:{...defaultSettings.required}};
function verify(doc: SettlementDocument) {
  expect(doc.buildings).toHaveLength(35);
  const terrain=terrainMap(doc), blocked=occupiedCells(doc.buildings), roadCells=new Set(doc.roads.flatMap(r=>r.points.map(cellKey)));
  for(const b of doc.buildings){expect(buildingWarnings(doc,b)).toEqual([]);expect(roadCells.has(cellKey(entrance(b)))).toBe(true);if(['fishinghut','harbour','shipyard','bridge'].includes(b.kind))expect(resourceDistance(doc,b,'water')).toBeLessThanOrEqual(3);if(b.kind==='sawmill')expect(resourceDistance(doc,b,'forest')).toBeLessThanOrEqual(3);}
  for(const k of blocked)expect(terrain.get(k)).toBe('grass');
  for(const r of doc.roads)for(let i=0;i<r.points.length;i++){const k=cellKey(r.points[i]);expect(terrain.get(k)).toBe('grass');expect(blocked.has(k)).toBe(false);if(i)expect(Math.abs(r.points[i].x-r.points[i-1].x)+Math.abs(r.points[i].y-r.points[i-1].y)).toBe(1);}
  const remaining=new Set(roadCells),queue=[remaining.values().next().value!];remaining.delete(queue[0]);for(let i=0;i<queue.length;i++){const[x,y]=queue[i].split(',').map(Number);for(const n of neighbors({x,y}))if(remaining.delete(cellKey(n)))queue.push(cellKey(n));}expect(remaining.size).toBe(0);
  for(let i=0;i<doc.buildings.length;i++)for(let j=i+1;j<doc.buildings.length;j++){const a=occupiedCells([doc.buildings[i]],1),b=occupiedCells([doc.buildings[j]]);expect([...b].some(k=>a.has(k))).toBe(false);}
}
describe('deterministic settlements',()=>{
  it('generates a connected 35-building Viking riverside village respecting terrain and quotas',()=>{const doc=generateSettlement(settings);verify(doc);for(const[k,n]of Object.entries(settings.required))expect(doc.buildings.filter(b=>b.kind===k).length).toBeGreaterThanOrEqual(n!);});
  it('is byte-for-byte repeatable, including IDs, and staged output matches complete output',()=>{const s={...settings,width:72,height:72,count:20};const a=generateSettlement(s),b=generateRoads(generateBuildings(generateTerrain(s),s));expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(generateSettlement({...s,seed:1848})).not.toEqual(a);});
  it.each(['organic','planned','contextual'] as const)('supports %s layout with valid roads',layout=>verify(generateSettlement({...settings,layout})));
  it.each(['forest','plains','river','coastal'] as const)('supports medieval %s terrain and farming',environment=>{const doc=generateSettlement({...settings,preset:'medieval',environment,required:{townhall:1,farm:4,sawmill:1}});verify(doc);expect(doc.buildings.filter(b=>b.kind==='farm').length).toBeGreaterThanOrEqual(4);});
  it.each([20,60])('supports the %i-building target limit',count=>{const s={...settings,count};const doc=generateSettlement(s);expect(doc.buildings).toHaveLength(count);expect(doc.buildings.every(b=>buildingWarnings(doc,b).length===0)).toBe(true);expect(doc.roads.filter(r=>r.id.startsWith('road-'))).toHaveLength(count);expect(doc.roads.some(r=>r.kind==='primary')).toBe(true);});
  it('can honour the entire catalogue before adding supporting structures',()=>{const required=Object.fromEntries(catalogue.map(b=>[b.kind,1]));const doc=generateSettlement({...settings,required});for(const b of catalogue)expect(doc.buildings.some(item=>item.kind===b.kind)).toBe(true);});
  it('distinguishes layouts and environments for the same seed',()=>{const organic=generateSettlement({...settings,layout:'organic'});expect(generateSettlement({...settings,layout:'planned'}).buildings).not.toEqual(organic.buildings);expect(generateTerrain({...settings,environment:'coastal'}).terrain).not.toEqual(generateTerrain(settings).terrain);});
  it('fails impossible quotas, resource demands, capacity and invalid settings without mutating input',()=>{
    expect(()=>generateSettlement({...settings,required:{longhouse:36}})).toThrow(/exceed/);
    expect(()=>generateSettlement({...settings,environment:'plains',required:{harbour:1}})).toThrow(/requires/);
    expect(()=>generateSettlement({...settings,width:24,height:24,count:60,required:{townhall:60}})).toThrow(/cannot fit/);
    for(const patch of [{seed:NaN},{width:12},{count:61},{required:{cottage:-1}}])expect(()=>generateSettlement({...settings,...patch})).toThrow();
    const terrain=generateTerrain(settings),before=JSON.stringify(terrain);expect(()=>generateBuildings(terrain,{...settings,seed:1})).toThrow(/changed/);expect(JSON.stringify(terrain)).toBe(before);
  });
  it('keeps generated documents editable, undoable, serializable, and v1/v2 compatible',()=>{
    const doc=generateSettlement(settings),id=doc.buildings[0].id;
    const edited=updateBuilding(doc,id,{name:'My fishing hall',width:5,x:10});const h=commit({present:doc,past:[],future:[]},edited);expect(undo(h).present).toEqual(doc);expect(redo(undo(h)).present).toEqual(edited);expect(migrateDocument(JSON.parse(JSON.stringify(edited)))).toEqual(edited);
    const legacy={...createDocument(),version:1,buildings:[{id:'old',kind:'longhouse',layerId:'settlement',x:2,y:3}]};expect(migrateDocument(legacy).buildings[0]).toMatchObject({x:2,y:3,width:1,height:1,locked:false});
    const old=createDocument(), applied=commit({present:old,past:[],future:[]},doc);expect(undo(applied).present).toEqual(old);
  });
});
