import { allTerrain, terrainQuery } from '../model/terrain';
import { planSettlement } from './planning';
import { noise } from './noise';
import { catalogue, buildingDefinition, type BuildingKind } from '../model/catalogue';
import type { Building, Cell, SettlementDocument } from '../model/document';
import { footprint } from '../model/buildings';
import { seededRandom } from './random';
import { cellKey, entrance, flood, neighbors, occupiedCells, roadRoot, settlementLand, trace } from './navigation';
import { GenerationError, validateSettings, type GenerationSettings } from './settings';
const waterfront: BuildingKind[]=['fishinghut','harbour','shipyard','bridge'];
export function resourceDistance(doc: SettlementDocument, b: Building, kind: 'water'|'forest'): number {
  const f=footprint(b);let distance=Infinity;
  for(const t of allTerrain(doc))if(kind==='water'?t.water>=.5:t.water<.5&&t.vegetation>=.6){const dx=Math.max(b.x-t.x,0,t.x-(b.x+f.width-1)),dy=Math.max(b.y-t.y,0,t.y-(b.y+f.height-1));distance=Math.min(distance,dx+dy);}
  return distance;
}
function resourceDistances(doc: SettlementDocument, kind: 'water'|'forest') {
  const distances=new Map<string,number>(),queue: Cell[]=[],tiles=terrainQuery(doc);
  for(const t of allTerrain(doc))if(kind==='water'?t.water>=.5:t.water<.5&&t.vegetation>=.6){distances.set(cellKey(t),0);queue.push(t);}
  for(let i=0;i<queue.length;i++){const c=queue[i],distance=distances.get(cellKey(c))!;for(const n of neighbors(c)){const k=cellKey(n);if(n.x>=0&&n.y>=0&&n.x<doc.grid.width&&n.y<doc.grid.height&&(tiles.walkable(n)||(kind==='water'?tiles.water(n):tiles.woodland(n)))&&!distances.has(k)){distances.set(k,distance+1);queue.push(n);}}}
  return distances;
}
export function generateBuildings(terrain: SettlementDocument, s: GenerationSettings): SettlementDocument {
  validateSettings(s);
  if(terrain.grid.width!==s.width||terrain.grid.height!==s.height||terrain.seed!==s.seed)throw new GenerationError('Terrain settings changed. Generate terrain again.');
  const planning=planSettlement(terrain,s);
  const doc={...terrain,planning,buildings:[] as Building[],roads:[]},random=seededRandom(s.seed+137),land=settlementLand(doc),root=roadRoot(doc,land);
  const reserved=new Set(planning.openSpaces.flatMap(space=>space.cells.map(cellKey)));
  const water=resourceDistances(doc,'water'),forest=resourceDistances(doc,'forest'),tiles=terrainQuery(doc);
  const network=new Map([[cellKey(root),root]]);
  for(const path of planning.primaryRoutes)for(const c of path)network.set(cellKey(c),c);
  const required:BuildingKind[]=[];
  for(const definition of catalogue)for(let i=0;i<(s.required[definition.kind]??0);i++)required.push(definition.kind);
  // Weighted, seeded supporting mix with limits: a village does not need five taverns.
  const support: BuildingKind[] = s.preset === 'viking' ? ['cottage','cottage','cottage','longhouse','storehouse','warehouse','blacksmith','tavern','market','watchtower','sawmill'] : ['cottage','cottage','cottage','farm','farm','stables','mill','market','tavern','blacksmith','storehouse'];
  if (['river','coastal'].includes(s.environment)) support.push('fishinghut','harbour',...(s.preset==='viking'?['fishinghut','shipyard'] as BuildingKind[]:[]));
  const wanted=[...required];
  const prominent: BuildingKind = s.preset==='viking'?'longhouse':'townhall';
  if(!wanted.includes(prominent)&&wanted.length<s.count)wanted.push(prominent);
  while(wanted.length<s.count){
    const eligible=support.filter(kind=>(!waterfront.includes(kind)||wanted.filter(k=>waterfront.includes(k)).length<Math.max(4,required.filter(k=>waterfront.includes(k)).length))&&(['cottage','farm','fishinghut','storehouse','longhouse'].includes(kind)||wanted.filter(k=>k===kind).length<(kind==='harbour'?2:1)));
    wanted.push(eligible[Math.floor(random()*eligible.length)]);
  }
  for(let index=0;index<wanted.length;index++){
    const blocked=occupiedCells(doc.buildings),spaced=occupiedCells(doc.buildings,1);
    const parents=flood(land,blocked,[...network.values()]);
    let best:Building|undefined;
    const alternatives=index<required.length?[wanted[index]]:[...new Set([wanted[index], 'cottage' as const, ...(s.preset==='medieval'?['farm' as const]:['longhouse' as const]), 'storehouse' as const])];
    for(const kind of alternatives){
    const definition=buildingDefinition(kind);let bestScore=Infinity;
    const homes = planning.clusters.filter(c=>c.role==='residential');
    const household = homes[index % homes.length];
    const angle = noise(s.seed+251,index,0)*Math.PI*2;
    const pocket = (household?.radius ?? 6)*(.25+noise(s.seed+313,index,0)*.45);
    const home = household ? {x:household.centre.x+Math.cos(angle)*pocket,y:household.centre.y+Math.sin(angle)*pocket} : root;
    const civic = ['townhall','market','tavern'].includes(kind) || (kind==='longhouse'&&!doc.buildings.some(b=>b.kind==='longhouse'));
    const workshop = ['sawmill','blacksmith','warehouse','storehouse'].includes(kind);
    const target = waterfront.includes(kind) ? planning.waterfront ?? root : kind==='farm'||kind==='stables' ? planning.farming : civic ? root : workshop ? planning.workshop : home;
    for(let y=1;y<s.height-1;y++)for(let x=1;x<s.width-1;x++){
      const rotation=s.layout==='planned'?0:Math.floor(random()*4)*90;
      const candidate:Building={id:`generated-${s.seed}-${index}`,kind,name:definition.name,layerId:'settlement',x,y,width:definition.width,height:definition.height,rotation,locked:false};
      const f=footprint(candidate),entry=entrance(candidate);
      if(x+f.width>=s.width||y+f.height>=s.height||!parents.has(cellKey(entry)))continue;
      let valid=true,resource=Infinity;
      for(let yy=y;yy<y+f.height&&valid;yy++)for(let xx=x;xx<x+f.width;xx++){
        const k=`${xx},${yy}`;
        if(!land.has(k)||!tiles.buildable({x:xx,y:yy})||spaced.has(k)||network.has(k)||reserved.has(k)){valid=false;break;}
        resource=Math.min(resource,(waterfront.includes(kind)?water:forest).get(k)??Infinity);
      }
      if(!valid||(waterfront.includes(kind)&&resource>3)||(kind==='sawmill'&&resource>3))continue;
      // All footprints are open grass; farms never occupy woodland or water.
      if(!tiles.buildable(candidate))continue;
      const centre = Math.hypot(x-target.x,y-target.y);
      // Different households seek different pockets of space, rather than filling rings.
      const jitter = s.layout==='planned'?0:(noise(s.seed+index*83,x/6,y/6)-.5)*12;
      let score = centre + jitter;
      if(s.layout==='planned') score += (x%7)*2+(y%6)*2;
      else {
        const edgeDistance = doc.buildings.reduce((d,b)=>Math.min(d,Math.hypot(x-b.x,y-b.y)),20);
        const preferred = 5 + noise(s.seed+91,index,0)*4;
        score += Math.max(0,preferred-edgeDistance)*.7;
      }
      if(waterfront.includes(kind)||kind==='sawmill')score+=resource*2;
      if(score>=bestScore)continue;
      // Paths to entrances cannot travel through the proposed footprint.
      const own=occupiedCells([candidate]);let p:Cell|null=entry, pathClear=true;
      while(p){if(own.has(cellKey(p))){pathClear=false;break;}p=parents.get(cellKey(p))!;}
      if(!pathClear)continue;
      if(score<bestScore){best=candidate;bestScore=score;}
    }
    if(best)break;
    }
    if(!best)throw new GenerationError(`${index<required.length?'Required':'Supporting'} ${buildingDefinition(wanted[index]).name} (${index+1}/${s.count}) cannot fit with a clear entrance, spacing and resource access. Increase map size, reduce count/quotas, or change environment/seed. No partial settlement was applied.`);
    doc.buildings.push(best);
    for(const c of trace(parents,entrance(best)))network.set(cellKey(c),c);
  }
  return doc;
}
