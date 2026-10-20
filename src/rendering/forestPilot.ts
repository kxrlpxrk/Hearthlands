import type {SettlementDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {seededRandom} from '../generator/random';
import {forestImageAssets,type ForestImageAsset} from '../assets/forests/registry';
import {forestScene,type ForestCrown,type ForestScene} from './forestGeometry';
export interface ForestSprite {
 assetId:string;x:number;y:number;angle:number;left:number;top:number;width:number;height:number;radius:number;
}
/** Anchor-relative alpha rectangle, proportional and wholly inside the certified
 * circle at every rotation. No source padding, rocks or branches escape it. */
export function fitForestSprite(c:ForestCrown,a:ForestImageAsset,angle=0):ForestSprite|undefined{
 const b=a.alpha,ax=a.anchor[0]*a.pixelWidth,ay=a.anchor[1]*a.pixelHeight;
 const corner=Math.max(...[b.x,b.x+b.width].flatMap(x=>[b.y,b.y+b.height].map(y=>Math.hypot(x-ax,y-ay))));
 const scale=Math.min((c.radius-.025)/corner,a.diameter/Math.max(b.width,b.height));
 if(!Number.isFinite(scale)||scale<=0||Math.max(b.width,b.height)*scale<(a.role==='single'?.55:1.45))return;
 return {assetId:a.id,x:c.x,y:c.y,angle,left:(b.x-ax)*scale,top:(b.y-ay)*scale,width:b.width*scale,height:b.height*scale,radius:c.radius};
}
export function forestPilotSprites(doc:SettlementDocument,crowns:readonly ForestCrown[]):ForestSprite[]{
 const q=terrainQuery(doc),clusters=new Map<string,{rank:number;sprite:ForestSprite}>(),singles:ForestSprite[]=[];
 const wooded=(x:number,y:number)=>q.inside({x,y})&&q.at({x,y}).vegetation>=.6&&!q.water({x,y})&&q.at({x,y}).ground!=='soil';
 for(const c of crowns){
  const random=seededRandom(doc.seed^Math.imul(Math.round(c.x*1000),73856093)^Math.imul(Math.round(c.y*1000),19349663)^0x6c1b),rank=random();
  // Fixed, source-upright clusters only on north-facing woodland edges; the
  // cropped lower edge faces denser forest. At most one per 8-tile macrocell.
  if(c.density==='edge'&&c.radius>=.85&&rank<.12&&wooded(c.x,c.y+1.8)&&!wooded(c.x,c.y-1.8)){
   const a=forestImageAssets[random()<.5?4:5],sprite=fitForestSprite(c,a);
   if(sprite){const key=`${Math.floor(c.x/8)},${Math.floor(c.y/8)}`,old=clusters.get(key);if(!old||rank<old.rank||rank===old.rank&&(sprite.y<old.sprite.y||sprite.y===old.sprite.y&&sprite.x<old.sprite.x))clusters.set(key,{rank,sprite});continue;}
  }
  if(rank>=.15)continue;
  const a=forestImageAssets.find(a=>a.role==='single'&&a.species===c.species)!;
  const sprite=fitForestSprite(c,a,(random()-.5)*.25);if(sprite)singles.push(sprite);
 }
 const chosen=[...clusters.values()].map(v=>v.sprite).sort((a,b)=>a.y-b.y||a.x-b.x);
 // Neighbouring macrocells also keep clusters separated; never tile a sheet edge.
 const sparse:ForestSprite[]=[];for(const c of chosen)if(sparse.every(p=>Math.hypot(p.x-c.x,p.y-c.y)>=7))sparse.push(c);
 return [...singles,...sparse].sort((a,b)=>a.y-b.y||a.x-b.x);
}
const cache:{base:ForestScene;doc:SettlementDocument;key:string;scene:ForestScene}[]=[];
/** Readiness affects fallback only. It cannot re-roll assignments or positions. */
export function forestPilotScene(doc:SettlementDocument,ready:readonly string[]):ForestScene{
 const base=forestScene(doc);if(!ready.length)return base;
 const key=[...ready].sort().join(','),hit=cache.find(c=>c.base===base&&c.key===key);if(hit)return hit.scene;
 const available=new Set(ready),sprites=forestPilotSprites(doc,base.crowns).filter(s=>available.has(s.assetId));if(!sprites.length)return base;
 // Retain the cohesive procedural canopy as an understory. Small native sprites
 // must not punch bare holes into a dense forest or disappear behind neighbours.
 const scene={...base,sprites};
 cache.push({base,doc,key,scene});if(cache.length>2)cache.shift();return scene;
}
