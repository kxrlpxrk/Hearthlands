import type { Cell, Road, SettlementDocument } from '../model/document';
import { infrastructureWarnings, infrastructureWidth, isBridge, sampledPath, segmentProjection, distance } from '../model/infrastructure';
export function manualGeometry(doc:SettlementDocument,r:Road){
  const width=infrastructureWidth(r),points=r.points.map(p=>({x:p.x+.5,y:p.y+.5}));
  if(!points.length)return {data:'',width,samples:[]};
  const others=doc.roads.filter(other=>other.id!==r.id&&other.points.length);
  const junctions=others.flatMap(other=>other.points).map(p=>({x:p.x+.5,y:p.y+.5}));
  const segments=others.flatMap(other=>other.points.slice(1).map((p,i)=>[{x:other.points[i].x+.5,y:other.points[i].y+.5},{x:p.x+.5,y:p.y+.5}]));
  const joined=(a:Cell,p:Cell,b:Cell)=>junctions.some(j=>distance(j,segmentProjection(j,a,p))<.04||distance(j,segmentProjection(j,p,b))<.04)||segments.some(([a,b])=>distance(p,segmentProjection(p,a,b))<.04);
  const commands=[`M${points[0].x} ${points[0].y}`],samples:Cell[]=[points[0]];
  const line=(p:Cell)=>{samples.push(...sampledPath([samples[samples.length-1],p]).slice(1));commands.push(`L${p.x} ${p.y}`);};
  for(let i=1;i<points.length;i++){
    const p=points[i],a=points[i-1],b=points[i+1];
    if(r.style==='planned'||isBridge(r)||!b||joined(a,p,b)){line(p);continue;}
    const before={x:p.x+(a.x-p.x)*.22,y:p.y+(a.y-p.y)*.22},after={x:p.x+(b.x-p.x)*.22,y:p.y+(b.y-p.y)*.22};
    const curve=Array.from({length:24},(_,j)=>{const t=(j+1)/24;return {x:(1-t)**2*before.x+2*(1-t)*t*p.x+t*t*after.x,y:(1-t)**2*before.y+2*(1-t)*t*p.y+t*t*after.y};});
    const test=[samples[samples.length-1],before,...curve].map(p=>({x:p.x-.5,y:p.y-.5}));
    if(infrastructureWarnings(doc,{...r,points:test}).length){line(p);continue;}
    line(before);commands.push(`Q${p.x} ${p.y} ${after.x} ${after.y}`);samples.push(...curve);
  }
  return {data:commands.join(' '),width,samples};
}
export interface InfrastructureStroke {data:string;color:string;width:number;dash?:number[]}
/** Shared vector appearance for live Konva and full-map SVG/PNG exports. */
export function infrastructureStrokes(r:Road,g:{data:string;width:number;samples:Cell[]}):InfrastructureStroke[]{
  const material=r.surface??'dirt',color=({dirt:'#b79e72',gravel:'#aaa48d',cobblestone:'#989d99',timber:'#b18450','wooden-bridge':'#be925c','stone-bridge':'#a2a59f',palisade:'#9c7042',wall:'#9b9e98',fence:'#c19a68',gate:'#e2bf7c'})[material];
  const strokes:InfrastructureStroke[]=[{data:g.data,color:'#30372d',width:g.width+.12},{data:g.data,color,width:g.width}];
  if(['timber','wooden-bridge','stone-bridge','palisade','wall','fence','gate','cobblestone'].includes(material)){
    const segments:string[]=[];let carry=0;
    for(let i=1;i<g.samples.length;i++){const a=g.samples[i-1],b=g.samples[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);carry+=len;if(carry<(['palisade','fence'].includes(material)?.35:.48)||len===0)continue;carry=0;const h=g.width*.44;segments.push(`M${b.x-dy/len*h} ${b.y+dx/len*h}L${b.x+dy/len*h} ${b.y-dx/len*h}`);}
    strokes.push({data:segments.join(' '),color:material==='stone-bridge'||material==='wall'||material==='cobblestone'?'#606760':'#5d432c',width:material==='palisade'?.16:.07});
  }
  if(isBridge(r)&&g.samples.length>1){
    for(const side of [-1,1]){const rail=g.samples.map((p,i,points)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:p.x-(b.y-a.y)/len*g.width*.48*side,y:p.y+(b.x-a.x)/len*g.width*.48*side};});strokes.push({data:rail.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '),color:'#e8cf9f',width:.08});}
  }
  if(material==='gate')strokes.push({data:g.data,color:'#473527',width:.12,dash:[.2,.2]});
  return strokes;
}
