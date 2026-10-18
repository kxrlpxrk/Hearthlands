import type { Cell, SettlementDocument } from '../model/document';
import { districtTypes, type District, type DistrictType } from '../model/districts';
import { footprint } from '../model/buildings';
import { terrainQuery } from '../model/terrain';
interface Anchor {id:string;type:DistrictType;name:string;point:Cell}
/** Deterministic, bounded multi-source flood on land. It annotates a document only;
 * settlement objects and manually edited districts are never modified here. */
export function detectDistricts(doc:SettlementDocument):District[] {
  if(!doc.buildings.length)throw new Error('Place or generate buildings before detecting districts.');
  const q=terrainQuery(doc),w=doc.grid.width,h=doc.grid.height,n=w*h,anchors:Anchor[]=[];
  const centre=(b:typeof doc.buildings[number])=>{const f=footprint(b);return{x:b.x+f.width/2,y:b.y+f.height/2};};
  const of=(kinds:string[])=>doc.buildings.filter(b=>kinds.includes(b.kind));
  const average=(points:Cell[])=>({x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length});
  const add=(id:string,type:DistrictType,name:string,points:Cell[],fallback?:Cell)=>{if(points.length||fallback)anchors.push({id,type,name,point:points.length?average(points):fallback!});};
  add('civic','civic','Hearth & gathering ground',of(['longhouse','townhall']).map(centre),doc.planning?.centre);
  add('harbour','harbour','Harbour working ground',of(['harbour','fishinghut','shipyard']).map(centre));
  add('workshops','industrial','Workshop quarter',of(['blacksmith','sawmill','mill','warehouse','storehouse']).map(centre));
  add('farms','farming','Farmsteads & fields',of(['farm']).map(centre));
  const homes=of(['cottage','tavern','stables']);
  const clusters=doc.planning?.clusters.filter(c=>c.role==='residential')??[];
  if(homes.length){if(clusters.length>1&&doc.buildings.length>=30){for(const c of clusters.slice(0,2)){const group=homes.filter(b=>clusters.reduce((best,a)=>Math.hypot(centre(b).x-a.centre.x,centre(b).y-a.centre.y)<Math.hypot(centre(b).x-best.centre.x,centre(b).y-best.centre.y)?a:best).id===c.id);if(group.length)add(c.id,'residential',`${anchors.filter(a=>a.type==='residential').length?'Lower':'Upper'} homesteads`,group.map(centre));}}else add('homes','residential','Village homes',homes.map(centre));}
  if(doc.buildings.length>=40)add('market','market','Market quarter',of(['market']).map(centre));
  if(of(['barracks','watchtower']).length>=3)add('defences','military','Defensive quarter',of(['barracks','watchtower']).map(centre));
  if(!anchors.length)add('settlement','residential','Settlement',doc.buildings.map(centre));
  // Limit the claimed land to actual development, gathering grounds and small yards.
  const domain=new Uint8Array(n),owner=new Int16Array(n).fill(-1);
  for(const b of doc.buildings){const f=footprint(b),margin=of(['farm']).includes(b)?6:4;for(let y=Math.max(0,Math.floor(b.y-margin));y<Math.min(h,b.y+f.height+margin);y++)for(let x=Math.max(0,Math.floor(b.x-margin));x<Math.min(w,b.x+f.width+margin);x++)if(!q.water({x,y}))domain[y*w+x]=1;}
  for(const s of doc.planning?.openSpaces??[])if(s.kind!=='expansion')for(const p of s.cells)if(q.inside(p)&&!q.water(p))domain[p.y*w+p.x]=1;
  const queue:number[]=[];
  anchors.forEach((a,i)=>{let best=-1,score=Infinity;for(let k=0;k<n;k++)if(domain[k]&&owner[k]<0){const d=Math.hypot(k%w+.5-a.point.x,Math.floor(k/w)+.5-a.point.y);if(d<score){best=k;score=d;}}if(best>=0){owner[best]=i;queue.push(best);}});
  for(let head=0;head<queue.length;head++){const k=queue[head],x=k%w,y=Math.floor(k/w);for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx<0||yy<0||xx>=w||yy>=h||!domain[j]||owner[j]>=0)continue;owner[j]=owner[k];queue.push(j);}}
  // Disconnected outlying buildings get their own small, contiguous district.
  for(let k=0;k<n;k++)if(domain[k]&&owner[k]<0){const p={x:k%w,y:Math.floor(k/w)},nearest=anchors.reduce((best,a)=>Math.hypot(p.x-a.point.x,p.y-a.point.y)<Math.hypot(p.x-best.point.x,p.y-best.point.y)?a:best);const i=anchors.length;anchors.push({...nearest,id:`${nearest.id}-outlying-${k}`,name:`${nearest.name} · outlying`,point:p});owner[k]=i;const component=[k];for(let t=0;t<component.length;t++){const v=component[t],x=v%w,y=Math.floor(v/w);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>=0&&yy>=0&&xx<w&&yy<h&&domain[j]&&owner[j]<0){owner[j]=i;component.push(j);}}}}
  const cells:Cell[][]=anchors.map(()=>[]);for(let k=0;k<n;k++)if(owner[k]>=0)cells[owner[k]].push({x:k%w,y:Math.floor(k/w)});
  return anchors.flatMap((a,i)=>cells[i].length>=4?[{editVersion:1 as const,id:`district-${doc.seed}-${a.id}`,name:a.name,type:a.type,color:districtTypes[a.type].color,locked:false,visible:true,layerId:doc.layers[0].id,cells:cells[i]}]:[]);
}
