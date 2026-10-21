import type {Cell,SettlementDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {footprint} from '../model/buildings';
import {entrance} from '../generator/navigation';
import {seededRandom} from '../generator/random';
import {noise} from '../generator/noise';
import {sampledPath} from '../model/infrastructure';
import {roadContext,roadGeometry} from './roadGeometry';
import {grasslandAssets,type GrasslandMode,type GrasslandKind} from '../assets/grassland/registry';
export interface GrasslandPatch extends Cell {assetId:string;radius:number;angle:number;variant:number}
export const grasslandMaskEdge=384,grasslandMaskVariants=3;
/** One shared feather definition, baked once per asset/variant. All alpha is
 * inside the certified unit circle; no blur/filter can leak over obstacles. */
export function grasslandAlpha(x:number,y:number,variant:number){
 const a=Math.atan2(y,x),phase=variant*2.17,r=.76+.10*Math.sin(3*a+phase)+.065*Math.sin(5*a-phase)+.035*Math.cos(7*a+phase);
 const d=Math.hypot(x,y)/r,t=Math.max(0,Math.min(1,(1-d)/.43));
 return t*t*(3-2*t);
}
/** Quarter-tile conservative distance field for decorative OPEN LAND only.
 * Independent from forest geometry: enabling the pilot cannot move a tree. */
export function grasslandClearance(doc:SettlementDocument){
 const {width,height}=doc.grid,w=width*4+2,h=height*4+2,field=new Uint16Array(w*h),q=terrainQuery(doc);
 const block=(x0:number,y0:number,x1:number,y1:number)=>{
  const left=Math.max(0,Math.min(width*4,Math.floor(x0*4))),right=Math.max(0,Math.min(width*4,Math.ceil(x1*4)));if(right<=left)return;
  for(let y=Math.max(0,Math.floor(y0*4));y<Math.min(height*4,Math.ceil(y1*4));y++)field.fill(0,(y+1)*w+left+1,(y+1)*w+right+1);
 };
 const wet:Cell[]=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=q.at({x,y});if(t.water>0)wet.push({x,y});
  if(t.ground!=='grass'||t.vegetation>=.2||t.water>0||q.slope(t)>2)continue;
  for(let sy=0;sy<4;sy++)field.fill(65500,(y*4+sy+1)*w+x*4+1,(y*4+sy+1)*w+(x+1)*4+1);
 }
 // Include the interpolated shoreline and a quiet bank margin.
 for(const p of wet)block(p.x-.5,p.y-.5,p.x+1.5,p.y+1.5);
 for(const s of doc.planning?.openSpaces??[])if(s.kind!=='expansion')for(const p of s.cells)block(p.x,p.y,p.x+1,p.y+1);
 for(const b of doc.buildings){const f=footprint(b),e=entrance(b);block(b.x-.4,b.y-.4,b.x+f.width+.4,b.y+f.height+.4);block(e.x-.4,e.y-.3,e.x+1.4,e.y+1.4);}
 const context=doc.roads.length?roadContext(doc):undefined;
 for(const r of doc.roads){const g=roadGeometry(doc,r,context),margin=g.width/2+.45;for(const p of sampledPath(g.samples,.18))block(p.x-margin,p.y-margin,p.x+margin,p.y+margin);}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(field[i])field[i]=Math.min(field[i],field[i-1]+1,field[i-w-1]+1,field[i-w]+1,field[i-w+1]+1);}
 for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;if(field[i])field[i]=Math.min(field[i],field[i+1]+1,field[i+w-1]+1,field[i+w]+1,field[i+w+1]+1);}
 return (p:Cell)=>p.x<0||p.y<0||p.x>=width||p.y>=height?0:Math.max(0,field[(Math.floor(p.y*4)+1)*w+Math.floor(p.x*4)+1]/4-Math.SQRT2/4);
}
const cache:{doc:SettlementDocument;mode:GrasslandMode;patches:readonly GrasslandPatch[]}[]=[];
/** Bounded seeded proposals, not repeating texture tiles. Camera/readiness never
 * enters selection. Failed images leave quiet original ground, without rerolls. */
export function grasslandPatches(doc:SettlementDocument,mode:GrasslandMode):readonly GrasslandPatch[]{
 if(mode==='off')return [];
 const hit=cache.find(c=>c.doc.terrain===doc.terrain&&c.doc.landscape===doc.landscape&&c.doc.planning===doc.planning&&c.doc.buildings===doc.buildings&&c.doc.roads===doc.roads&&c.doc.grid.width===doc.grid.width&&c.doc.grid.height===doc.grid.height&&c.doc.seed===doc.seed&&c.mode===mode);if(hit)return hit.patches;
 const available=grasslandClearance(doc),q=terrainQuery(doc),patches:GrasslandPatch[]=[],spacing=6.5;
 for(let j=0;j<Math.ceil(doc.grid.height/spacing);j++)for(let i=0;i<Math.ceil(doc.grid.width/spacing);i++){
  const random=seededRandom(doc.seed^Math.imul(i+1,912931)^Math.imul(j+1,374761393)^0x6c200),x=(i+random())*spacing,y=(j+random())*spacing;
  if(random()>(mode==='accents'?.57:.33))continue;
  const space=available({x,y});if(space<1.4)continue;
  const t=q.at({x,y});let wet=false;
  for(let yy=Math.max(0,Math.floor(y)-5);yy<=Math.min(doc.grid.height-1,Math.floor(y)+5)&&!wet;yy++)for(let xx=Math.max(0,Math.floor(x)-5);xx<=Math.min(doc.grid.width-1,Math.floor(x)+5);xx++)if(q.water({x:xx,y:yy})&&Math.hypot(xx+.5-x,yy+.5-y)<5.5){wet=true;break;}
  const climate=noise(doc.seed+6192,x/15,y/15),roll=random();
  const kind:GrasslandKind=wet&&t.elevation<=1.5?'marsh':t.rocks>.15||t.elevation>1?'rocky':climate<.39?'scrub':roll<.22?'flower':'base';
  const candidates=grasslandAssets.filter(a=>a.kind===kind),asset=candidates[Math.floor(random()*candidates.length)];
  const radius=Math.min(space-.03,kind==='marsh'?1.6+random()*.7:2.1+random()*1.7);
  if(patches.some(p=>Math.hypot(p.x-x,p.y-y)<p.radius+radius+.4))continue;
  patches.push({x,y,assetId:asset.id,radius,angle:random()*Math.PI*2,variant:Math.floor(random()*grasslandMaskVariants)});
 }
 cache.push({doc,mode,patches});if(cache.length>4)cache.shift();return patches;
}
