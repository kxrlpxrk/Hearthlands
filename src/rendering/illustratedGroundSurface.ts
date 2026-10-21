import {nativeTerrainPath} from './nativeTerrain';
import {useEffect,useState} from 'react';
import {grasslandImages} from './grasslandImages';
import {grasslandAssetsById} from '../assets/grassland/registry';
import {groundAt,groundMaterialIds,groundSurfaceSize,groundGrain,groundDetailRegions,smooth,type GroundRegion,type GroundPlan} from './illustratedGround';
export interface GroundSurface {canvas:HTMLCanvasElement;source:string;elapsedMs:number;bytes:number}
interface Pixels {data:Uint8ClampedArray;width:number}
const samples=new Map<string,Pixels>();
interface Entry {plan:GroundPlan;key:string;promise:Promise<GroundSurface>;surface?:GroundSurface}
const surfaces:Entry[]=[],tiles:Entry[]=[];
const activePlans=new Map<GroundPlan,number>();
let activeBuild=Promise.resolve();
async function materialPixels(){
 const images=await grasslandImages.prepare();
 for(const id of Object.values(groundMaterialIds))if(!samples.has(id)){
  const original=images.images.get(id)?.[0]?.original,a=grasslandAssetsById.get(id);if(!original||!a)continue;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  try{if(!ctx)continue;const c=a.crop;ctx.drawImage(original,c.x,c.y,c.size,c.size,0,0,512,512);samples.set(id,{data:ctx.getImageData(0,0,512,512).data,width:512});}finally{canvas.width=canvas.height=0;}
 }
 return samples;
}
const fract=(v:number)=>v-Math.floor(v);
/** Two independently oriented, warped source projections. Edge weights vanish
 * before a non-seamless image wraps; the offset projection fills that join.
 * This is restrained material sampling, not a claim that the source tiles repeat. */
export function sampleMaterial(p:Pixels,x:number,y:number,wx:number,wy:number,out:Float32Array){
 const u=fract(x*.19+y*.062+wx*.16),v=fract(y*.182-x*.044+wy*.16),u2=fract(x*.14-y*.099+.371+wy*.12),v2=fract(y*.156+x*.081+.619+wx*.12);
 const edge=(a:number,b:number)=>smooth(0,.16,Math.min(a,1-a,b,1-b));const a=edge(u,v),b=edge(u2,v2),sum=a+b;
 if(sum<.00001){out.fill(0);return 0;}
 const sample=(u:number,v:number,c:number)=>{const xx=u*(p.width-1),yy=v*(p.width-1),i=Math.floor(xx),j=Math.floor(yy),fx=xx-i,fy=yy-j,k=(j*p.width+i)*4;return(p.data[k+c]*(1-fx)+p.data[k+4+c]*fx)*(1-fy)+(p.data[k+p.width*4+c]*(1-fx)+p.data[k+(p.width+1)*4+c]*fx)*fy;};
 for(let c=0;c<3;c++)out[c]=(sample(u,v,c)*a+sample(u2,v2,c)*b)/sum;return Math.min(1,sum);
}
export function peekGroundSurface(plan:GroundPlan,density=16,exporting=false){const s=groundSurfaceSize(plan,density,exporting),key=`${s.width}:${s.height}`;return surfaces.find(e=>e.plan===plan&&e.key===key)?.surface;}
/** At most two retained surfaces; one build at a time, yielding between short row slices.
 * No camera input, synchronous full-map processing or per-frame decoding. */
