import { roadContext, roadGeometry } from '../geometry/roadGeometry';
import type { Cell, SettlementDocument } from './document';
import { footprint } from './buildings';
import { infrastructureWidth, isBridge, isDefense, sampledPath } from './infrastructure';
import { MAX_ELEVATION, MIN_ELEVATION, sameTerrain, terrainKey, terrainQuery, type GroundMaterial, type LandscapeCell } from './terrain';
export type TerrainBrush = 'sample'|'raise'|'lower'|'flatten'|'smooth'|'ridge'|'valley'|'water'|'land'|GroundMaterial|'forest'|'clear-forest'|'boulders'|'clear-rocks'|'restore'|'reset';
export interface BrushSettings { brush:TerrainBrush; size:number; strength:number; shape:'circle'|'square'; elevation:number }
export const defaultBrush:BrushSettings={brush:'raise',size:7,strength:1,shape:'circle',elevation:0};
export interface TerrainConflict { id:string; type:'building'|'infrastructure'; name:string; locked:boolean; cells:number }
export interface TerrainPreview { base:SettlementDocument; changes:LandscapeCell[]; blocked:Set<string>; conflicts:TerrainConflict[] }
interface ProtectedObject extends Omit<TerrainConflict,'cells'> { bridge:boolean; defense:boolean }
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const round=(v:number)=>Math.round(v*1000)/1000;
/** Immutable document identity owns this cached spatial safety index. */
const protectionCache=new WeakMap<SettlementDocument['buildings'],WeakMap<SettlementDocument['roads'],{width:number;height:number;seed:number;terrain:SettlementDocument['terrain'];cells:SettlementDocument['landscape']['cells'];index:Map<string,ProtectedObject[]>}>>();
export function terrainProtection(doc:SettlementDocument) {
  const cached=protectionCache.get(doc.buildings)?.get(doc.roads);if(cached?.width===doc.grid.width&&cached.height===doc.grid.height&&cached.seed===doc.seed&&cached.terrain===doc.terrain&&cached.cells===doc.landscape.cells)return cached.index;
  const index=new Map<string,ProtectedObject[]>();
  const add=(x:number,y:number,obj:ProtectedObject)=>{if(x<0||y<0||x>=doc.grid.width||y>=doc.grid.height)return;const k=`${x},${y}`,values=index.get(k)??[];if(!values.some(v=>v.id===obj.id&&v.type===obj.type))values.push(obj);index.set(k,values);};
  for(const b of doc.buildings){const f=footprint(b),obj:ProtectedObject={id:b.id,type:'building',name:b.name,locked:b.locked,bridge:false,defense:false};for(let y=Math.floor(b.y)-1;y<=Math.ceil(b.y+f.height);y++)for(let x=Math.floor(b.x)-1;x<=Math.ceil(b.x+f.width);x++)add(x,y,obj);const entry={x:Math.floor(b.x+Math.floor(f.width/2)),y:Math.floor(b.y+f.height)};for(let y=entry.y-1;y<=entry.y+1;y++)for(let x=entry.x-1;x<=entry.x+1;x++)add(x,y,obj);}
  const context=roadContext(doc);
  for(const r of doc.roads){const radius=infrastructureWidth(r)/2,obj:ProtectedObject={id:r.id,type:'infrastructure',name:r.name??r.surface??r.id,locked:!!r.locked,bridge:isBridge(r),defense:isDefense(r)};
    for(const p of [...sampledPath(r.points,.35),...roadGeometry(doc,r,context).samples.map(p=>({x:p.x-.5,y:p.y-.5}))]){for(let y=Math.floor(p.y+.5-radius)-1;y<=Math.floor(p.y+.5+radius)+1;y++)for(let x=Math.floor(p.x+.5-radius)-1;x<=Math.floor(p.x+.5+radius)+1;x++)add(x,y,obj);}
  }
  let roadCache=protectionCache.get(doc.buildings);if(!roadCache){roadCache=new WeakMap();protectionCache.set(doc.buildings,roadCache);}roadCache.set(doc.roads,{width:doc.grid.width,height:doc.grid.height,seed:doc.seed,terrain:doc.terrain,cells:doc.landscape.cells,index});return index;
}
function threatens(a:LandscapeCell,b:LandscapeCell,obj:ProtectedObject):boolean {
  if(obj.locked)return !sameTerrain(a,b);
  if(a.elevation!==b.elevation)return true;
  if(obj.bridge)return a.water!==b.water||b.vegetation>=.6&&b.vegetation>a.vegetation||b.rocks>=.6&&b.rocks>a.rocks;
  return b.water>=.5&&b.water>a.water||!obj.defense&&(b.vegetation>=.6&&b.vegetation>a.vegetation||b.rocks>=.6&&b.rocks>a.rocks);
}
/** A stroke updates only a small patch map while dragging. No document/history writes. */
export class TerrainStroke {
  readonly patches=new Map<string,LandscapeCell>();
  private readonly weights=new Map<string,number>();
  private last:Cell|undefined;
  private lastDab:Cell|undefined;
  readonly query;
  readonly protection;
  constructor(readonly base:SettlementDocument,readonly settings:BrushSettings){
    if(!Number.isFinite(settings.size)||settings.size<1||settings.size>31||!Number.isFinite(settings.strength)||settings.strength<.05||settings.strength>1||!Number.isFinite(settings.elevation)||settings.elevation<MIN_ELEVATION||settings.elevation>MAX_ELEVATION)throw new Error('Invalid terrain brush settings.');
    this.settings={...settings};
    this.query=terrainQuery(base);this.protection=terrainProtection(base);
  }
  add(point:Cell){
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    const p={x:clamp(point.x,-32,this.base.grid.width+32),y:clamp(point.y,-32,this.base.grid.height+32)};
    if(this.last){const a=this.last,steps=Math.max(1,Math.ceil(Math.hypot(p.x-a.x,p.y-a.y)/Math.max(.4,this.settings.size/6)));for(let j=1;j<=steps;j++)this.dab({x:a.x+(p.x-a.x)*j/steps,y:a.y+(p.y-a.y)*j/steps});}else this.dab(p);this.last=p;
  }
  private dab(p:Cell){
    const {size,shape,strength,brush,elevation}=this.settings,radius=size/2;if(brush==='sample')return;if(size===1){p={x:Math.floor(p.x)+.5,y:Math.floor(p.y)+.5};const last=this.lastDab;if(last&&last.x!==p.x&&last.y!==p.y)this.dab({x:p.x,y:last.y});this.lastDab=p;}
    for(let y=Math.max(0,Math.ceil(p.y-radius-.5));y<=Math.min(this.base.grid.height-1,Math.floor(p.y+radius-.5));y++)for(let x=Math.max(0,Math.ceil(p.x-radius-.5));x<=Math.min(this.base.grid.width-1,Math.floor(p.x+radius-.5));x++){
      const dx=Math.abs(x+.5-p.x),dy=Math.abs(y+.5-p.y),d=shape==='square'?Math.max(dx,dy):Math.hypot(dx,dy);if(d>radius)continue;
      const weight=shape==='square'?1:Math.max(.05,1-d/radius),key=`${x},${y}`;if(weight<=(this.weights.get(key)??0))continue;this.weights.set(key,weight);
      const original=this.query.at({x,y}),next={...original},amount=strength*weight;
      if(brush==='raise'||brush==='ridge')next.elevation=clamp(original.elevation+amount*(brush==='ridge'?8:4),MIN_ELEVATION,MAX_ELEVATION);
      else if(brush==='lower'||brush==='valley')next.elevation=clamp(original.elevation-amount*(brush==='valley'?8:4),MIN_ELEVATION,MAX_ELEVATION);
      else if(brush==='flatten')next.elevation=original.elevation+(elevation-original.elevation)*amount;
      else if(brush==='smooth'){let sum=0,n=0;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(this.query.inside({x:xx,y:yy})){sum+=this.query.at({x:xx,y:yy}).elevation;n++;}next.elevation=original.elevation+(sum/n-original.elevation)*amount;}
      else if(brush==='water')next.water=original.water+(1-original.water)*amount;
      else if(brush==='land')next.water=original.water*(1-amount);
      else if(brush==='forest')next.vegetation=original.vegetation+(1-original.vegetation)*amount;
      else if(brush==='clear-forest')next.vegetation=original.vegetation*(1-amount);
      else if(brush==='boulders')next.rocks=original.rocks+(1-original.rocks)*amount;
      else if(brush==='clear-rocks')next.rocks=original.rocks*(1-amount);
      else if(brush==='restore')Object.assign(next,this.query.original({x,y}));
      else if(brush==='reset')Object.assign(next,{elevation:0,ground:'grass',vegetation:0,water:0,rocks:0});
      else next.ground=brush;
      for(const key of ['elevation','water','vegetation','rocks'] as const)next[key]=round(next[key]);
      if(sameTerrain(original,next))this.patches.delete(key);else this.patches.set(key,next);
    }
  }
  preview():TerrainPreview {
    const blocked=new Set<string>(),conflicts=new Map<string,TerrainConflict>();
    for(const [key,next]of this.patches)for(const obj of this.protection.get(key)??[]){if(!threatens(this.query.at(next),next,obj))continue;blocked.add(key);const k=`${obj.type}:${obj.id}`,conflict=conflicts.get(k)??{id:obj.id,type:obj.type,name:obj.name,locked:obj.locked,cells:0};conflict.cells++;conflicts.set(k,conflict);}
    return {base:this.base,changes:[...this.patches.values()],blocked,conflicts:[...conflicts.values()]};
  }
}
export function commitTerrain(doc:SettlementDocument,preview:TerrainPreview,unaffected=false):SettlementDocument {
  if(doc!==preview.base)throw new Error('Project changed during the terrain preview. Cancel and paint the stroke again.');
  if(preview.conflicts.length&&!unaffected)throw new Error('Review affected structures before applying terrain.');
  const changes=preview.changes.filter(t=>!preview.blocked.has(terrainKey(t)));if(!changes.length)return doc;
  const q=terrainQuery(doc),cells=new Map(doc.landscape.cells.map(t=>[terrainKey(t),t]));for(const t of changes){const k=terrainKey(t);if(sameTerrain(t,q.original(t)))cells.delete(k);else cells.set(k,t);}
  return {...doc,landscape:{...doc.landscape,cells:[...cells.values()].sort((a,b)=>a.y-b.y||a.x-b.x)}};
}
