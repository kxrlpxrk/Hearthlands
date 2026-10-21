import type {TerrainChunk} from './terrainGeometry';
import type {SettlementDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {footprint} from '../model/buildings';
import {grasslandClearance} from './grasslandGeometry';
import {noise} from '../generator/noise';
/** Stable IDs, never registry array offsets. The marsh source is its audited dry crop. */
export const groundMaterialIds={base:'hearthlands.terrain.grassland.base.01',flower1:'hearthlands.terrain.grassland.flower.01',flower2:'hearthlands.terrain.grassland.flower.02',scrub:'hearthlands.terrain.grassland.scrub.01',rocky:'hearthlands.terrain.grassland.rocky.01',marsh:'hearthlands.terrain.grassland.marsh.01'} as const;
export const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export interface GroundPlan {width:number;height:number;seed:number;stride:number;rows:number;step:number;values:Float32Array;detail:readonly {data:string;color:string;chunks:TerrainChunk[]}[]}
// alpha, RGB, wildness, flower1, flower2, scrub, rocky, marsh, warp X/Y
export const GROUND_CHANNELS=12;
const plans:{doc:SettlementDocument;plan:GroundPlan}[]=[];
export function sameGroundInput(a:SettlementDocument,b:SettlementDocument){return a.terrain===b.terrain&&a.landscape===b.landscape&&a.planning===b.planning&&a.buildings===b.buildings&&a.roads===b.roads&&a.seed===b.seed&&a.grid.width===b.grid.width&&a.grid.height===b.grid.height;}
/** Immutable world-space regional field. Camera, style detail and image readiness
 * never enter planning. Half-tile nodes are conservatively clear before interpolation. */
export function illustratedGroundPlan(doc:SettlementDocument):GroundPlan{
 const hit=plans.find(e=>sameGroundInput(e.doc,doc));if(hit)return hit.plan;
 const {width,height}=doc.grid,step=.5,stride=width*2+1,rows=height*2+1,values=new Float32Array(stride*rows*GROUND_CHANNELS),clear=grasslandClearance(doc),q=terrainQuery(doc);
 const wet=new Float32Array(width*height).fill(99),wood=new Float32Array(width*height).fill(99);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const t=q.at({x,y}),i=y*width+x;if(t.water>0)wet[i]=0;if(t.vegetation>=.2)wood[i]=0;}
 for(const a of [wet,wood]){for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(x)a[i]=Math.min(a[i],a[i-1]+1);if(y)a[i]=Math.min(a[i],a[i-width]+1);}for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(x<width-1)a[i]=Math.min(a[i],a[i+1]+1);if(y<height-1)a[i]=Math.min(a[i],a[i+width]+1);}}
 const buildings=doc.buildings.map(b=>({...b,...footprint(b)}));
 for(let j=0;j<rows;j++)for(let i=0;i<stride;i++){
  const x=i*step,y=j*step,k=(j*stride+i)*GROUND_CHANNELS,space=clear({x,y});if(space<=.8)continue;
  const t=q.at({x,y}),idx=Math.min(height-1,Math.floor(y))*width+Math.min(width-1,Math.floor(x));
  const village=buildings.reduce((d,b)=>Math.min(d,Math.hypot(Math.max(b.x-x,0,x-b.x-b.width),Math.max(b.y-y,0,y-b.y-b.height))),40),wild=smooth(2,11,village);
  const broad=noise(doc.seed+6301,x/23,y/23),medium=noise(doc.seed+6311,x/7,y/7),fine=noise(doc.seed+6321,x/2.7,y/2.7),n=broad*.58+medium*.3+fine*.12,gold=smooth(.53,.78,broad)*wild;
  values[k]=smooth(.8,2,space);values[k+1]=119+n*35+gold*17;values[k+2]=143+n*28+gold*6;values[k+3]=78+n*17-gold*2;values[k+4]=wild;
  const damp=(1-smooth(2,6,wet[idx]))*(1-smooth(1,3,t.elevation));
  const rocky=Math.max(smooth(.08,.5,t.rocks),smooth(.8,4,t.elevation));
  values[k+9]=damp*.75;values[k+8]=rocky*.65*(1-damp);
  values[k+7]=Math.max(smooth(.56,.77,1-medium),.23*(1-smooth(1,6,wood[idx])))*wild*(1-damp)*(1-rocky);
  const flowers=smooth(.55,.72,noise(doc.seed+6331,x/10,y/10))*wild*(1-damp)*(1-rocky);
  const variety=smooth(.35,.65,noise(doc.seed+6341,x/15,y/15));values[k+5]=flowers*(1-variety)*.62;values[k+6]=flowers*variety*.62;
  values[k+10]=noise(doc.seed+6351,x/8,y/8)*1.9;values[k+11]=noise(doc.seed+6361,x/8,y/8)*1.9;
 }
 const strokes=[{color:'#c8c985',parts:[] as string[],chunks:new Map<string,string[]>()},{color:'#71914c',parts:[] as string[],chunks:new Map<string,string[]>()},{color:'#d5c77e',parts:[] as string[],chunks:new Map<string,string[]>()}];
 const rnd=(v:number)=>Math.round(v*1000)/1000;
 for(let y=.5;y<height;y+=.85)for(let x=.5;x<width;x+=.85){const r=groundGrain(doc.seed+6391,x,y),px=x+(r-.5)*.6,py=y+(groundGrain(doc.seed+6393,x,y)-.5)*.6;if(clear({x:px,y:py})<1.5||r<.18)continue;
  const group=strokes[Math.floor(r*3)%3],data=`M${rnd(px-.08)} ${rnd(py+.06)}q.08 -.05 .1 -.18M${rnd(px+.05)} ${rnd(py+.06)}q.09 -.04 .14 -.14`,key=`${Math.floor(px/16)*16}:${Math.floor(py/16)*16}`;group.parts.push(data);const chunk=group.chunks.get(key)??[];chunk.push(data);group.chunks.set(key,chunk);
 }
 const detail=strokes.map(s=>({color:s.color,data:s.parts.join(''),chunks:[...s.chunks].map(([key,data])=>{const [x,y]=key.split(':').map(Number);return {bounds:{x:x-.3,y:y-.3,width:16.6,height:16.6},data:data.join('')};})}));
 const plan={width,height,seed:doc.seed,stride,rows,step,values,detail};plans.push({doc,plan});if(plans.length>2)plans.shift();return plan;
}
/** Bilinear field interpolation retains broad regions at every output density. */
export function groundAt(plan:GroundPlan,x:number,y:number,out=new Float32Array(GROUND_CHANNELS)){
 const fx=Math.max(0,Math.min(plan.stride-1.000001,x/plan.step)),fy=Math.max(0,Math.min(plan.rows-1.000001,y/plan.step)),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,k=(j*plan.stride+i)*GROUND_CHANNELS;
 const a=(1-u)*(1-v)*plan.values[k],b=u*(1-v)*plan.values[k+GROUND_CHANNELS],c=(1-u)*v*plan.values[k+plan.stride*GROUND_CHANNELS],d=u*v*plan.values[k+(plan.stride+1)*GROUND_CHANNELS],alpha=a+b+c+d;out[0]=alpha;
 // Premultiplied interpolation prevents empty nodes' zero RGB from producing
 // a dark matte around protected terrain and structures.
 const inverse=alpha>0?1/alpha:0;
 for(let channel=1;channel<GROUND_CHANNELS;channel++)out[channel]=(plan.values[k+channel]*a+plan.values[k+GROUND_CHANNELS+channel]*b+plan.values[k+plan.stride*GROUND_CHANNELS+channel]*c+plan.values[k+(plan.stride+1)*GROUND_CHANNELS+channel]*d)*inverse;
 return out;
}
export function groundSurfaceSize(plan:GroundPlan,density=16,exporting=false){const scale=Math.min(exporting?32:16,Math.max(4,density),(exporting?3072:2048)/Math.max(plan.width,plan.height));return {width:Math.round(plan.width*scale),height:Math.round(plan.height*scale),scale};}
/** Fast stateless fine grain, anchored in world coordinates, never screen pixels. */
export function groundGrain(seed:number,x:number,y:number){let h=seed^Math.imul(Math.floor(x*24),374761393)^Math.imul(Math.floor(y*24),668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}



export interface GroundRegion {x:number;y:number;width:number;height:number}
export function groundDetailRegions(plan:GroundPlan,viewport:GroundRegion,pixelsPerTile:number):GroundRegion[]{
 if(pixelsPerTile<24)return [];
 const edge=16,regions:GroundRegion[]=[];
 for(let y=Math.max(0,Math.floor((viewport.y-3)/edge)*edge);y<Math.min(plan.height,viewport.y+viewport.height+3);y+=edge)for(let x=Math.max(0,Math.floor((viewport.x-3)/edge)*edge);x<Math.min(plan.width,viewport.x+viewport.width+3);x+=edge)regions.push({x,y,width:Math.min(edge,plan.width-x),height:Math.min(edge,plan.height-y)});
 const cx=viewport.x+viewport.width/2,cy=viewport.y+viewport.height/2;
 return regions.sort((a,b)=>Math.hypot(a.x+8-cx,a.y+8-cy)-Math.hypot(b.x+8-cx,b.y+8-cy)).slice(0,9);
}
