import type {SettlementDocument} from '../model/document';
import type {TerrainPath} from './terrainGeometry';
import {terrainQuery} from '../model/terrain';
import {footprint} from '../model/buildings';
import {seededRandom} from '../generator/random';
import {grasslandClearance} from './grasslandGeometry';
import {sameGroundInput} from './illustratedGround';
export interface GroundAccent {x:number;y:number;radius:number;kind:'grass'|'flower'|'shrub'|'rock';data:string;fill?:string;stroke:string;opacity:number}
export interface SubtleScene {accents:readonly GroundAccent[];paths:readonly TerrainPath[]}
const cache:{doc:SettlementDocument;scene:SubtleScene}[]=[];
const n=(v:number)=>Math.round(v*1000)/1000;
/** Small independent accents, not image stamps or a replacement ground surface.
 * Uniform seeded proposals + spacing produce no placement rows. Woodland and
 * wilderness are favoured; entrances, fields and village interiors stay quiet. */
export function subtleGround(doc:SettlementDocument):SubtleScene{
 const hit=cache.find(e=>sameGroundInput(e.doc,doc));if(hit)return hit.scene;
 const {width,height}=doc.grid,q=terrainQuery(doc),clear=grasslandClearance(doc),random=seededRandom(doc.seed^0x6c031),wood=new Float32Array(width*height).fill(99);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(q.woodland({x,y}))wood[y*width+x]=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(x)wood[i]=Math.min(wood[i],wood[i-1]+1);if(y)wood[i]=Math.min(wood[i],wood[i-width]+1);}
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(x<width-1)wood[i]=Math.min(wood[i],wood[i+1]+1);if(y<height-1)wood[i]=Math.min(wood[i],wood[i+width]+1);}
 const buildings=doc.buildings.map(b=>({...b,...footprint(b)})),accents:GroundAccent[]=[],buckets=new Map<string,GroundAccent[]>();
 for(let i=0;i<Math.ceil(width*height*.11);i++){
  const x=random()*width,y=random()*height,space=clear({x,y});if(space<1.05)continue;
  const village=buildings.reduce((d,b)=>Math.min(d,Math.hypot(Math.max(b.x-x,0,x-b.x-b.width),Math.max(b.y-y,0,y-b.y-b.height))),99);if(village<5)continue;
  const edge=wood[Math.floor(y)*width+Math.floor(x)],chance=edge<7?.78:village>12?.27:.08;if(random()>chance)continue;
  const bx=Math.floor(x/3),by=Math.floor(y/3);let near=false;
  for(let yy=by-1;yy<=by+1;yy++)for(let xx=bx-1;xx<=bx+1;xx++)if(buckets.get(`${xx}:${yy}`)?.some(a=>Math.hypot(a.x-x,a.y-y)<2.4))near=true;
  if(near)continue;
  const t=q.at({x,y}),r=random(),kind:GroundAccent['kind']=t.rocks>.1||t.elevation>1?r<.4?'rock':'grass':edge<5&&r>.76?'shrub':r<.14?'flower':'grass',size=.7+random()*.35,sign=random()<.5?-1:1;
  const p=(u:number,v:number)=>`${n(x+u*size*sign)} ${n(y+v*size)}`;
  let data='',fill:string|undefined,stroke='#9ba975',opacity=.65;
  if(kind==='grass')data=`M${p(-.18,.12)}Q${p(-.12,-.02)} ${p(-.14,-.18)}M${p(0,.12)}Q${p(.12,-.06)} ${p(.06,-.3)}M${p(.15,.12)}Q${p(.27,0)} ${p(.3,-.13)}`;
  if(kind==='flower'){data=`M${p(-.13,.1)}L${p(-.1,-.09)}M${p(.1,.11)}L${p(.15,-.2)}M${p(-.15,-.1)}l.08 0M${p(.1,-.2)}l.09 0`;stroke='#c7bf7c';opacity=.68;}
  if(kind==='shrub'){data=`M${p(-.29,.1)}Q${p(-.4,-.15)} ${p(-.16,-.21)}Q${p(.03,-.4)} ${p(.18,-.18)}Q${p(.42,-.08)} ${p(.25,.12)}Z`;fill='#6e8458';stroke='#96a16d';opacity=.62;}
  if(kind==='rock'){data=`M${p(-.22,.11)}L${p(-.14,-.13)}L${p(.08,-.2)}L${p(.26,.08)}L${p(.02,.15)}Z`;fill='#939b82';stroke='#aab096';opacity=.58;}
  const a={x,y,radius:.55,kind,data,fill,stroke,opacity};accents.push(a);const key=`${bx}:${by}`,list=buckets.get(key)??[];list.push(a);buckets.set(key,list);
 }
 const groups=new Map<string,{p:TerrainPath;parts:string[];chunks:Map<string,string[]>}>();
 for(const a of accents){const key=a.kind;let g=groups.get(key);if(!g){g={p:{data:'',layer:'base',fill:a.fill,stroke:a.stroke,width:.035,opacity:a.opacity},parts:[],chunks:new Map()};groups.set(key,g);}g.parts.push(a.data);const ck=`${Math.floor(a.x/16)*16}:${Math.floor(a.y/16)*16}`,parts=g.chunks.get(ck)??[];parts.push(a.data);g.chunks.set(ck,parts);}
 const paths=[...groups.values()].map(g=>({...g.p,data:g.parts.join(''),chunks:[...g.chunks].map(([key,parts])=>{const [x,y]=key.split(':').map(Number);return {data:parts.join(''),bounds:{x:x-.6,y:y-.6,width:17.2,height:17.2}};})}));
 const scene={accents,paths};cache.push({doc,scene});if(cache.length>4)cache.shift();return scene;
}
