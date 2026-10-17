import { catalogue, buildingDefinition, type BuildingKind } from '../model/catalogue';
import type { Building, Cell, SettlementDocument } from '../model/document';
import { footprint } from '../model/buildings';
import { seededRandom } from './random';
import { cellKey, entrance, flood, neighbors, occupiedCells, roadRoot, settlementLand, terrainMap, trace } from './navigation';
import { GenerationError, validateSettings, type GenerationSettings } from './settings';
const waterfront: BuildingKind[]=['fishinghut','harbour','shipyard','bridge'];
export function resourceDistance(doc: SettlementDocument, b: Building, kind: 'water'|'forest'): number {
  const f=footprint(b);let distance=Infinity;
  for(const t of doc.terrain)if(t.kind===kind){const dx=Math.max(b.x-t.x,0,t.x-(b.x+f.width-1)),dy=Math.max(b.y-t.y,0,t.y-(b.y+f.height-1));distance=Math.min(distance,dx+dy);}
  return distance;
}
function resourceDistances(doc: SettlementDocument, kind: 'water'|'forest') {
  const distances=new Map<string,number>(),queue: Cell[]=[];
  for(const t of doc.terrain)if(t.kind===kind){distances.set(cellKey(t),0);queue.push(t);}
  for(let i=0;i<queue.length;i++){const c=queue[i],distance=distances.get(cellKey(c))!;for(const n of neighbors(c)){const k=cellKey(n);if(n.x>=0&&n.y>=0&&n.x<doc.grid.width&&n.y<doc.grid.height&&!distances.has(k)){distances.set(k,distance+1);queue.push(n);}}}
  return distances;
}
export function generateBuildings(terrain: SettlementDocument, s: GenerationSettings): SettlementDocument {
  validateSettings(s);
  if(terrain.grid.width!==s.width||terrain.grid.height!==s.height||terrain.seed!==s.seed)throw new GenerationError('Terrain settings changed. Generate terrain again.');
  const doc={...terrain,buildings:[] as Building[],roads:[]},random=seededRandom(s.seed+137),land=settlementLand(doc),root=roadRoot(doc,land);
  const water=resourceDistances(doc,'water'),forest=resourceDistances(doc,'forest'),tiles=terrainMap(doc);
  const network=new Map([[cellKey(root),root]]);
  const required:BuildingKind[]=[];
  for(const definition of catalogue)for(let i=0;i<(s.required[definition.kind]??0);i++)required.push(definition.kind);
  const support:BuildingKind[]=s.preset==='viking'?['longhouse','cottage','cottage','tavern','storehouse','blacksmith','market','watchtower']:['cottage','cottage','farm','cottage','market','tavern','mill','storehouse'];
  if(['river','coastal'].includes(s.environment))support.push('fishinghut');
  // Required quotas always precede supporting buildings; no silent fallbacks for them.
  const wanted=[...required];while(wanted.length<s.count)wanted.push(support[(wanted.length-required.length)%support.length]);
  for(let index=0;index<wanted.length;index++){
    const kind=wanted[index],definition=buildingDefinition(kind),blocked=occupiedCells(doc.buildings),spaced=occupiedCells(doc.buildings,1);
    const parents=flood(land,blocked,[...network.values()]);
    let best:Building|undefined,bestScore=Infinity;
    for(let y=1;y<s.height-1;y++)for(let x=1;x<s.width-1;x++){
      const rotation=s.layout==='planned'?0:random()<.3?90:0;
      const candidate:Building={id:`generated-${s.seed}-${index}`,kind,name:definition.name,layerId:'settlement',x,y,width:definition.width,height:definition.height,rotation,locked:false};
      const f=footprint(candidate),entry=entrance(candidate);
      if(x+f.width>=s.width||y+f.height>=s.height||!parents.has(cellKey(entry)))continue;
      let valid=true,resource=Infinity;
      for(let yy=y;yy<y+f.height&&valid;yy++)for(let xx=x;xx<x+f.width;xx++){
        const k=`${xx},${yy}`;
        if(!land.has(k)||spaced.has(k)||network.has(k)){valid=false;break;}
        resource=Math.min(resource,(waterfront.includes(kind)?water:forest).get(k)??Infinity);
      }
      if(!valid||(waterfront.includes(kind)&&resource>3)||(kind==='sawmill'&&resource>3))continue;
      // All footprints are open grass; farms never occupy woodland or water.
      if(kind==='farm'&&tiles.get(cellKey(candidate))!=='grass')continue;
      const centre=Math.hypot(x-root.x,y-root.y);
      let score=centre + random()*(s.layout==='organic'?22:3);
      if(s.layout==='planned')score+=(x%7)*2+(y%6)*2;
      if(s.layout==='contextual'){score+=resource*(waterfront.includes(kind)||kind==='sawmill'?4:0);if(['longhouse','townhall','market'].includes(kind))score+=centre*.8;}
      if(score>=bestScore)continue;
      // Paths to entrances cannot travel through the proposed footprint.
      const own=occupiedCells([candidate]);let p:Cell|null=entry, pathClear=true;
      while(p){if(own.has(cellKey(p))){pathClear=false;break;}p=parents.get(cellKey(p))!;}
      if(!pathClear)continue;
      if(score<bestScore){best=candidate;bestScore=score;}
    }
    if(!best)throw new GenerationError(`${index<required.length?'Required':'Supporting'} ${definition.name} (${index+1}/${s.count}) cannot fit with a clear entrance, spacing and resource access. Increase map size, reduce count/quotas, or change environment/seed. No partial settlement was applied.`);
    doc.buildings.push(best);
    for(const c of trace(parents,entrance(best)))network.set(cellKey(c),c);
  }
  return doc;
}
