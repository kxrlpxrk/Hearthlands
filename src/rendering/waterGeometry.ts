import type {Cell,SettlementDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {seededRandom} from '../generator/random';
import {noise} from '../generator/noise';
import {sameGroundInput} from './illustratedGround';
import {footprint} from '../model/buildings';
import {roadContext,roadGeometry} from './roadGeometry';
import {sampledPath} from '../model/infrastructure';
export interface WaterPaint {data:string;fill?:string;stroke?:string;width?:number;opacity?:number}
export interface WaterScene {mask:string;shore:string;loops:readonly (readonly Cell[])[];paints:readonly WaterPaint[];highlights:readonly Cell[];fallback:boolean}
const cache:{doc:SettlementDocument;detail:boolean;scene:WaterScene}[]=[];
const n=(v:number)=>Math.round(v*10000)/10000;
const key=(p:Cell)=>`${n(p.x)},${n(p.y)}`;
const pos=(p:Cell)=>`${n(p.x)} ${n(p.y)}`;
/** Join the same centre/corner coverage triangles used by legacy terrain.
 * Reverse shared edges cancel, leaving oriented coastlines and island holes.
 * All loops are bounded; malformed/degenerate contours retain their exact faces. */
function waterLoops(doc:SettlementDocument){
 const {width,height}=doc.grid,q=terrainQuery(doc),stride=width+1,corners=new Float32Array(stride*(height+1));
 for(let y=0;y<=height;y++)for(let x=0;x<=width;x++){
  let sum=0,count=0;for(let yy=Math.max(0,y-1);yy<=Math.min(height-1,y);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(width-1,x);xx++){sum+=q.at({x:xx,y:yy}).water;count++;}corners[y*stride+x]=sum/count;
 }
 const edges=new Map<string,{a:Cell;b:Cell}>(),faces:string[]=[];
 function face(poly:Cell[]){
  poly=poly.map(p=>({x:n(p.x),y:n(p.y)})).filter((p,i,a)=>key(p)!==key(a[(i+a.length-1)%a.length]));if(poly.length<3)return;
  faces.push('M'+poly.map(pos).join('L')+'Z');
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],forward=key(a)+'>'+key(b),reverse=key(b)+'>'+key(a);if(!edges.delete(reverse))edges.set(forward,{a,b});}
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const value=q.at({x,y}).water,i=y*stride+x,v=[corners[i],corners[i+1],corners[i+stride+1],corners[i+stride]];
  if(value>=.5&&v.every(v=>v>=.5)){face([{x,y},{x:x+1,y},{x:x+1,y:y+1},{x,y:y+1}]);continue;}
  if(value<.5&&v.every(v=>v<.5))continue;
  const points=[{x,y,v:v[0]},{x:x+1,y,v:v[1]},{x:x+1,y:y+1,v:v[2]},{x,y:y+1,v:v[3]}];
  for(let j=0;j<4;j++){
   const tri=[{x:x+.5,y:y+.5,v:value},points[j],points[(j+1)%4]],poly:Cell[]=[];
   for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3];if(a.v>=.5)poly.push(a);if((a.v>=.5)!==(b.v>=.5)){const t=(.5-a.v)/(b.v-a.v);poly.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}
   face(poly);
  }
 }
 const outgoing=new Map<string,string[]>();for(const [id,e]of edges){const k=key(e.a),a=outgoing.get(k)??[];a.push(id);outgoing.set(k,a);}
 const visited=new Set<string>(),loops:Cell[][]=[];let fallback=false;
 for(const [id,edge]of edges){if(visited.has(id))continue;const loop:Cell[]=[];let current:string|undefined=id;
  for(let step=0;current&&!visited.has(current)&&step<=edges.size;step++){
   const e:{a:Cell;b:Cell}=edges.get(current)!;visited.add(current);loop.push(e.a);if(key(e.b)===key(edge.a)){current=undefined;break;}
   current=outgoing.get(key(e.b))?.find(k=>!visited.has(k));if(!current){fallback=true;break;}
  }
  if(loop.length>=3)loops.push(loop);else if(loop.length)fallback=true;
 }
 // Removing collinear vertices keeps large straight coasts and map borders cheap.
 const simplified=loops.map(a=>a.filter((p,i)=>{const before=a[(i+a.length-1)%a.length],after=a[(i+1)%a.length];return Math.abs((p.x-before.x)*(after.y-p.y)-(p.y-before.y)*(after.x-p.x))>.000001;})).filter(a=>a.length>=3);
 return {loops:simplified,fallback,faces};
}
function coast(loop:readonly Cell[],width:number,height:number){
 const border=(a:Cell,b:Cell)=>a.x===b.x&&(a.x===0||a.x===width)||a.y===b.y&&(a.y===0||a.y===height);
 const turns=loop.map((p,i)=>{
  const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length],left=Math.hypot(p.x-a.x,p.y-a.y),right=Math.hypot(p.x-b.x,p.y-b.y),r=border(a,p)||border(p,b)?0:Math.min(.22,left*.28,right*.28);
  return {p,start:{x:p.x+(a.x-p.x)*r/left,y:p.y+(a.y-p.y)*r/left},end:{x:p.x+(b.x-p.x)*r/right,y:p.y+(b.y-p.y)*r/right}};
 });
 let mask='M'+pos(turns[0].start),shore='';
 for(let i=0;i<turns.length;i++){
  const t=turns[i],next=turns[(i+1)%turns.length],curve=`Q${pos(t.p)} ${pos(t.end)}`,line=`L${pos(next.start)}`;mask+=curve+line;
  if(!border(loop[(i+loop.length-1)%loop.length],t.p)&&!border(t.p,next.p))shore+=`M${pos(t.start)}`+curve;
  if(!border(t.p,next.p))shore+=`M${pos(t.end)}`+line;
 }
 return {mask:mask+'Z',shore};
}
/** Pure, camera-independent visual water. No navigation or terrain writes.
 * Gentle sub-tile corner rounding is capped at .22 tiles; all tonal paint and
 * shoreline strokes are clipped to the same mask in Canvas and SVG exports. */
