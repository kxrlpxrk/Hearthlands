import type {Cell,SettlementDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {sampledPath} from '../model/infrastructure';
import {footprint} from '../model/buildings';
import {entrance} from '../generator/navigation';
import {seededRandom} from '../generator/random';
import {noise} from '../generator/noise';
import {roadContext,roadGeometry} from './roadGeometry';
import {forestPalette,resolveForestArt,type ForestSpecies} from './forestArt';
import type {TerrainPath,TerrainChunk} from './terrainGeometry';

export interface ForestCrown extends Cell {
 radius:number; species:ForestSpecies; tone:number; variant:number; angle:number;
 density:'interior'|'edge'|'fringe';
}
export interface ForestScene { crowns:readonly ForestCrown[]; paths:TerrainPath[]; detail:TerrainPath[] }
const resolution=4,step=1/resolution;
const n=(v:number)=>Math.round(v*1000)/1000;
/** Conservative sub-tile clearance field. Chebyshev distance never overestimates
 * Euclidean clearance; subtracting a pixel diagonal also protects cell corners. */
function clearance(doc:SettlementDocument){
 const {width,height}=doc.grid,w=width*resolution+2,h=height*resolution+2;
 const field=new Uint16Array(w*h),q=terrainQuery(doc),wet:Cell[]=[];let woodland=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=q.at({x,y});
  if(t.water>.05)wet.push({x,y});
  if(t.vegetation<.35||t.water>.05||t.ground==='soil')continue;
  woodland++;
  for(let sy=0;sy<resolution;sy++)field.fill(65500,(y*resolution+sy+1)*w+x*resolution+1,(y*resolution+sy+1)*w+(x+1)*resolution+1);
 }
 if(!woodland)return ()=>0;
 const block=(x0:number,y0:number,x1:number,y1:number)=>{
  const left=Math.max(0,Math.floor(x0*resolution)),right=Math.min(width*resolution,Math.ceil(x1*resolution));
  for(let y=Math.max(0,Math.floor(y0*resolution));y<Math.min(height*resolution,Math.ceil(y1*resolution));y++)field.fill(0,(y+1)*w+left+1,(y+1)*w+right+1);
 };
 // Interpolated water corners and the soft illustrated bank extend slightly inland.
 for(const p of wet)block(p.x-.15,p.y-.15,p.x+1.15,p.y+1.15);
 for(const space of doc.planning?.openSpaces??[])if(space.kind!=='expansion')for(const p of space.cells)block(p.x,p.y,p.x+1,p.y+1);
 for(const b of doc.buildings){const f=footprint(b);block(b.x-.3,b.y-.3,b.x+f.width+.3,b.y+f.height+.3);const e=entrance(b);block(e.x-.3,e.y-.2,e.x+1.3,e.y+1.3);}
 // Use the exact rendered/smoothed route, including bridge rails and defensive sections.
 // Densify sparse curve samples too: long manual walls can have >3-tile gaps.
 // Expanded boxes cover the intervals without changing the stored/rendered route.
 const context=doc.roads.length?roadContext(doc):undefined;
 for(const r of doc.roads){const g=roadGeometry(doc,r,context),radius=g.width/2+.32;for(const p of sampledPath(g.samples,.18))block(p.x-radius,p.y-radius,p.x+radius,p.y+radius);}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(field[i])field[i]=Math.min(field[i],field[i-1]+1,field[i-w-1]+1,field[i-w]+1,field[i-w+1]+1);}
 for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(field[i])field[i]=Math.min(field[i],field[i+1]+1,field[i+w-1]+1,field[i+w]+1,field[i+w+1]+1);}
 return (p:Cell)=>{
  if(p.x<0||p.y<0||p.x>=width||p.y>=height)return 0;
  const x=Math.floor(p.x*resolution),y=Math.floor(p.y*resolution);
  // Account for any position inside the sampled pixel, not just its centre.
  return Math.max(0,field[(y+1)*w+x+1]*step-step*Math.SQRT2);
 };
}
/** Camera-independent, bounded, spatially seeded canopy layout. No document writes. */
export function forestCrowns(doc:SettlementDocument):ForestCrown[]{
 const available=clearance(doc),q=terrainQuery(doc),crowns:ForestCrown[]=[];
 function candidate(x:number,y:number,indexX:number,indexY:number,edge=false){
  const random=seededRandom(doc.seed^Math.imul(indexX+1,374761393)^Math.imul(indexY+1,668265263)^(edge?92171:0));
  const p={x:x+(random()-.5)*(edge?.55:.95),y:y+(random()-.5)*(edge?.55:.95)},space=available(p);
  if(space<.13||edge&&space>.65)return;
  const t=q.at(p),density=space>1.25?'interior':space>.5?'edge':'fringe';
  // Partial brush coverage and small edge gaps produce sparse, stable fringes.
  if(random()>Math.min(1,t.vegetation*1.3)||(density==='fringe'&&random()<.2))return;
  const radius=Math.min(space-.012,edge?.22+random()*.32:.78+random()*.5);
  if(radius<.13)return;
  const species:ForestSpecies=noise(doc.seed+128,p.x/9,p.y/9)>.58||random()<.2?'pine':(['beech','birch','oak'] as const)[Math.floor(random()*3)];
  const tone=species==='pine'?3:Math.min(2,Math.floor(noise(doc.seed+452,p.x/6,p.y/6)*3+random()*.7));
  crowns.push({...p,radius,species,tone,variant:random(),angle:random()*Math.PI*2,density});
 }
 const spacing=1.13;
 for(let j=0;j<Math.ceil(doc.grid.height/spacing);j++)for(let i=0;i<Math.ceil(doc.grid.width/spacing);i++)candidate((i+.5)*spacing,(j+.5)*spacing,i,j);
 // A separately seeded small-crown fringe follows thin/irregular painted woodland.
 for(let y=0;y<doc.grid.height;y++)for(let x=0;x<doc.grid.width;x++)if(q.at({x,y}).vegetation>=.35)candidate(x+.5,y+.5,x,y,true);
 return crowns.sort((a,b)=>a.y-b.y||a.x-b.x);
}
/** Closed quadratic splines stay inside the crown's certified circular envelope. */
function outline(c:ForestCrown,scale=1,dx=0,dy=0){
 const artwork=resolveForestArt(c.species),conifer=artwork.source.kind==='procedural'&&artwork.source.shape==='conifer';
 const count=conifer?12:16,random=seededRandom(Math.floor(c.variant*0xffffffff)),points:Cell[]=[];
 for(let i=0;i<count;i++){
  const a=c.angle+i*Math.PI*2/count;
  const radius=c.radius*scale*(conifer?(i%2?.67:.99):(i%2?.76:.9)+random()*.09);
  points.push({x:c.x+dx+Math.cos(a)*radius,y:c.y+dy+Math.sin(a)*radius});
 }
 const middle=(a:Cell,b:Cell)=>`${n((a.x+b.x)/2)} ${n((a.y+b.y)/2)}`;
 return `M${middle(points[count-1],points[0])}`+points.map((p,i)=>`Q${n(p.x)} ${n(p.y)} ${middle(p,points[(i+1)%count])}`).join('')+'Z';
}
/** Each crown belongs to one 16-tile spatial chunk, with padded culling bounds.
 * Combining visible native paths before a single fill avoids duplicated curves,
 * clipping seams and alpha differences. Exports use the same complete curves. */
