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
