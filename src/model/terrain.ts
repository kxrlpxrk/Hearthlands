import type { Cell, SettlementDocument, TerrainKind } from './document';
export type GroundMaterial = 'grass' | 'dirt' | 'sand' | 'rock' | 'soil';
export interface LandscapeCell extends Cell { elevation:number; ground:GroundMaterial; vegetation:number; water:number; rocks:number }
export interface Landscape { version:1; cells:LandscapeCell[]; contours:boolean; detail:boolean }
export const MIN_ELEVATION=-16,MAX_ELEVATION=32,MAX_STEP=2,BUILD_SLOPE=1;
export const terrainKey=(p:Cell)=>`${Math.floor(p.x)},${Math.floor(p.y)}`;
export const emptyLandscape=():Landscape=>({version:1,cells:[],contours:true,detail:true});
/** Legacy forest/stone remain impassable; a material alone does not imply vegetation or boulders. */
export function legacyTerrain(cell:Cell,kind:TerrainKind='grass'):LandscapeCell {
  return {x:Math.floor(cell.x),y:Math.floor(cell.y),elevation:0,ground:kind==='stone'?'rock':'grass',vegetation:kind==='forest'?1:0,water:kind==='water'?1:0,rocks:kind==='stone'?1:0};
}
export const sameTerrain=(a:LandscapeCell,b:LandscapeCell)=>a.elevation===b.elevation&&a.ground===b.ground&&a.vegetation===b.vegetation&&a.water===b.water&&a.rocks===b.rocks;
export interface TerrainQuery {
  at:(p:Cell)=>LandscapeCell; original:(p:Cell)=>LandscapeCell; inside:(p:Cell)=>boolean;
  water:(p:Cell)=>boolean; woodland:(p:Cell)=>boolean; slope:(p:Cell)=>number;
  walkable:(p:Cell)=>boolean; buildable:(p:Cell)=>boolean; step:(a:Cell,b:Cell)=>boolean;
}
const originals=new WeakMap<SettlementDocument['terrain'],Map<string,LandscapeCell>>();
const cache=new WeakMap<SettlementDocument,TerrainQuery>();
export function terrainQuery(doc:SettlementDocument):TerrainQuery {
  const existing=cache.get(doc);if(existing)return existing;
  let originalCells=originals.get(doc.terrain);if(!originalCells){originalCells=new Map(doc.terrain.map(t=>[terrainKey(t),legacyTerrain(t,t.kind)]));originals.set(doc.terrain,originalCells);}
  const edits=new Map((doc.landscape?.cells??[]).map(t=>[terrainKey(t),t]));
  const inside=(p:Cell)=>p.x>=0&&p.y>=0&&p.x<doc.grid.width&&p.y<doc.grid.height;
  const original=(p:Cell)=>{const k=terrainKey(p);let t=originalCells!.get(k);if(!t){t=legacyTerrain(p);originalCells!.set(k,t);}return t;};
  const slopes=new Float32Array(doc.grid.width*doc.grid.height).fill(NaN);
  const at=(p:Cell)=>edits.get(terrainKey(p))??original(p);
  const slope=(p:Cell)=>{if(!inside(p))return 0;const k=Math.floor(p.y)*doc.grid.width+Math.floor(p.x),cached=slopes[k];if(!Number.isNaN(cached))return cached;const h=at(p).elevation,value=Math.max(0,...[{x:Math.floor(p.x)+1,y:Math.floor(p.y)},{x:Math.floor(p.x)-1,y:Math.floor(p.y)},{x:Math.floor(p.x),y:Math.floor(p.y)+1},{x:Math.floor(p.x),y:Math.floor(p.y)-1}].filter(inside).map(c=>Math.abs(at(c).elevation-h)));slopes[k]=value;return value;};
  const clear=(p:Cell)=>{const t=at(p);return inside(p)&&t.water<.5&&t.vegetation<.6&&t.rocks<.6;};
  const walkable=(p:Cell)=>clear(p)&&slope(p)<=MAX_STEP;
  const query:TerrainQuery={at,original,inside,water:p=>inside(p)&&at(p).water>=.5,woodland:p=>inside(p)&&at(p).water<.5&&at(p).vegetation>=.6,slope,walkable,buildable:p=>clear(p)&&slope(p)<=BUILD_SLOPE,step:(a,b)=>walkable(a)&&walkable(b)&&Math.abs(at(a).elevation-at(b).elevation)<=MAX_STEP};
  cache.set(doc,query);return query;
}
export function allTerrain(doc:SettlementDocument):LandscapeCell[]{const q=terrainQuery(doc),cells:LandscapeCell[]=[];for(let y=0;y<doc.grid.height;y++)for(let x=0;x<doc.grid.width;x++)cells.push(q.at({x,y}));return cells;}
export function footprintTerrainWarnings(doc:SettlementDocument,b:{x:number;y:number;width:number;height:number;rotation:number}):string[]{
  const q=terrainQuery(doc),w=b.rotation%180?b.height:b.width,h=b.rotation%180?b.width:b.height,heights:number[]=[];let invalid=false;
  for(let y=Math.floor(b.y);y<Math.ceil(b.y+h);y++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+w);x++){const p={x,y};if(!q.inside(p))continue;if(!q.buildable(p))invalid=true;heights.push(q.at(p).elevation);}
  const warnings:string[]=[];if(invalid)warnings.push('Footprint needs clear, dry, gently sloping ground');if(heights.length&&Math.max(...heights)-Math.min(...heights)>BUILD_SLOPE)warnings.push('Footprint elevation varies by more than 1 m');return warnings;
}
