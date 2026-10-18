import type { Building, Cell, SettlementDocument } from './document';
import { footprint } from './buildings';
export const districtTypes = {
  residential:{name:'Residential',color:'#a3b881'}, harbour:{name:'Harbour / waterfront',color:'#70b7cf'},
  farming:{name:'Farming / agriculture',color:'#c7bd68'}, market:{name:'Market / commercial',color:'#d6a168'},
  industrial:{name:'Industrial / workshops',color:'#bb9290'}, civic:{name:'Civic / town centre',color:'#dbcb91'},
  military:{name:'Military / defensive',color:'#b38cac'}, custom:{name:'Custom district',color:'#8eaaa1'},
} as const;
export type DistrictType=keyof typeof districtTypes;
/** Cells are authoritative. boundary is the editable polygon that produced those cells,
 * removed on cell painting; editVersion is additive within document v3. */
export interface District { id:string; name:string; cells:Cell[]; color:string; layerId:string; editVersion?:1; type?:DistrictType; locked?:boolean; visible?:boolean; boundary?:Cell[] }
export interface DistrictView { version:1; visible:boolean; names:boolean; opacity:number }
export const defaultDistrictView:DistrictView={version:1,visible:true,names:true,opacity:.18};
export const key=(p:Cell)=>`${Math.floor(p.x)},${Math.floor(p.y)}`;
export function districtCells(d:District,doc:SettlementDocument):Cell[]{const seen=new Set<string>();return d.cells.map(p=>({x:Math.floor(p.x),y:Math.floor(p.y)})).filter(p=>{const k=key(p);if(p.x<0||p.y<0||p.x>=doc.grid.width||p.y>=doc.grid.height||seen.has(k))return false;seen.add(k);return true;});}
export function insidePolygon(p:Cell,points:Cell[]) {let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
const cross=(a:Cell,b:Cell,c:Cell)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function validBoundary(points:Cell[]):boolean {
  if(points.length<3||points.length>256||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  let area=0;
  const on=(a:Cell,b:Cell,p:Cell)=>Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
  for(let i=0;i<points.length;i++) {const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;if(Math.hypot(a.x-b.x,a.y-b.y)<.001)return false;
    for(let j=i+1;j<points.length;j++){if(j===i+1||i===0&&j===points.length-1)continue;const c=points[j],d=points[(j+1)%points.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return false;}
  }return Math.abs(area)>.01;
}
/** Insert the new corner on the nearest existing edge; validation happens on preview. */
export function insertBoundaryPoint(points:Cell[],point:Cell):Cell[]{
  if(points.length<3)return [...points,point];
  let edge=0,best=Infinity;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);if(distance<best){best=distance;edge=i;}}
  return [...points.slice(0,edge+1),point,...points.slice(edge+1)];
}
export function polygonCells(doc:SettlementDocument,points:Cell[]):Cell[]{
  if(!validBoundary(points))throw new Error('Use at least three distinct corners without crossing edges.');
  if(points.some(p=>p.x<0||p.y<0||p.x>doc.grid.width||p.y>doc.grid.height))throw new Error('District boundary must stay inside the map.');
  const cells:Cell[]=[];for(let y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))));y<Math.min(doc.grid.height,Math.ceil(Math.max(...points.map(p=>p.y))));y++)for(let x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))));x<Math.min(doc.grid.width,Math.ceil(Math.max(...points.map(p=>p.x))));x++)if(insidePolygon({x:x+.5,y:y+.5},points))cells.push({x,y});
  if(!cells.length)throw new Error('Boundary must cover at least one tile centre.');return cells;
}
export function overlapCells(doc:SettlementDocument,d:District):Set<string>{const occupied=new Set(doc.districts.filter(o=>o.id!==d.id).flatMap(o=>districtCells(o,doc).map(key)));return new Set(districtCells(d,doc).filter(p=>occupied.has(key(p))).map(key));}
export function putDistrict(doc:SettlementDocument,d:District,unclaimed=false):SettlementDocument {
  const old=doc.districts.find(o=>o.id===d.id);if(old?.locked&&JSON.stringify({...old,locked:d.locked,visible:d.visible})!==JSON.stringify(d))throw new Error('Unlock this district before editing it.');
  if(!d.id||!d.name.trim()||!/^#[0-9a-f]{6}$/i.test(d.color)||!doc.layers.some(l=>l.id===d.layerId))throw new Error('Choose a name, valid colour and existing layer.');
  if(d.boundary){const polygon=polygonCells(doc,d.boundary),keys=new Set(d.cells.map(key));if(polygon.length!==keys.size||polygon.some(p=>!keys.has(key(p))))throw new Error('Polygon and district cells disagree. Preview the boundary again.');}
  const cells=districtCells(d,doc),conflicts=overlapCells(doc,d);
  if(conflicts.size&&!unclaimed)throw new Error(`${conflicts.size} tiles overlap another district (including hidden or locked districts). Apply only unclaimed cells or cancel.`);
  const kept=unclaimed?cells.filter(p=>!conflicts.has(key(p))):cells;if(!kept.length)throw new Error('A district needs at least one unclaimed tile.');
  const next:District={...d,editVersion:1,type:d.type??'custom',locked:d.locked??false,visible:d.visible??true,cells:kept.sort((a,b)=>a.y-b.y||a.x-b.x)};
  if(conflicts.size||!next.boundary)delete next.boundary;
  return {...doc,districts:old?doc.districts.map(o=>o.id===d.id?next:o):[...doc.districts,next]};
}
/** Metadata changes can resolve legacy overlaps without altering their geometry. */
export function updateDistrict(doc:SettlementDocument,id:string,patch:Partial<Pick<District,'name'|'type'|'color'|'locked'|'visible'>>):SettlementDocument {
  const d=doc.districts.find(d=>d.id===id);if(!d)return doc;
  if(d.locked&&Object.keys(patch).some(k=>k!=='locked'&&k!=='visible'))return doc;
  if(patch.name!==undefined&&!patch.name.trim()||patch.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(patch.color))return doc;
  return {...doc,districts:doc.districts.map(o=>o.id===id?{...o,...patch}:o)};
}
export function deleteDistrict(doc:SettlementDocument,id:string){if(doc.districts.find(d=>d.id===id)?.locked)return doc;return {...doc,districts:doc.districts.filter(d=>d.id!==id)};}
export function duplicateDistrict(doc:SettlementDocument,id:string,newId:string):District {
  const d=doc.districts.find(d=>d.id===id);if(!d)throw new Error('Select a district first.');
  const cells=districtCells(d,doc),minX=Math.min(...cells.map(p=>p.x)),maxX=Math.max(...cells.map(p=>p.x));
  // Prefer a nearby non-overlapping copy; no existing district is displaced.
  const offsets=[{x:maxX-minX+2,y:0},{x:-(maxX-minX+2),y:0},...Array.from({length:doc.grid.height},(_,y)=>({x:-minX,y:y-Math.min(...cells.map(p=>p.y))}))];
  for(const offset of offsets){const shifted=cells.map(p=>({x:p.x+offset.x,y:p.y+offset.y}));if(shifted.some(p=>p.x<0||p.y<0||p.x>=doc.grid.width||p.y>=doc.grid.height))continue;const copy={...d,id:newId,name:`${d.name} copy`,locked:false,visible:true,cells:shifted,boundary:d.boundary?.map(p=>({x:p.x+offset.x,y:p.y+offset.y}))};if(!overlapCells(doc,copy).size)return copy;}
  throw new Error('No room for a separate copy. Draw a smaller district or free some district cells.');
}
export function footprintShare(b:Building,cells:Set<string>):number {const f=footprint(b);let area=0;for(let y=Math.floor(b.y);y<Math.ceil(b.y+f.height);y++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+f.width);x++)if(cells.has(`${x},${y}`))area+=Math.max(0,Math.min(x+1,b.x+f.width)-Math.max(x,b.x))*Math.max(0,Math.min(y+1,b.y+f.height)-Math.max(y,b.y));return area;}
export function districtMembership(doc:SettlementDocument):Map<string,Building[]> {
  const districts=[...doc.districts].sort((a,b)=>a.id.localeCompare(b.id)),sets=new Map(districts.map(d=>[d.id,new Set(districtCells(d,doc).map(key))]));const result=new Map(districts.map(d=>[d.id,[] as Building[]]));
  for(const b of doc.buildings){let owner:string|undefined,best=0;for(const d of districts){const area=footprintShare(b,sets.get(d.id)!);if(area>best+1e-8){best=area;owner=d.id;}}if(owner)result.get(owner)!.push(b);}return result;
}
export function districtStats(doc:SettlementDocument,d:District,members=districtMembership(doc).get(d.id)??[]){
  const cells=districtCells(d,doc);let occupied=0;
  // Exact union of footprint intersections, including overlapping legacy buildings.
  for(const c of cells){const rects=doc.buildings.map(b=>{const f=footprint(b);return {x:Math.max(c.x,b.x),y:Math.max(c.y,b.y),r:Math.min(c.x+1,b.x+f.width),t:Math.min(c.y+1,b.y+f.height)};}).filter(r=>r.r>r.x&&r.t>r.y);const xs=[...new Set(rects.flatMap(r=>[r.x,r.r]))].sort((a,b)=>a-b);for(let i=1;i<xs.length;i++){const intervals=rects.filter(r=>r.x<xs[i]&&r.r>xs[i-1]).map(r=>[r.y,r.t]).sort((a,b)=>a[0]-b[0]);let end=-Infinity,h=0;for(const [a,b] of intervals){h+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}occupied+=(xs[i]-xs[i-1])*h;}}
  const breakdown:Partial<Record<Building['kind'],number>>={};for(const b of members)breakdown[b.kind]=(breakdown[b.kind]??0)+1;
  return {area:cells.length,occupied,available:Math.max(0,cells.length-occupied),count:members.length,breakdown};
}
/** Local, continuous supercover paint buffer: no document copies until pointer-up. */
export class DistrictStroke {
  readonly cells=new Map<string,Cell>();private previous?:Cell;
  constructor(readonly size:number){}
  add(p:Cell){const previous=this.previous??p,n=Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)*2));for(let i=0;i<=n;i++){const q={x:previous.x+(p.x-previous.x)*i/n,y:previous.y+(p.y-previous.y)*i/n},r=this.size/2;for(let y=Math.floor(q.y-r);y<=Math.floor(q.y+r);y++)for(let x=Math.floor(q.x-r);x<=Math.floor(q.x+r);x++)if(Math.hypot(x+.5-q.x,y+.5-q.y)<=r+.01)this.cells.set(`${x},${y}`,{x,y});}if(this.size===1){const tile={x:Math.floor(p.x),y:Math.floor(p.y)};this.cells.set(key(tile),tile);}this.previous=p;}
  result(doc:SettlementDocument,d:District,erase=false):District {const cells=new Map(districtCells(d,doc).map(p=>[key(p),p]));for(const [k,p]of this.cells)if(erase)cells.delete(k);else cells.set(k,p);return {...d,cells:districtCells({...d,cells:[...cells.values()]},doc),boundary:undefined};}
}
