import type {SettlementDocument} from '../model/document';
import type {ForestSpecies} from './forestArt';
import {seededRandom} from '../generator/random';
import {canopyVariants,type CanopyAsset} from '../assets/forests/canopies/registry';
import {forestScene,forestClearance,composeForestCrowns,type ForestScene,type ForestCrown} from './forestGeometry';
import {forestPilotSprites,fitForestSprite,forestSpriteIndex,forestSpriteDistance,type ForestSprite} from './forestPilot';
const pools=Object.fromEntries((['beech','birch','oak','pine'] as const).map(s=>[s,canopyVariants(s)])) as Record<ForestSpecies,CanopyAsset[]>;
/** Separate stream: changing the asset pool cannot reshuffle the woodland positions. */
export function canopyVariation(seed:number,c:Pick<ForestCrown,'x'|'y'|'species'>){
 const random=seededRandom(seed^Math.imul(Math.round(c.x*1000),19349663)^Math.imul(Math.round(c.y*1000),73856093)^0x6c1c),pool=pools[c.species];
 let pick=random()*pool.reduce((n,a)=>n+a.weight,0);
 return pool.find(a=>(pick-=a.weight)<=0)??pool[pool.length-1];
}
const plans:{base:ForestScene;sprites:ForestSprite[]}[]=[];
export function forestCanopySprites(doc:SettlementDocument):ForestSprite[]{
 const base=forestScene(doc),hit=plans.find(p=>p.base===base);if(hit)return hit.sprites;
 const original=forestPilotSprites(doc,base.crowns),sprites:ForestSprite[]=[],index=forestSpriteIndex(),byPoint=new Map(base.crowns.map(c=>[`${c.x},${c.y}`,c]));
 const randomAt=(c:ForestCrown)=>seededRandom(doc.seed^Math.imul(Math.round(c.x*1000),374761393)^Math.imul(Math.round(c.y*1000),668265263)^0x6c1c);
 for(const old of original){
  const c=byPoint.get(`${old.x},${old.y}`)!,a=canopyVariation(doc.seed,c),random=randomAt(c);
  // Keep every existing group anchor and its certified envelope. Canopy-only art
  // can rotate freely; no rotation or enlargement can escape that circle.
  const s=fitForestSprite({...c,radius:old.radius},a,random()*Math.PI*2,a.diameter*(.88+random()*.24),.22);
  if(s){sprites.push(s);index.add(s);}
 }
 // Small, irregular edge canopies replace the old exposed flat procedural remnants.
 // Reuse original candidate positions/species; never invent land or cover a clearing.
 const available=forestClearance(doc);
 const edge=base.crowns.filter(c=>available(c)<1.4).map(c=>({c,rank:randomAt(c)()})).sort((a,b)=>a.rank-b.rank||a.c.y-b.c.y||a.c.x-b.c.x);
 for(const {c,rank} of edge){
  if(index.at(c.x,c.y).some(s=>forestSpriteDistance(s,c.x,c.y,.49)<1))continue;
  if(c.density==='fringe'&&rank>.78)continue;
  const a=canopyVariation(doc.seed,c),random=randomAt(c);
  const s=fitForestSprite({...c,radius:available(c)},a,random()*Math.PI*2,.55+random()*.95,.22);
  if(s){sprites.push(s);index.add(s);}
 }
 sprites.sort((a,b)=>a.y-b.y||a.x-b.x);
 plans.push({base,sprites});if(plans.length>2)plans.shift();return sprites;
}
const cache:{base:ForestScene;key:string;scene:ForestScene}[]=[];
export function forestCanopyScene(doc:SettlementDocument,ready:readonly string[]):ForestScene{
 const base=forestScene(doc);if(!ready.length)return base;
 const key=[...ready].sort().join(','),hit=cache.find(c=>c.base===base&&c.key===key);if(hit)return hit.scene;
 const available=new Set(ready),planned=forestCanopySprites(doc),sprites=planned.filter(s=>available.has(s.assetId));if(!sprites.length)return base;
 const present=forestSpriteIndex(),missing=forestSpriteIndex();for(const s of planned)(available.has(s.assetId)?present:missing).add(s);
 // Healthy mode has NO procedural crown layer, floor wash or dark overlay.
 // Recover only unavailable images, beneath the remaining healthy artwork.
 const recovery=base.crowns.filter(c=>missing.at(c.x,c.y).some(s=>forestSpriteDistance(s,c.x,c.y,.5)<1)&&!present.at(c.x,c.y).some(s=>forestSpriteDistance(s,c.x,c.y,.48)<1));
 const scene:ForestScene={crowns:base.crowns,sprites,paths:composeForestCrowns(recovery).paths,detail:[]};
 cache.push({base,key,scene});if(cache.length>2)cache.shift();return scene;
}
