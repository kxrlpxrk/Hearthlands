export { manualGeometry } from '../geometry/manualRoad';
import type { Cell, Road } from '../model/document';
import { isBridge } from '../model/infrastructure';
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
