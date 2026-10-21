import type {SettlementDocument,Cell} from '../model/document';
import type {TerrainPath,TerrainChunk} from './terrainGeometry';
import type {GrasslandMode} from '../assets/grassland/registry';
import {noise} from '../generator/noise';
import {grasslandClearance} from './grasslandGeometry';
const cache:{doc:SettlementDocument;mode:GrasslandMode;paths:readonly TerrainPath[]}[]=[];
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Connected, low-frequency colour variation, never miniature flower imagery.
 * A positive vertex certifies ALL four neighbouring tile squares as clear.
 * Triangle interpolation therefore cannot bridge a thin road/water obstacle. */
export function grasslandGroundField(doc:SettlementDocument){
 const {width,height}=doc.grid,step=2,columns=Math.ceil(width/step),rows=Math.ceil(height/step),available=grasslandClearance(doc),values=new Float32Array((columns+1)*(rows+1));
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const x=Math.min(width,i*step),y=Math.min(height,j*step);
  const clearance=Math.min(...[-1,1].flatMap(dy=>[-1,1].map(dx=>available({x:x+dx,y:y+dy}))));
  if(clearance<=1.6)continue;
  const climate=noise(doc.seed+6192,x/18,y/18)*.65+noise(doc.seed+6929,x/9,y/9)*.35;
  values[j*(columns+1)+i]=smooth((clearance-1.6)/1.25)*(.3+climate*.7);
 }
 return {width,height,values,step,columns,rows};
}
export function grasslandGround(doc:SettlementDocument,mode:GrasslandMode):readonly TerrainPath[]{
 if(mode==='off')return [];
 const found=cache.find(({doc:d,mode:m})=>m===mode&&d.terrain===doc.terrain&&d.landscape===doc.landscape&&d.planning===doc.planning&&d.buildings===doc.buildings&&d.roads===doc.roads&&d.seed===doc.seed&&d.grid.width===doc.grid.width&&d.grid.height===doc.grid.height);if(found)return found.paths;
 const {width,height,values,step,columns,rows}=grasslandGroundField(doc),paths:TerrainPath[]=[],at=(x:number,y:number)=>values[y*(columns+1)+x],n=(v:number)=>Math.round(v*1000)/1000;
 for(const level of [.18,.28,.38,.48,.58,.68]){
  const chunks=new Map<string,{bounds:TerrainChunk['bounds'];parts:string[]}>(),parts:string[]=[];
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
   const x=i*step,y=j*step,right=Math.min(width,x+step),bottom=Math.min(height,y+step);
   const corners=[{x,y,v:at(i,j)},{x:right,y,v:at(i+1,j)},{x:right,y:bottom,v:at(i+1,j+1)},{x,y:bottom,v:at(i,j+1)}];
   for(const t of [[corners[0],corners[1],corners[2]],[corners[0],corners[2],corners[3]]]){
    const poly:Cell[]=[];for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3];if(a.v>=level)poly.push(a);if((a.v>=level)!==(b.v>=level)){const f=(level-a.v)/(b.v-a.v);poly.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});}}
    if(poly.length<3)continue;
    const data=poly.map((p,i)=>`${i?'L':'M'}${n(p.x)} ${n(p.y)}`).join('')+'Z',cx=Math.floor(x/16)*16,cy=Math.floor(y/16)*16,key=`${cx},${cy}`;parts.push(data);
    let chunk=chunks.get(key);if(!chunk){chunk={bounds:{x:cx-.05,y:cy-.05,width:16.1,height:16.1},parts:[]};chunks.set(key,chunk);}chunk.parts.push(data);
   }
  }
  if(parts.length)paths.push({layer:'base',data:parts.join(''),fill:level<.48?'#a3b84e':'#c3c65a',opacity:mode==='accents'?.055:.04,chunks:[...chunks.values()].map(c=>({bounds:c.bounds,data:c.parts.join('')}))});
 }
 cache.push({doc,mode,paths});if(cache.length>4)cache.shift();return paths;
}
