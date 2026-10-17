import type { Cell, Road, SettlementDocument } from '../model/document';
import { seededRandom } from '../generator/random';
import { occupiedCells, cellKey, terrainMap } from '../generator/navigation';
export interface RoadGeometry { data: string; width: number; samples: Cell[] }
export function roadContext(doc: SettlementDocument) {
  const blocked=occupiedCells(doc.buildings),terrain=terrainMap(doc), junctions=new Set<string>();
  const edges=new Map<string,Set<string>>();
  for(const road of doc.roads){
    if(road.points.length){junctions.add(cellKey(road.points[0]));junctions.add(cellKey(road.points[road.points.length-1]));}
    for(let i=1;i<road.points.length;i++)for(const[a,b]of[[road.points[i-1],road.points[i]],[road.points[i],road.points[i-1]]]){const k=cellKey(a);if(!edges.has(k))edges.set(k,new Set());edges.get(k)!.add(cellKey(b));}
  }
  for(const[k,values]of edges)if(values.size>2)junctions.add(k);
  const clear=(point:Cell,radius:number)=>{
    // Conservative square swept footprint of the full rendered stroke, not only its centre.
    for(let y=Math.floor(point.y-radius);y<=Math.floor(point.y+radius);y++)for(let x=Math.floor(point.x-radius);x<=Math.floor(point.x+radius);x++){
      const k=`${x},${y}`;
      if(x<0||y<0||x>=doc.grid.width||y>=doc.grid.height||blocked.has(k)||(terrain.get(k)??'grass')!=='grass')return false;
    }
    return true;
  };
  return {junctions,clear};
}
type Context=ReturnType<typeof roadContext>;
const interpolate=(a:Cell,b:Cell,t:number):Cell=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function lineSamples(a:Cell,b:Cell):Cell[]{const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)*12));return Array.from({length:n},(_,i)=>interpolate(a,b,(i+1)/n));}
/** Pure visual geometry. Never replace or mutate the integer navigation points. */
export function roadGeometry(doc: SettlementDocument, road: Road, context=roadContext(doc)): RoadGeometry {
  const width=road.kind==='primary'?.42:road.kind==='secondary'?.3:road.kind==='access'?.2:.55;
  const organic=road.style==='organic'||road.style==='contextual';
  let points=road.points.map(c=>{
    const random=seededRandom(doc.seed^Math.imul(c.x,374761393)^Math.imul(c.y,668265263));
    return {x:c.x+.5+(organic?(random()-.5)*.05:0),y:c.y+.5+(organic?(random()-.5)*.05:0)};
  });
  if(!points.length)return {data:'',width,samples:[]};
  const pinned=(p:Cell)=>context.junctions.has(`${Math.floor(p.x)},${Math.floor(p.y)}`);
  const clear=(p:Cell)=>context.clear(p,width/2+.065);
  if(organic){
    // Local line-of-sight simplification removes staircase noise only where the
    // entire road width fits. Keep every junction, entrance and network endpoint.
    const simplified:Cell[]=[points[0]];let i=0;
    while(i<points.length-1){let last=Math.min(points.length-1,i+5);for(let j=i+1;j<last;j++)if(pinned(points[j])){last=j;break;}
      while(last>i+1&&!lineSamples(points[i],points[last]).every(clear))last--;
      simplified.push(points[last]);i=last;
    }
    points=simplified;
  }
  const samples:Cell[]=[points[0]],commands=[`M${points[0].x},${points[0].y}`];
  const line=(a:Cell,b:Cell)=>{commands.push(`L${b.x},${b.y}`);samples.push(...lineSamples(a,b));};
  let last=points[0];
  for(let i=1;i<points.length;i++){
    const p=points[i],next=points[i+1];
    if(!organic||!next||pinned(p)){line(last,p);last=p;continue;}
    const before=points[i-1],incoming=Math.hypot(p.x-before.x,p.y-before.y),outgoing=Math.hypot(next.x-p.x,next.y-p.y);
    if(!incoming||!outgoing)continue;
    let r=Math.min(1.15,incoming*.4,outgoing*.4),a:Cell,b:Cell,curve:Cell[];
    // Fall back to cell-contained rounding if broad rounding approaches obstacles.
    do{
      a=interpolate(p,before,r/incoming);b=interpolate(p,next,r/outgoing);
      curve=Array.from({length:24},(_,j)=>{const t=(j+1)/24;return {x:(1-t)**2*a.x+2*(1-t)*t*p.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*p.y+t*t*b.y};});
      if(lineSamples(last,a).every(clear)&&curve.every(clear))break;
      r*=.5;
    }while(r>.06);
    if(!lineSamples(last,a!).every(clear)||!curve!.every(clear)){line(last,p);last=p;continue;}
    line(last,a!);commands.push(`Q${p.x},${p.y} ${b!.x},${b!.y}`);samples.push(...curve!);last=b!;
  }
  return {data:commands.join(' '),width,samples};
}