export function prepareGroundSurface(plan:GroundPlan,density=16,exporting=false,region?:GroundRegion):Promise<GroundSurface>{
 const size=region?{width:Math.round(region.width*48),height:Math.round(region.height*48)}:groundSurfaceSize(plan,density,exporting),key=region?`${region.x}:${region.y}`:`${size.width}:${size.height}`,pool=region?tiles:surfaces,hit=pool.find(e=>e.plan===plan&&e.key===key);if(hit){pool.splice(pool.indexOf(hit),1);pool.push(hit);return hit.promise;}
 const entry:Entry={plan,key,promise:Promise.resolve(null!)};
 const build=async()=>{
  if(!pool.includes(entry)&&(region||!exporting&&!activePlans.has(plan)))throw new Error('Superseded ground proposal');
  const start=performance.now(),materials=await materialPixels(),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx){canvas.width=canvas.height=0;throw new Error('Illustrated ground cache unavailable');}
  try{
   const image=ctx.createImageData(size.width,size.height),field=new Float32Array(12),rgb=new Float32Array(3),colour=new Float32Array(3),weights=new Float32Array(6),ids=Object.values(groundMaterialIds);
   let slice=performance.now();
   for(let py=0;py<size.height;py++){
    const y=(region?.y??0)+(py+.5)*(region?.height??plan.height)/size.height;
    for(let px=0;px<size.width;px++){
     const x=(region?.x??0)+(px+.5)*(region?.width??plan.width)/size.width,p=groundAt(plan,x,y,field),k=(py*size.width+px)*4;if(p[0]<.001)continue;
     const grain=(groundGrain(plan.seed,x,y)-.5)*5,wild=p[4];colour[0]=p[1]+grain;colour[1]=p[2]+grain;colour[2]=p[3]+grain*.6;weights[0]=.12+wild*.17;for(let m=1;m<6;m++)weights[m]=p[m+4];
     for(let m=0;m<ids.length;m++){
      const weight=weights[m]*(m? .46:1),source=materials.get(ids[m]);if(weight<.003||!source)continue;
      const coverage=sampleMaterial(source,x,y,p[10]+m*.47,p[11]+m*.73,rgb),alpha=weight*coverage;
      for(let c=0;c<3;c++)colour[c]=colour[c]*(1-alpha)+rgb[c]*alpha;
     }
     for(let c=0;c<3;c++)image.data[k+c]=Math.round(colour[c]);image.data[k+3]=Math.round(p[0]*255);
    }
    if(performance.now()-slice>8){await new Promise<void>(r=>setTimeout(r,0));slice=performance.now();}
   }
   ctx.putImageData(image,0,0);
   // Grass strokes are baked once into the same material surface, never stroked
   // over a full map during pan. All LODs retain identical world geometry.
   if(typeof Path2D!=='undefined'){
    ctx.save();ctx.scale(size.width/(region?.width??plan.width),size.height/(region?.height??plan.height));ctx.translate(-(region?.x??0),-(region?.y??0));ctx.globalAlpha=.18;ctx.lineWidth=.018;ctx.lineCap='round';
    for(const p of plan.detail){ctx.strokeStyle=p.color;for(const c of p.chunks){if(region&&(c.bounds.x>region.x+region.width||c.bounds.y>region.y+region.height||c.bounds.x+c.bounds.width<region.x||c.bounds.y+c.bounds.height<region.y))continue;const path=nativeTerrainPath(c);if(path)ctx.stroke(path);}await new Promise<void>(r=>setTimeout(r,0));}ctx.restore();
   }
   const source=region?'':canvas.toDataURL('image/png');if(!region&&!source.startsWith('data:image/png;base64,'))throw new Error('Ground cache encoding failed');
   return {canvas,source,elapsedMs:performance.now()-start,bytes:size.width*size.height*4};
  }catch(e){canvas.width=canvas.height=0;throw e;}
 };
 entry.promise=activeBuild.then(build).then(s=>{entry.surface=s;return s;});activeBuild=entry.promise.then(()=>{},()=>{});pool.push(entry);if(pool.length>(region?9:2))pool.shift();return entry.promise;
}
export function groundSurfaceSvg(plan:GroundPlan,density:number,strict=false){const surface=peekGroundSurface(plan,density,true);if(strict&&!surface)throw new Error('Continuous ground export was not prepared. Retry PNG export.');return surface?`<image data-illustrated-ground="6C.3" x="0" y="0" width="${plan.width}" height="${plan.height}" href="${surface.source}"/>`:'<desc data-ground-fallback="true">Illustrated ground is preparing or unavailable; original terrain retained.</desc>';}

export function useGroundSurface(plan:GroundPlan){
 const [state,set]=useState<{plan:GroundPlan;surface?:GroundSurface;error?:string}>({plan});
 useEffect(()=>{let current=true;activePlans.set(plan,(activePlans.get(plan)??0)+1);set({plan});prepareGroundSurface(plan).then(surface=>{if(current)set({plan,surface});},()=>{if(current)set({plan,error:'Ground surface unavailable; original terrain retained.'});});return()=>{current=false;const count=(activePlans.get(plan)??1)-1;if(count)activePlans.set(plan,count);else activePlans.delete(plan);};},[plan]);
 return state.plan===plan?state:{plan};
}

/** Detail caches are requested only after 180ms of camera inactivity. Regions
 * sharpen the SAME material field; no species, colours or habitat rerolls. */
export function useGroundTiles(plan:GroundPlan,viewport:GroundRegion,pixelsPerTile:number){
 const regions=groundDetailRegions(plan,viewport,pixelsPerTile),key=regions.map(r=>`${r.x}:${r.y}`).join('|');
 const [,redraw]=useState(0);
 useEffect(()=>{let live=true;const timer=setTimeout(()=>{void Promise.allSettled(regions.map(r=>prepareGroundSurface(plan,48,false,r))).then(()=>{if(live)redraw(v=>v+1);});},180);return()=>{live=false;clearTimeout(timer);};},[plan,key,viewport.x,viewport.y,viewport.width,viewport.height]);
 const ready=new Map(regions.flatMap(r=>{const key=`${r.x}:${r.y}`,surface=tiles.find(e=>e.plan===plan&&e.key===key)?.surface;return surface?[[key,surface] as const]:[];}));
 return {ready,pending:ready.size<regions.length};
}
