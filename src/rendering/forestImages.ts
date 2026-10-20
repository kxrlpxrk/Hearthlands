import {useEffect,useSyncExternalStore} from 'react';
import {forestImageAssets,type ForestImageAsset} from '../assets/forests/registry';
import {rasterCacheEdges,type RasterDetail} from './rasterDetail';
export interface ForestImage {source:string;image:HTMLImageElement;medium?:HTMLCanvasElement;distant?:HTMLCanvasElement}
export interface ForestImageSnapshot {status:'idle'|'loading'|'ready';ready:readonly string[];failed:readonly string[];images:ReadonlyMap<string,ForestImage>}
const empty:ForestImageSnapshot={status:'idle',ready:[],failed:[],images:new Map()};
/** Injectable loader permits failure/timeout tests. Production is a single lazy,
 * Vite-bundled inline PNG module: no remote URL, user path or fetch is accepted. */
export function createForestImageStore(load:()=>Promise<{forestImageSources:Readonly<Record<string,string>>}>=()=>import('../assets/forests/images')){
 let state=empty,pending:Promise<ForestImageSnapshot>|undefined;const listeners=new Set<()=>void>();
 const publish=(next:ForestImageSnapshot)=>{state=next;for(const notify of listeners)notify();};
 function decode(a:ForestImageAsset,source:string):Promise<ForestImage|undefined>{
  if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source))return Promise.resolve(undefined);
  return new Promise(resolve=>{
   const image=new Image();let settled=false;const timer=setTimeout(()=>finish(false),5000);
   function finish(ok:boolean){if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;
    if(!ok){resolve(undefined);return;}
    const result:ForestImage={source,image};let from:CanvasImageSource=image,width=image.naturalWidth,height=image.naturalHeight;
    for(const level of ['medium','distant'] as const){
     const edge=rasterCacheEdges[level];if(Math.max(width,height)<=edge)continue;
     let canvas:HTMLCanvasElement|undefined;
     try{canvas=document.createElement('canvas');const ratio=edge/Math.max(width,height);canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Forest image cache unavailable');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(from,0,0,canvas.width,canvas.height);result[level]=canvas;from=canvas;width=canvas.width;height=canvas.height;}
     catch{if(canvas){canvas.width=0;canvas.height=0;}/* Original/larger image remains usable. */}
    }
    resolve(result);
   }
   image.onload=()=>finish(image.naturalWidth===a.pixelWidth&&image.naturalHeight===a.pixelHeight);image.onerror=()=>finish(false);image.src=source;
  });
 }
 return {
  snapshot:()=>state,
  subscribe:(notify:()=>void)=>{listeners.add(notify);return()=>{listeners.delete(notify);};},
  prepare():Promise<ForestImageSnapshot>{
   if(pending)return pending;
   if(typeof Image==='undefined')return Promise.resolve({...empty,status:'ready',failed:forestImageAssets.map(a=>a.id)});
   publish({...empty,status:'loading'});
   pending=(async()=>{
    const images=new Map<string,ForestImage>();
    try{const sources=await new Promise<Awaited<ReturnType<typeof load>>>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Forest pack load timed out')),8000);Promise.resolve().then(load).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});await Promise.all(forestImageAssets.map(async a=>{try{const decoded=await decode(a,sources.forestImageSources[a.id]??'');if(decoded)images.set(a.id,decoded);}catch{/* A single failed image retains that crown's procedural fallback. */}}));}catch{/* A missing lazy module falls back for the whole pack. */}
    publish({status:'ready',images,ready:forestImageAssets.filter(a=>images.has(a.id)).map(a=>a.id),failed:forestImageAssets.filter(a=>!images.has(a.id)).map(a=>a.id)});return state;
   })();return pending;
  },
 };
}
export const forestImages=createForestImageStore();
export function useForestImages(enabled:boolean){
 useEffect(()=>{if(enabled)void forestImages.prepare();},[enabled]);
 const state=useSyncExternalStore(forestImages.subscribe,forestImages.snapshot,()=>empty);
 return enabled?state:empty;
}
export function forestImageLevel(value:ForestImage,level:RasterDetail):CanvasImageSource{
 return level==='distant'?value.distant??value.medium??value.image:level==='medium'?value.medium??value.image:value.image;
}
