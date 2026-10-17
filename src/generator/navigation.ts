import { terrainQuery } from '../model/terrain';
import { connect } from './routing';
import type { Building, Cell, SettlementDocument } from '../model/document';
import { footprint } from '../model/buildings';
import { GenerationError } from './settings';
export const cellKey = (c: Cell) => `${c.x},${c.y}`;
export const neighbors = (c: Cell): Cell[] => [{x:c.x,y:c.y+1},{x:c.x+1,y:c.y},{x:c.x,y:c.y-1},{x:c.x-1,y:c.y}];
export function entrance(b: Building): Cell { const f = footprint(b); return {x:b.x+Math.floor(f.width/2),y:b.y+f.height}; }
export function terrainMap(doc: SettlementDocument) { return new Map(doc.terrain.map(c=>[cellKey(c),c.kind])); }
export function occupiedCells(buildings: Building[], margin=0): Set<string> {
  const set = new Set<string>();
  for (const b of buildings) {const f=footprint(b);for(let y=b.y-margin;y<b.y+f.height+margin;y++) for(let x=b.x-margin;x<b.x+f.width+margin;x++) set.add(`${x},${y}`);}
  return set;
}
export function landCells(doc: SettlementDocument): Set<string> {
  const terrain=terrainQuery(doc), set = new Set<string>();
  for(let y=0;y<doc.grid.height;y++) for(let x=0;x<doc.grid.width;x++) if (terrain.walkable({x,y})) set.add(`${x},${y}`);
  return set;
}
/** Pick the largest land component, ensuring all development shares a usable bank. */
export function settlementLand(doc: SettlementDocument): Set<string> {
  const remaining=landCells(doc);let largest=new Set<string>();
  while(remaining.size){const first=remaining.values().next().value!;const queue=[first];remaining.delete(first);for(let i=0;i<queue.length;i++){const [x,y]=queue[i].split(',').map(Number);for(const c of neighbors({x,y})){const k=cellKey(c);if(remaining.delete(k))queue.push(k);}}if(queue.length>largest.size)largest=new Set(queue);}
  return largest;
}
export function roadRoot(doc: SettlementDocument, land=settlementLand(doc)): Cell {
  if (doc.planning && land.has(cellKey(doc.planning.centre))) return doc.planning.centre;
  let result: Cell | undefined, score=Infinity;
  for(const k of land){const [x,y]=k.split(',').map(Number), d=(x-doc.grid.width*.38)**2+(y-doc.grid.height*.5)**2;if(d<score){score=d;result={x,y};}}
  if(!result)throw new GenerationError('No accessible open land for a settlement centre.');return result;
}
/** Multi-source BFS provides paths to the connected road network. */
export function flood(land: Set<string>, blocked: Set<string>, sources: Cell[]): Map<string, Cell | null> {
  const parents=new Map<string,Cell|null>(), queue: Cell[]=[];
  for(const s of sources){const k=cellKey(s);if(land.has(k)&&!blocked.has(k)&&!parents.has(k)){parents.set(k,null);queue.push(s);}}
  for(let i=0;i<queue.length;i++) for(const n of neighbors(queue[i])){const k=cellKey(n);if(land.has(k)&&!blocked.has(k)&&!parents.has(k)){parents.set(k,queue[i]);queue.push(n);}}
  return parents;
}
export function trace(parents: Map<string,Cell|null>, target: Cell): Cell[] {
  if(!parents.has(cellKey(target)))throw new GenerationError('A building entrance cannot reach the settlement paths.');
  const points:Cell[]=[];let c:Cell|null=target;while(c){points.push(c);c=parents.get(cellKey(c))!;}return points;
}
export function generateRoads(doc: SettlementDocument): SettlementDocument {
  if(!doc.buildings.length)throw new GenerationError('Generate buildings before roads.');
  const land=settlementLand(doc), root=roadRoot(doc,land), blocked=occupiedCells(doc.buildings);
  if(blocked.has(cellKey(root)))throw new GenerationError('The settlement centre is blocked. Generate buildings again.');
  const network = new Map([[cellKey(root), root]]), roads: SettlementDocument['roads'] = [];
  const style = doc.planning?.layout ?? 'planned';
  for (const [i, points] of (doc.planning?.primaryRoutes ?? []).entries()) {
    if (points.some(c => !land.has(cellKey(c)) || blocked.has(cellKey(c)))) throw new GenerationError('A primary route is blocked. Generate buildings again.');
    roads.push({ id: `primary-${i}`, points, layerId: 'settlement', kind: 'primary', style });
    for (const c of points) network.set(cellKey(c), c);
  }
  // Important destinations establish secondary tracks before individual access paths.
  const priority = (b: Building) => ['longhouse','townhall','harbour','market','farm','sawmill'].includes(b.kind) ? 0 : 1;
  for (const b of [...doc.buildings].sort((a,b) => priority(a)-priority(b))) {
    const points = doc.planning ? connect(entrance(b), network, land, blocked, style) : trace(flood(land, blocked, [...network.values()]), entrance(b));
    for (const c of points) network.set(cellKey(c), c);
    roads.push({ id: `road-${b.id}`, points, layerId: 'settlement', ...(doc.planning ? { kind: priority(b) === 0 && points.length > 5 ? 'secondary' as const : 'access' as const, style } : {}) });
  }
  return { ...doc, roads };
}
