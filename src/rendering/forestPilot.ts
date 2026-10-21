import type {SettlementDocument} from '../model/document';
import {seededRandom} from '../generator/random';
import {forestImageAssets,type ForestImageAsset} from '../assets/forests/registry';
import {forestScene,forestClearance,composeForestCrowns,type ForestCrown,type ForestScene} from './forestGeometry';
export interface ForestSprite {
 assetId:string;x:number;y:number;angle:number;left:number;top:number;width:number;height:number;radius:number;
}
/** Art-direction limits, not changes to source manifests or terrain. Broad crowns
 * form overlapping groups; the upright pine is deliberately narrower. */
export const forestCanopySizes={beech:4.3,birch:4.1,oak:4.8,pine:3.5} as const;
/** Fit the full alpha rectangle inside a freshly certified group envelope, at any
 * rotation. The old individual crown's aesthetic radius is NOT a clearance limit. */
export function fitForestSprite(c:ForestCrown,a:ForestImageAsset,angle=0,diameter=a.role==='single'?forestCanopySizes[a.species as keyof typeof forestCanopySizes]:a.diameter,minimum=1.05):ForestSprite|undefined{
 const b=a.alpha,ax=a.anchor[0]*a.pixelWidth,ay=a.anchor[1]*a.pixelHeight;
 const corner=Math.max(...[b.x,b.x+b.width].flatMap(x=>[b.y,b.y+b.height].map(y=>Math.hypot(x-ax,y-ay))));
 const scale=Math.min((c.radius-.025)/corner,diameter/Math.max(b.width,b.height));
 if(!Number.isFinite(scale)||scale<=0||Math.max(b.width,b.height)*scale<minimum)return;
 // Store the actual drawing envelope for tight culling, not the unlimited field radius.
 return {assetId:a.id,x:c.x,y:c.y,angle,left:(b.x-ax)*scale,top:(b.y-ay)*scale,width:b.width*scale,height:b.height*scale,radius:corner*scale+.025};
}
/** Small spatial index: bounded neighbour queries for both packing and fallback.
 * No all-pairs tree scan, no camera or image readiness in the placement seed. */
export function forestSpriteIndex(){
 const bins=new Map<string,ForestSprite[]>(),step=4;
 return {
  add(s:ForestSprite){for(let y=Math.floor((s.y-s.radius)/step);y<=Math.floor((s.y+s.radius)/step);y++)for(let x=Math.floor((s.x-s.radius)/step);x<=Math.floor((s.x+s.radius)/step);x++){const k=`${x},${y}`,v=bins.get(k);if(v)v.push(s);else bins.set(k,[s]);}},
  at(x:number,y:number){return bins.get(`${Math.floor(x/step)},${Math.floor(y/step)}`)??[];},
 };
}
export function forestSpriteDistance(s:ForestSprite,x:number,y:number,scale:number){
 const dx=x-s.x,dy=y-s.y,c=Math.cos(s.angle),v=Math.sin(s.angle);
 return Math.hypot((dx*c+dy*v-s.left-s.width/2)/(s.width*scale),(-dx*v+dy*c-s.top-s.height/2)/(s.height*scale));
}
const plans:{doc:SettlementDocument;crowns:readonly ForestCrown[];sprites:ForestSprite[]}[]=[];
export function forestPilotSprites(doc:SettlementDocument,crowns:readonly ForestCrown[]):ForestSprite[]{
 const hit=plans.find(p=>p.crowns===crowns&&p.doc.seed===doc.seed&&p.doc.terrain===doc.terrain&&p.doc.landscape===doc.landscape&&p.doc.planning===doc.planning&&p.doc.buildings===doc.buildings&&p.doc.roads===doc.roads&&p.doc.grid.width===doc.grid.width&&p.doc.grid.height===doc.grid.height);if(hit)return hit.sprites;
 const available=forestClearance(doc),index=forestSpriteIndex(),sprites:ForestSprite[]=[];
 const candidates=crowns.map(c=>{
  const random=seededRandom(doc.seed^Math.imul(Math.round(c.x*1000),73856093)^Math.imul(Math.round(c.y*1000),19349663)^0x6c1b),rank=random();
  const a=forestImageAssets.find(a=>a.role==='single'&&a.species===c.species)!;
  const radius=available(c),sprite=fitForestSprite({...c,radius},a,(random()-.5)*.20,forestCanopySizes[c.species]*(.83+random()*.30));
  return {sprite,rank,interior:radius>=1.4};
 }).filter(c=>c.sprite).sort((a,b)=>Number(b.interior)-Number(a.interior)||a.rank-b.rank||a.sprite!.y-b.sprite!.y||a.sprite!.x-b.sprite!.x);
 for(const {sprite:s} of candidates){
  if(!s||index.at(s.x,s.y).some(p=>forestSpriteDistance(p,s.x,s.y,.35)<1))continue;
  index.add(s);sprites.push(s);
 }
 // Flat-bottom source-sheet clusters stay installed but are deliberately withheld:
 // their cut bases cannot be safely concealed at exposed woodland boundaries.
 // Dense overlapping singles provide the mass instead of a row of cropped sheets.
 sprites.sort((a,b)=>a.y-b.y||a.x-b.x);
 plans.push({doc,crowns,sprites});if(plans.length>2)plans.shift();return sprites;
}
const cache:{base:ForestScene;key:string;scene:ForestScene}[]=[];
/** Readiness changes fallback only, never group assignments or world geometry. */
export function forestPilotScene(doc:SettlementDocument,ready:readonly string[]):ForestScene{
 const base=forestScene(doc);if(!ready.length)return base;
 const key=[...ready].sort().join(','),hit=cache.find(c=>c.base===base&&c.key===key);if(hit)return hit.scene;
 const available=new Set(ready),planned=forestPilotSprites(doc,base.crowns),sprites=planned.filter(s=>available.has(s.assetId));if(!sprites.length)return base;
 const index=forestSpriteIndex();for(const s of sprites)index.add(s);
 // Suppress the procedural canopy where the PNG supplies visible coverage.
 // Leave only a faint, continuous woodland floor beneath the complete composition.
 const fallback=base.crowns.filter(c=>!index.at(c.x,c.y).some(s=>forestSpriteDistance(s,c.x,c.y,.48)<1));
 const floor=(paths:ForestScene['paths'],opacity:number)=>paths.filter(p=>p.opacity===1).map(p=>({...p,stroke:undefined,opacity}));
 const ground=floor(base.paths,.12),fringe=floor(composeForestCrowns(fallback).paths,.22);
 // Missing artwork recovers its own procedural canopy instead of creating holes.
 // The two withheld cropped clusters do not affect fallback of healthy singles.
 const missing=forestSpriteIndex();for(const s of planned)if(!available.has(s.assetId))missing.add(s);
 const recovery=composeForestCrowns(fallback.filter(c=>missing.at(c.x,c.y).some(s=>forestSpriteDistance(s,c.x,c.y,.48)<1))).paths;
 const scene:ForestScene={crowns:base.crowns,sprites,paths:[...ground,...fringe,...recovery],detail:[]};
 cache.push({base,key,scene});if(cache.length>2)cache.shift();return scene;
}
