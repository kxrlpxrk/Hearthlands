import type { Cell, SettlementDocument } from '../model/document';
import { defaultDistrictView, districtCells, key, type District } from '../model/districts';
export function districtGeometry(doc:SettlementDocument,d:District){
  const cells=districtCells(d,doc),set=new Set(cells.map(key));const edges:string[]=[];
  for(const {x,y}of cells){if(!set.has(`${x},${y-1}`))edges.push(`M${x} ${y}h1`);if(!set.has(`${x+1},${y}`))edges.push(`M${x+1} ${y}v1`);if(!set.has(`${x},${y+1}`))edges.push(`M${x+1} ${y+1}h-1`);if(!set.has(`${x-1},${y}`))edges.push(`M${x} ${y+1}v-1`);}
  const average=cells.length?{x:cells.reduce((s,p)=>s+p.x+.5,0)/cells.length,y:cells.reduce((s,p)=>s+p.y+.5,0)/cells.length}:{x:0,y:0};
  const label=cells.reduce<Cell>((best,p)=>Math.hypot(p.x+.5-average.x,p.y+.5-average.y)<Math.hypot(best.x+.5-average.x,best.y+.5-average.y)?p:best,cells[0]??average);
  return {fill:cells.map(p=>`M${p.x} ${p.y}h1v1h-1Z`).join(''),boundary:edges.join(''),label:{x:label.x+.5,y:label.y+.5}};
}
export function visibleDistricts(doc:SettlementDocument,force=false){return (force||(doc.districtView??defaultDistrictView).visible)?doc.districts.filter(d=>d.visible!==false&&doc.layers.some(l=>l.id===d.layerId&&l.visible)):[];}