function compose(crowns:readonly ForestCrown[]):ForestScene{
 type Batch={parts:string[];chunks:Map<string,{bounds:TerrainChunk['bounds'];parts:string[]}>};
 const batch=():Batch=>({parts:[],chunks:new Map()});
 const bodies=forestPalette.map(batch),edges=forestPalette.map(batch),lights=forestPalette.map(batch),veins=forestPalette.map(batch);
 function add(group:Batch,c:ForestCrown,data:string){
  group.parts.push(data);const size=16,padding=1.35,x=Math.floor(c.x/size),y=Math.floor(c.y/size),key=`${x},${y}`;
  let chunk=group.chunks.get(key);if(!chunk){chunk={bounds:{x:x*size-padding,y:y*size-padding,width:size+2*padding,height:size+2*padding},parts:[]};group.chunks.set(key,chunk);}chunk.parts.push(data);
 }
 for(const c of crowns){
  add(bodies[c.tone],c,outline(c));
  // Inset tonal patches never exceed the certified envelope, including offsets.
  add(edges[c.tone],c,outline(c,.62,c.radius*.16,c.radius*.17));
  add(lights[c.tone],c,outline({...c,variant:(c.variant+.37)%1},.60,-c.radius*.17,-c.radius*.16));
  if(c.radius>.38){const r=c.radius;add(veins[c.tone],c,c.species==='pine'?`M${n(c.x-r*.18)} ${n(c.y-r*.32)}l${n(r*.36)} ${n(r*.59)}m${n(-r*.33)} ${n(-r*.19)}l${n(r*.32)} ${n(-r*.1)}`:`M${n(c.x-r*.35)} ${n(c.y-r*.05)}q${n(-r*.05)} ${n(-r*.32)} ${n(r*.26)} ${n(-r*.34)}`);}
 }
 const path=(group:Batch,paint:Omit<TerrainPath,'data'>):TerrainPath=>({...paint,layer:'nature',data:group.parts.join(''),chunks:[...group.chunks.values()].map(c=>({bounds:c.bounds,data:c.parts.join('')}))});
 const paths:TerrainPath[]=[],detail:TerrainPath[]=[];
 for(let i=0;i<forestPalette.length;i++)if(bodies[i].parts.length)paths.push(path(bodies[i],{fill:forestPalette[i].base,stroke:forestPalette[i].ink,width:.018,opacity:1}));
 for(let i=0;i<forestPalette.length;i++)if(bodies[i].parts.length){
  paths.push(path(edges[i],{fill:forestPalette[i].ink,opacity:.16}));
  paths.push(path(lights[i],{fill:forestPalette[i].light,opacity:.27}));
  if(veins[i].parts.length)detail.push(path(veins[i],{stroke:forestPalette[i].light,width:.025,opacity:.35}));
 }
 return {crowns,paths,detail};
}
// Two immutable inputs retain at most two layouts. Full/reduced zoom shares geometry.
const cache:{doc:SettlementDocument;scene:ForestScene}[]=[];
export function forestScene(doc:SettlementDocument):ForestScene{
 const i=cache.findIndex(({doc:d})=>d.terrain===doc.terrain&&d.landscape===doc.landscape&&d.planning===doc.planning&&d.buildings===doc.buildings&&d.roads===doc.roads&&d.seed===doc.seed&&d.grid.width===doc.grid.width&&d.grid.height===doc.grid.height);
 if(i>=0){const [hit]=cache.splice(i,1);cache.push(hit);return hit.scene;}
 const scene=compose(forestCrowns(doc));cache.push({doc,scene});if(cache.length>2)cache.shift();return scene;
}
