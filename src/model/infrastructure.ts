import { terrainQuery } from './terrain';
import type { Cell, Road, SettlementDocument } from './document';
import { footprint } from './buildings';
import { entrance } from '../generator/navigation';
export const surfaces = {
  dirt: 'Dirt path', gravel: 'Gravel road', cobblestone: 'Cobblestone road', timber: 'Timber walkway',
  'wooden-bridge': 'Wooden bridge', 'stone-bridge': 'Stone bridge', palisade: 'Wooden palisade', wall: 'Stone wall', fence: 'Wooden fence', gate: 'Defensive gate',
} as const;
export type Surface = keyof typeof surfaces;
export const isBridge = (r: Road) => r.surface === 'wooden-bridge' || r.surface === 'stone-bridge';
export const isDefense = (r: Road) => ['palisade','wall','fence','gate'].includes(r.surface ?? '');
export const infrastructureWidth=(r:Road)=>r.width??(r.kind==='primary'?.42:r.kind==='secondary'?.3:r.kind==='access'?.2:.55);
export const distance = (a: Cell,b: Cell) => Math.hypot(a.x-b.x,a.y-b.y);
export function segmentProjection(p: Cell,a: Cell,b: Cell): Cell {
  const length=(b.x-a.x)**2+(b.y-a.y)**2,t=length?Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/length)):0;
  return {x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};
}
export function closestSegment(road: Road,p: Cell) {
  let index=0,point=road.points[0]??p,d=road.points.length===1?distance(p,point):Infinity;
  for(let i=0;i<road.points.length-1;i++){const q=segmentProjection(p,road.points[i],road.points[i+1]),n=distance(p,q);if(n<d){d=n;index=i;point=q;}}
  return {index,point,distance:d};
}
/** Coordinates remain tile-centred, matching all legacy generated roads. */
export function snapConnection(doc: SettlementDocument,p: Cell,exclude?:string,defenses=false):Cell {
  let best=p,d=.8;
  for(const r of doc.roads.filter(r=>r.id!==exclude&&(defenses?isDefense(r):!isDefense(r)))){const hit=closestSegment(r,p);if(hit.distance<d){best=hit.point;d=hit.distance;}}
  return best;
}
export function sampledPath(points:Cell[],step=.2):Cell[]{
  const result:Cell[]=points.length?[points[0]]:[];
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.min(4096,Math.ceil(distance(a,b)/step)));for(let j=1;j<=n;j++)result.push({x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n});}
  return result;
}
/** Full-width checks use tile-centred document coordinates, never canvas pixels. */
export function infrastructureWarnings(doc:SettlementDocument,r:Road):string[]{
  const warnings=new Set<string>(),tiles=terrainQuery(doc),w=infrastructureWidth(r);
  if(r.points.length<2||r.points.every(p=>distance(p,r.points[0])<.01))warnings.add('Draw at least two distinct points.');
  const samples=sampledPath(r.points),bank=(p:Cell)=>({x:Math.floor(p.x+.5),y:Math.floor(p.y+.5)});
  const blocked=new Set<string>();for(const b of doc.buildings){const f=footprint(b);for(let y=Math.floor(b.y);y<Math.ceil(b.y+f.height);y++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+f.width);x++)blocked.add(`${x},${y}`);}
  for(const p of samples){
    const world={x:p.x+.5,y:p.y+.5};
    if(world.x-w/2<0||world.y-w/2<0||world.x+w/2>doc.grid.width||world.y+w/2>doc.grid.height)warnings.add('Infrastructure extends outside the map.');
    for(let y=Math.floor(world.y-w/2+.001);y<=Math.floor(world.y+w/2-.001);y++)for(let x=Math.floor(world.x-w/2+.001);x<=Math.floor(world.x+w/2-.001);x++){
      const k=`${x},${y}`,t=tiles.at({x,y});
      if(blocked.has(k))warnings.add('Infrastructure crosses a building footprint.');
      if(t.water>=.5&&!isBridge(r))warnings.add('Water crossing requires a bridge.');
      if(!isDefense(r)&&!isBridge(r)&&t.water<.5&&!tiles.walkable({x,y}))warnings.add('Path crosses impassable forest, rock or slope.');
      if(isBridge(r)&&t.water<.5&&(t.vegetation>=.6||t.rocks>=.6))warnings.add('Path crosses impassable forest or rock.');
      if(isDefense(r)&&tiles.slope({x,y})>4)warnings.add('Defenses cross a cliff.');
    }
  }
  if(isBridge(r)){
    if(r.points.length!==2)warnings.add('A bridge needs exactly two bank endpoints.');
    if(r.points.length&&[r.points[0],r.points[r.points.length-1]].some(p=>!tiles.walkable(bank(p))))warnings.add('Both bridge endpoints must be on accessible land.');
    if(r.points.length===2&&Math.abs(tiles.at(bank(r.points[0])).elevation-tiles.at(bank(r.points[1])).elevation)>2)warnings.add('Bridge bank elevations differ by more than 2 m.');
    const water=samples.map(p=>tiles.water(bank(p))),first=water.indexOf(true),last=water.lastIndexOf(true);
    if(first<0)warnings.add('A bridge must cross water between two banks.');
    else if(water.slice(first,last+1).some(v=>!v))warnings.add('Bridge must span one continuous waterway.');
  }
  return [...warnings];
}
export function putInfrastructure(doc:SettlementDocument,r:Road):SettlementDocument {
  const old=doc.roads.find(v=>v.id===r.id);if(old?.locked)return doc;
  if(!Number.isFinite(infrastructureWidth(r))||infrastructureWidth(r)<.15||infrastructureWidth(r)>3||r.points.length>5000||r.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Use a width of 0.15–3 tiles and finite control points.');
  if(r.points.some(p=>p.x<-.5||p.y<-.5||p.x>doc.grid.width-.5||p.y>doc.grid.height-.5))throw new Error('Infrastructure extends outside the map.');
  const warnings=infrastructureWarnings(doc,r);if(warnings.length)throw new Error(warnings.join(' '));
  return {...doc,roads:old?doc.roads.map(v=>v.id===r.id?r:v):[...doc.roads,r]};
}
export function deleteInfrastructure(doc:SettlementDocument,id:string):SettlementDocument {return {...doc,roads:doc.roads.filter(r=>r.id!==id||r.locked)};}
export function deleteSegment(doc:SettlementDocument,id:string,index:number,newId:string):SettlementDocument {
  const r=doc.roads.find(r=>r.id===id);if(!r||r.locked||index<0||index>=r.points.length-1)return doc;
  const halves=[r.points.slice(0,index+1),r.points.slice(index+1)].filter(p=>p.length>=2);
  return {...doc,roads:doc.roads.flatMap(v=>v.id!==id?[v]:halves.map((points,i)=>({...r,id:i?newId:r.id,points})))};
}
/** Optional shortest new access spur. Existing roads and locks are never rewritten. */
export function connectionProposal(doc:SettlementDocument,buildingId:string):Road|null {
  const b=doc.buildings.find(b=>b.id===buildingId);if(!b)return null;
  const start={x:Math.floor(entrance(b).x),y:Math.floor(entrance(b).y)},roads=doc.roads.filter(r=>!isDefense(r));if(!roads.length)return null;
  const key=(p:Cell)=>`${p.x},${p.y}`,targets=new Set(roads.flatMap(r=>sampledPath(r.points,.4).map(p=>`${Math.round(p.x)},${Math.round(p.y)}`)));
  if(targets.has(key(start)))return null;
  const tiles=terrainQuery(doc),blocked=new Set<string>();
  for(const building of doc.buildings){const f=footprint(building);for(let y=Math.floor(building.y);y<Math.ceil(building.y+f.height);y++)for(let x=Math.floor(building.x);x<Math.ceil(building.x+f.width);x++)blocked.add(`${x},${y}`);}
  const walls=new Set<string>();for(const r of doc.roads.filter(r=>isDefense(r)&&r.surface!=='gate'))for(const p of sampledPath(r.points,.3))walls.add(`${Math.round(p.x)},${Math.round(p.y)}`);
  for(const r of doc.roads.filter(r=>r.surface==='gate'))for(const p of sampledPath(r.points,.3))walls.delete(`${Math.round(p.x)},${Math.round(p.y)}`);
  for(const k of walls)blocked.add(k);
  const queue=[start],prev=new Map<string,Cell|null>([[key(start),null]]);let end:Cell|undefined;
  for(let i=0;i<queue.length;i++){const p=queue[i];if(targets.has(key(p))){end=p;break;}for(const q of [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}]){const k=key(q);if(q.x<0||q.y<0||q.x>=doc.grid.width||q.y>=doc.grid.height||prev.has(k)||blocked.has(k)||!tiles.walkable(q))continue;prev.set(k,p);queue.push(q);}}
  if(!end)return null;
  const points:Cell[]=[];let p:Cell|null=end;while(p){points.push(p);p=prev.get(key(p))??null;}points.reverse();
  const r:Road={id:`connection-${buildingId}`,layerId:b.layerId,points,surface:'dirt',width:.3,style:'organic',editVersion:1};
  return infrastructureWarnings(doc,r).length?null:r;
}

export function entranceConnected(doc:SettlementDocument,id:string):boolean {
  const b=doc.buildings.find(b=>b.id===id);if(!b)return true;
  return doc.roads.filter(r=>!isDefense(r)).some(r=>closestSegment(r,entrance(b)).distance<Math.max(.65,infrastructureWidth(r)/2));
}
