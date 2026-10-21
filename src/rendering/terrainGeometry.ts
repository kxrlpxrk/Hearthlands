import {grasslandPatches,type GrasslandPatch} from './grasslandGeometry';
import type {GrasslandMode} from '../assets/grassland/registry';
import {forestPilotScene,type ForestSprite} from './forestPilot';
import {forestScene} from './forestGeometry';
import {forestCanopyScene} from './forestCanopies';
import type {ForestPack} from '../assets/forests/catalogue';
import {noise} from '../generator/noise';
import type { VisualStyle, TerrainLayer } from './styles';
import type { Cell, SettlementDocument } from '../model/document';
import { terrainQuery, terrainKey, type LandscapeCell } from '../model/terrain';
export const groundColors={grass:'#536447',dirt:'#806b4b',sand:'#b4a375',rock:'#737775',soil:'#66523b'};
export interface TerrainChunk {data:string;bounds:{x:number;y:number;width:number;height:number}}
export interface TerrainPath { grassland?:readonly GrasslandPatch[]; sprites?:readonly ForestSprite[]; chunks?:TerrainChunk[]; layer?:TerrainLayer; data:string; fill?:string; stroke?:string; width?:number; opacity?:number }
export interface TerrainView { grassland?:GrasslandMode; grasslandAssets?:readonly string[]; contours:boolean; detail:boolean; style?:VisualStyle; reduced?:boolean; forestPilot?:boolean; forestPack?:ForestPack; forestAssets?:readonly string[] }
const tile=(x:number,y:number)=>`M${x} ${y}h1v1h-1Z`;
const n=(v:number)=>Math.round(v*1000)/1000;
function hash(seed:number,x:number,y:number){let h=seed^Math.imul(x,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
/** Shared world-space scene, batched by style; no per-tile React nodes or external textures. */
export function terrainGeometry(doc:SettlementDocument,options:TerrainView=doc.landscape??{contours:true,detail:true}):TerrainPath[]{
  const illustrated=options.style==='illustrated',fine=options.detail&&!options.reduced;
  const palette=illustrated?{grass:'#788558',dirt:'#98815c',sand:'#c8b685',rock:'#898b7a',soil:'#795d40'}:groundColors;
  let layer:TerrainLayer='base';
  const q=terrainQuery(doc),groups=new Map<string,{path:TerrainPath;parts:string[]}>();
  const add=(data:string,fill?:string,stroke?:string,width?:number,opacity=1)=>{if(!data)return;const key=`${layer}:${fill}:${stroke}:${width}:${opacity}`;let group=groups.get(key);if(!group){group={path:{layer,data:'',fill,stroke,width,opacity},parts:[]};groups.set(key,group);}group.parts.push(data);};
  const cells:LandscapeCell[]=[];
  for(let y=0;y<doc.grid.height;y++)for(let x=0;x<doc.grid.width;x++){const t=q.at({x,y});cells.push(t);add(tile(x,y),palette[t.ground]);}
  if(illustrated)for(const t of cells){const tone=noise(doc.seed+951,t.x/11,t.y/11);if(tone>.56)add(tile(t.x,t.y),'#cfcc8a',undefined,undefined,.09);else if(tone<.39)add(tile(t.x,t.y),'#294632',undefined,undefined,.08);}
  const edited=new Set(doc.landscape?.cells.map(terrainKey));
  for(const s of doc.planning?.openSpaces??[])if(s.kind!=='expansion')for(const p of s.cells)if(q.inside(p)&&!edited.has(terrainKey(p))&&!q.water(p)&&!q.woodland(p))add(tile(p.x,p.y),s.kind==='field'?'#71734d':s.kind==='yard'?'#59694b':'#777052',undefined,undefined,.65);
  const cornerStride=doc.grid.width+1,cornerFields={water:new Float32Array(cornerStride*(doc.grid.height+1)),vegetation:new Float32Array(cornerStride*(doc.grid.height+1))};
  if(options.detail)for(let y=0;y<=doc.grid.height;y++)for(let x=0;x<=doc.grid.width;x++){
    let water=0,vegetation=0,count=0;for(let yy=Math.max(0,y-1);yy<=Math.min(doc.grid.height-1,y);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(doc.grid.width-1,x);xx++){const t=cells[yy*doc.grid.width+xx];water+=t.water;vegetation+=t.vegetation;count++;}const i=y*cornerStride+x;cornerFields.water[i]=water/count;cornerFields.vegetation[i]=vegetation/count;
  }
  function coverage(t:LandscapeCell,field:'water'|'vegetation',fill:string){
    const value=t[field];if(!options.detail){if(value>=.5)add(tile(t.x,t.y),fill);return;}
    // Interpolate coverage on shared corners, retaining a centre node so tiny lakes remain visible.
    const {x,y}=t,fieldValues=cornerFields[field],index=y*cornerStride+x;
    const v=[fieldValues[index],fieldValues[index+1],fieldValues[index+1+cornerStride],fieldValues[index+cornerStride]];
    if(!value&&v.every(v=>!v))return;
    if(value>=.5&&v.every(v=>v>=.5)){add(tile(x,y),fill);return;}
    const corners=[{x,y,v:v[0]},{x:x+1,y,v:v[1]},{x:x+1,y:y+1,v:v[2]},{x,y:y+1,v:v[3]}];
    for(let i=0;i<4;i++){
      const triangle=[{x:x+.5,y:y+.5,v:value},corners[i],corners[(i+1)%4]],poly:Cell[]=[],edge:Cell[]=[];
      for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3];if(a.v>=.5)poly.push(a);if((a.v>=.5)!==(b.v>=.5)){const t=(.5-a.v)/(b.v-a.v),p={x:n(a.x+(b.x-a.x)*t),y:n(a.y+(b.y-a.y)*t)};poly.push(p);edge.push(p);}}
      if(poly.length>=3)add(poly.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')+'Z',fill);
      if(field==='water'&&edge.length===2)add(`M${edge[0].x} ${edge[0].y}L${edge[1].x} ${edge[1].y}`,undefined,illustrated?'#b4c8a8':'#89a69a',illustrated?.13:.045,illustrated?.45:.6);
    }
    if(value>0&&value<.5)add(tile(x,y),fill,undefined,undefined,.1);
  }
  layer='nature';if(!illustrated)for(const t of cells)coverage(t,'vegetation','#294c3e');
  layer='water';for(const t of cells)coverage(t,'water',illustrated?'#477f88':'#355d69');
  // Small seeded details and material seams soften large painted surfaces without changing queries.
  if(fine)for(const t of cells){
    const {x,y}=t,r=hash(doc.seed,x,y),cx=x+.3+r*.4,cy=y+.35+hash(doc.seed+51,x,y)*.3;
    if(t.water>=.5){layer='water';if(illustrated&&r>.5)add(`M${n(x+.1)} ${n(y+.28)}q.35 -.08 .75 .02`,undefined,'#244f66',.12,.12);if(r>.72)add(`M${x+.15} ${y+.5}q.2 -.08 .4 0t.3 0`,undefined,'#7d9d9a',.025,.35);continue;}
    layer='nature';
    if(illustrated&&r>.65)add(`M${x} ${y}h1v1h-1Z`,'#b4b878',undefined,undefined,.06);
    if(!illustrated&&t.vegetation>=.35&&r>.28)add(`M${n(cx-.2)} ${n(cy+.17)}Q${n(cx-.35)} ${n(cy-.05)} ${n(cx)} ${n(cy-.34)}Q${n(cx+.34)} ${n(cy-.06)} ${n(cx+.18)} ${n(cy+.17)}Z`,illustrated?'#638151':'#355e45','#1e4035',.035,.8);
    if(t.rocks>.15&&r>.25)add(`M${x+.2} ${y+.67}l.14 -.3 .3 -.04 .16 .3-.28 .12Z`,'#92958b','#555e58',.035,t.rocks);
    if(t.ground==='soil'&&t.vegetation<.5)add(`M${x+.15} ${y+.2}l.7 .15M${x+.15} ${y+.5}l.7 .15`,undefined,'#ac9061',.04,.28);
    else if(r>.58)add(`M${n(cx-.16)} ${n(cy)}q.12 -.1 .28 0`,undefined,t.ground==='sand'?'#d3c392':t.ground==='rock'?'#aaa99b':'#acb17b',.025,.2);
    for(const p of [{x:x+1,y},{x,y:y+1}])if(q.inside(p)&&q.at(p).ground!==t.ground)add(p.x>x?`M${x+.8} ${y+.15}l.15 .2-.1 .2.13 .25`:`M${x+.15} ${y+.8}l.2 .15 .2-.1 .25 .13`,undefined,palette[q.at(p).ground],.18,.18);
  }
  layer='relief';
  const elevated=doc.landscape.cells.filter(t=>t.elevation!==0);
  const at=(x:number,y:number)=>cells[Math.max(0,Math.min(doc.grid.height-1,y))*doc.grid.width+Math.max(0,Math.min(doc.grid.width-1,x))];
  const minX=elevated.reduce((n,t)=>Math.min(n,t.x-1),doc.grid.width),maxX=elevated.reduce((n,t)=>Math.max(n,t.x+1),0),minY=elevated.reduce((n,t)=>Math.min(n,t.y-1),doc.grid.height),maxY=elevated.reduce((n,t)=>Math.max(n,t.y+1),0);
  if(elevated.length)for(let y=Math.max(0,minY);y<=Math.min(doc.grid.height-1,maxY);y++)for(let x=Math.max(0,minX);x<=Math.min(doc.grid.width-1,maxX);x++){const t=at(x,y);
    const left=at(x-1,y).elevation,right=at(x+1,y).elevation,up=at(x,y-1).elevation,down=at(x,y+1).elevation;
    const light=(left-right+up-down)/6+t.elevation/80,opacity=Math.min(.28,Math.round(Math.abs(light)*10)/10*.18);if(opacity)add(tile(x,y),light>0?'#e6d69a':'#14251f',undefined,undefined,opacity);
    for(const [p,line,ticks]of [[{x:x+1,y},`M${x+1} ${y}v1`,`M${x+.9} ${y+.2}h.2M${x+.9} ${y+.7}h.2`],[{x,y:y+1},`M${x} ${y+1}h1`,`M${x+.2} ${y+.9}v.2M${x+.7} ${y+.9}v.2`]] as const)if(q.inside(p)&&Math.abs(at(p.x,p.y).elevation-t.elevation)>2)add(line+ticks,undefined,'#c1ac7b',.055,.85);
  }
  if(options.contours&&elevated.length){
    const contour:string[]=[];
    for(let y=Math.max(0,minY);y<=Math.min(doc.grid.height-2,maxY);y++)for(let x=Math.max(0,minX);x<=Math.min(doc.grid.width-2,maxX);x++){
      const corners=[{x:x+.5,y:y+.5},{x:x+1.5,y:y+.5},{x:x+1.5,y:y+1.5},{x:x+.5,y:y+1.5}],values=[at(x,y).elevation,at(x+1,y).elevation,at(x+1,y+1).elevation,at(x,y+1).elevation],min=Math.min(...values),max=Math.max(...values);
      for(let h=Math.ceil(min/2)*2;h<max;h+=2){const edges:Cell[]=[];for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],va=values[i],vb=values[(i+1)%4];if((va>h)!==(vb>h)){const t=(h-va)/(vb-va);edges.push({x:n(a.x+(b.x-a.x)*t),y:n(a.y+(b.y-a.y)*t)});}}for(let i=0;i+1<edges.length;i+=2)contour.push(`M${edges[i].x} ${edges[i].y}L${edges[i+1].x} ${edges[i+1].y}`);}
    }
    add(contour.join(''),undefined,'#e7d6a2',.035,.5);
  }
  const paths=[...groups.values()].map(g=>({...g.path,data:g.parts.join('')}));
  if(illustrated&&options.grassland&&options.grassland!=='off'){const ready=new Set(options.grasslandAssets??[]),patches=grasslandPatches(doc,options.grassland).filter(p=>ready.has(p.assetId));if(patches.length)paths.push({layer:'base',data:'',grassland:patches});}
  if(illustrated){const forest=options.forestPilot?(options.forestPack==='canopies'?forestCanopyScene:forestPilotScene)(doc,options.forestAssets??[]):forestScene(doc);paths.push(...forest.paths,...(fine?forest.detail:[]));if(forest.sprites?.length)paths.push({layer:'nature',data:'',sprites:forest.sprites});}
  return paths;
}
export function previewTerrainColor(t:LandscapeCell){return t.water>=.5?'#6cb8c1':t.vegetation>=.6?'#75b278':t.rocks>=.6?'#a5aea2':groundColors[t.ground];}