export function illustratedWater(doc:SettlementDocument,detail=true):WaterScene{
 const hit=cache.find(c=>c.detail===detail&&sameGroundInput(c.doc,doc));if(hit)return hit.scene;
 const {width,height}=doc.grid,contours=waterLoops(doc),coasts=contours.loops.map(l=>coast(l,width,height));
 const mask=contours.fallback?contours.faces.join(''):coasts.map(c=>c.mask).join(''),shore=coasts.map(c=>c.shore).join('');
 const paints:WaterPaint[]=[];const highlights:Cell[]=[];
 if(mask){
  // Broad, quiet blue washes, not a repeated wave texture or bitmap surface.
  let washes='';for(let y=-12;y<height+12;y+=19){const top:Cell[]=[],bottom:Cell[]=[];for(let x=-8;x<=width+8;x+=8){const shift=noise(doc.seed+6404,x/24,y/27)*7;top.push({x,y:y+shift});bottom.push({x,y:y+shift+4+noise(doc.seed+6439,x/16,y/23)*5});}const smooth=(points:Cell[])=>points.slice(1).map((p,i)=>{const prev=points[i];return `Q${pos(prev)} ${pos({x:(prev.x+p.x)/2,y:(prev.y+p.y)/2})}`;}).join('');const back=bottom.reverse();washes+='M'+pos(top[0])+smooth(top)+'L'+pos(top[top.length-1])+'L'+pos(back[0])+smooth(back)+'L'+pos(back[back.length-1])+'Z';}
  paints.push({data:washes,fill:'#94bec1',opacity:.09});
  if(shore)paints.push({data:shore,stroke:'#91b5b2',width:3.2,opacity:.16},{data:shore,stroke:'#9cbdba',width:1.15,opacity:.26},{data:shore,stroke:'#c2cfb9',width:.16,opacity:.68});
  if(detail){
   const random=seededRandom(doc.seed^0x6c400),q=terrainQuery(doc),buildings=doc.buildings.map(b=>({...b,...footprint(b)})),context=doc.roads.length?roadContext(doc):undefined,obstacles=doc.roads.flatMap(r=>{const g=roadGeometry(doc,r,context);return sampledPath(g.samples,.5).map(p=>({...p,r:g.width/2+.7}));});
   const safe=(p:Cell)=>q.inside(p)&&q.at(p).water>=.9&&[{x:p.x+.55,y:p.y},{x:p.x-.55,y:p.y},{x:p.x,y:p.y+.4},{x:p.x,y:p.y-.4}].every(c=>q.inside(c)&&q.water(c))&&!buildings.some(b=>p.x>b.x-.8&&p.x<b.x+b.width+.8&&p.y>b.y-.8&&p.y<b.y+b.height+.8)&&!obstacles.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<o.r+1.3);
   let marks='';for(let i=0;i<Math.ceil(width*height*.014);i++){const p={x:random()*width,y:random()*height},length=.55+random()*.8;if(!safe(p)||!safe({x:p.x+length,y:p.y}))continue;highlights.push(p);marks+=`M${pos(p)}q${n(length*.45)} -.09 ${n(length)} -.015`;}
   if(marks)paints.push({data:marks,stroke:'#c0d7cf',width:.035,opacity:.27});
  }
 }
 const scene={mask,shore,loops:contours.loops,paints,highlights,fallback:contours.fallback};cache.push({doc,detail,scene});if(cache.length>4)cache.shift();return scene;
}
export const waterBase='#608e9b';
/** SVG and the interactive layer consume these exact paths and paint values. */
export function waterSvg(scene:WaterScene){return !scene.mask?'':`<g data-illustrated-water="6C.4"><defs><clipPath id="illustrated-water-mask"><path d="${scene.mask}"/></clipPath></defs><path d="${scene.mask}" fill="${waterBase}"/><g clip-path="url(#illustrated-water-mask)">${scene.paints.map(p=>`<path d="${p.data}" fill="${p.fill??'none'}" ${p.stroke?`stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"`:''} opacity="${p.opacity??1}"/>`).join('')}</g></g>`;}
