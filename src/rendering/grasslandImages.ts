import {useEffect,useSyncExternalStore} from 'react';
import {grasslandAssets,type GrasslandAsset} from '../assets/grassland/registry';
import {grasslandAlpha,grasslandMaskEdge,grasslandMaskVariants} from './grasslandGeometry';
export interface GrasslandImage {image:HTMLCanvasElement;source:string}
export interface GrasslandSnapshot {status:'idle'|'loading'|'ready';ready:readonly string[];failed:readonly string[];images:ReadonlyMap<string,readonly GrasslandImage[]>}
const empty:GrasslandSnapshot={status:'idle',ready:[],failed:[],images:new Map()};
export function approvedGrasslandUrl(url:string,a:GrasslandAsset){
 const base=import.meta.env.BASE_URL,name=a.file.slice(7,-5);
 if(!url.startsWith(base)||url.includes('..'))return false;
 return url.startsWith(base+'assets/')&&new RegExp(`^${name}-[A-Za-z0-9_-]+\\.webp$`).test(url.slice((base+'assets/').length))||import.meta.env.DEV&&url===`${base}src/assets/grassland/webp/${name}.webp`;
}
/** Source RGB is untouched. Only alpha changes. This exact cached transparent
 * bitmap is drawn by Konva and embedded in SVG/PNG; no export-only masks. */
export function maskGrasslandImage(image:CanvasImageSource,a:GrasslandAsset,variant:number):GrasslandImage{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=grasslandMaskEdge;
 try{
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Meadow cache unavailable');
  const c=a.crop;ctx.drawImage(image,c.x,c.y,c.size,c.size,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)pixels.data[(y*canvas.width+x)*4+3]=Math.round(255*grasslandAlpha((x+.5)/canvas.width*2-1,(y+.5)/canvas.height*2-1,variant));
  ctx.putImageData(pixels,0,0);const source=canvas.toDataURL('image/png');
  if(!source.startsWith('data:image/png;base64,'))throw new Error('Meadow image encoding unavailable');
  return {image:canvas,source};
 }catch(error){canvas.width=canvas.height=0;throw error;}
}
/** At most two original WebPs decode concurrently; originals are then released.
 * Eighteen 384px masked surfaces (~10.1MiB) are shared by all maps and patches. */
export function createGrasslandImageStore(load=()=>import('../assets/grassland/images')){
 let state=empty,pending:Promise<GrasslandSnapshot>|undefined;const listeners=new Set<()=>void>();
 const publish=(next:GrasslandSnapshot)=>{state=next;for(const f of listeners)f();};
 async function decode(url:string,a:GrasslandAsset):Promise<GrasslandImage[]>{
  if(!approvedGrasslandUrl(url,a))throw new Error('Unapproved meadow URL');
  const controller=new AbortController(),image=new Image();let objectUrl:string|undefined;
  let timer:ReturnType<typeof setTimeout>;
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Meadow preparation timed out'));},10000);});
  try{return await Promise.race([deadline,(async()=>{
   const response=await fetch(url,{signal:controller.signal,cache:'force-cache',credentials:'same-origin'});if(!response.ok)throw new Error('Meadow file unavailable');
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(bytes.length<30||bytes.length>1_048_576||String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WEBP')throw new Error('Invalid meadow WebP');
   if(controller.signal.aborted)throw new Error('Meadow preparation cancelled');
   objectUrl=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
   await new Promise<void>((resolve,reject)=>{image.onload=()=>image.naturalWidth===a.width&&image.naturalHeight===a.height?resolve():reject(new Error('Wrong meadow dimensions'));image.onerror=()=>reject(new Error('Meadow decode failed'));image.src=objectUrl!;});
   const result:GrasslandImage[]=[];
   try{for(let i=0;i<grasslandMaskVariants;i++){if(controller.signal.aborted)throw new Error('Meadow preparation cancelled');result.push(maskGrasslandImage(image,a,i));await new Promise<void>(r=>setTimeout(r,0));}return result;}
   catch(error){for(const v of result)v.image.width=v.image.height=0;throw error;}
  })()]);}finally{clearTimeout(timer!);controller.abort();image.onload=image.onerror=null;image.src='';if(objectUrl)URL.revokeObjectURL(objectUrl);}
 }
 return {
  snapshot:()=>state,subscribe:(f:()=>void)=>{listeners.add(f);return()=>{listeners.delete(f);};},
  prepare():Promise<GrasslandSnapshot>{
   if(pending)return pending;
   if(typeof Image==='undefined')return Promise.resolve({...empty,status:'ready',failed:grasslandAssets.map(a=>a.id)});
   publish({...empty,status:'loading'});
   pending=(async()=>{
    const images=new Map<string,readonly GrasslandImage[]>();
    try{
     const sources=await new Promise<Awaited<ReturnType<typeof load>>>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Meadow module unavailable')),8000);Promise.resolve().then(load).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
     let next=0;await Promise.all(Array.from({length:2},async()=>{while(next<grasslandAssets.length){const a=grasslandAssets[next++];try{images.set(a.id,await decode(sources.grasslandSources[a.id]??'',a));}catch{/* Original quiet terrain stays visible for this asset. */}}}));
    }catch{/* Failed lazy bundle preserves the complete previous renderer. */}
    publish({status:'ready',images,ready:grasslandAssets.filter(a=>images.has(a.id)).map(a=>a.id),failed:grasslandAssets.filter(a=>!images.has(a.id)).map(a=>a.id)});return state;
   })();return pending;
  },
 };
}
export const grasslandImages=createGrasslandImageStore();
export function useGrasslandImages(enabled:boolean){
 useEffect(()=>{if(enabled)void grasslandImages.prepare();},[enabled]);
 const state=useSyncExternalStore(grasslandImages.subscribe,grasslandImages.snapshot,()=>empty);return enabled?state:empty;
}
