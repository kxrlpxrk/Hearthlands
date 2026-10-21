import {useEffect,useSyncExternalStore} from 'react';
import {forestImageAssets,type ForestImageAsset} from '../assets/forests/registry';
import {forestCanopyAssets} from '../assets/forests/canopies/registry';
import type {ForestPack} from '../assets/forests/catalogue';
import {rasterCacheEdges,type RasterDetail} from './rasterDetail';
export interface ForestImage {source:string;image:HTMLImageElement;medium?:HTMLCanvasElement;distant?:HTMLCanvasElement}
export interface ForestImageSnapshot {status:'idle'|'loading'|'ready';ready:readonly string[];failed:readonly string[];images:ReadonlyMap<string,ForestImage>}
const empty:ForestImageSnapshot={status:'idle',ready:[],failed:[],images:new Map()};
/** Accept only the manifest-matching, base-safe paths emitted by Vite. */
export function approvedCanopyUrl(source:string,a:ForestImageAsset){
 const base=import.meta.env.BASE_URL;
 if(!source.startsWith(base)||source.includes('..'))return false;
 const name=a.file.slice('assets/'.length).replace('.png','');
 const production=source.startsWith(base+'assets/')&&new RegExp(`^${name}-[A-Za-z0-9_-]+\\.png$`).test(source.slice((base+'assets/').length));
 return production||(import.meta.env.DEV&&source===`${base}src/assets/forests/canopies/png/${name}.png`);
}
/** Original bytes become a local data URI once, for both canvas and embedded SVG.
 * URLs must be Vite's approved same-site PNG paths; no remote runtime art. */
async function bundledPng(source:string,a:ForestImageAsset,signal:AbortSignal){
 if(!approvedCanopyUrl(source,a))throw new Error('Unapproved canopy URL');
 const response=await fetch(source,{signal,cache:'force-cache',credentials:'same-origin'});
 if(!response.ok)throw new Error('Canopy file unavailable');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length<33||bytes.length>4_194_304)throw new Error('Invalid canopy image size');
 const h=new DataView(bytes.buffer);
 if(h.getUint32(0)!==0x89504e47||h.getUint32(4)!==0x0d0a1a0a||h.getUint32(16)!==a.pixelWidth||h.getUint32(20)!==a.pixelHeight||bytes[24]!==8||bytes[25]!==6)throw new Error('Canopy must match the approved RGBA PNG');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return 'data:image/png;base64,'+btoa(binary);
}
/** Shared bounded cache: legacy inline sources or approved local canopy PNGs. */
export function createForestImageStore(load:()=>Promise<{forestImageSources:Readonly<Record<string,string>>}>=()=>import('../assets/forests/images'),assets:readonly ForestImageAsset[]=forestImageAssets,bundled=false){
 let state=empty,pending:Promise<ForestImageSnapshot>|undefined;const listeners=new Set<()=>void>();
 const publish=(next:ForestImageSnapshot)=>{state=next;for(const notify of listeners)notify();};
 function decode(a:ForestImageAsset,source:string):Promise<ForestImage|undefined>{
  if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source)&&!bundled)return Promise.resolve(undefined);
  return new Promise(resolve=>{
   const image=new Image(),controller=new AbortController();let settled=false;const timer=setTimeout(()=>finish(false),bundled?10000:5000);
   function finish(ok:boolean){if(settled)return;settled=true;clearTimeout(timer);controller.abort();image.onload=image.onerror=null;
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
   image.onload=()=>finish(image.naturalWidth===a.pixelWidth&&image.naturalHeight===a.pixelHeight);image.onerror=()=>finish(false);
   if(bundled){void bundledPng(source,a,controller.signal).then(value=>{if(!settled){source=value;image.src=value;}},()=>finish(false));}
   else image.src=source;
  });
 }
 return {
  snapshot:()=>state,
  subscribe:(notify:()=>void)=>{listeners.add(notify);return()=>{listeners.delete(notify);};},
  prepare():Promise<ForestImageSnapshot>{
   if(pending)return pending;
   if(typeof Image==='undefined')return Promise.resolve({...empty,status:'ready',failed:assets.map(a=>a.id)});
   publish({...empty,status:'loading'});
   pending=(async()=>{
    const images=new Map<string,ForestImage>();
    try{const sources=await new Promise<Awaited<ReturnType<typeof load>>>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Forest pack load timed out')),8000);Promise.resolve().then(load).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
     const decodeAsset=async(a:ForestImageAsset)=>{try{const decoded=await decode(a,sources.forestImageSources[a.id]??'');if(decoded)images.set(a.id,decoded);}catch{/* Individual failure retains procedural fallback. */}};
     if(bundled){let next=0;await Promise.all(Array.from({length:Math.min(4,assets.length)},async()=>{while(next<assets.length)await decodeAsset(assets[next++]);}));}
     else await Promise.all(assets.map(decodeAsset));
    }catch{/* A missing lazy module falls back for the whole pack. */}
    publish({status:'ready',images,ready:assets.filter(a=>images.has(a.id)).map(a=>a.id),failed:assets.filter(a=>!images.has(a.id)).map(a=>a.id)});return state;
   })();return pending;
  },
 };
}
export const forestImages=createForestImageStore();
export const forestCanopyImages=createForestImageStore(()=>import('../assets/forests/canopies/images'),forestCanopyAssets,true);
export const forestImagesForPack=(pack:ForestPack='pilot')=>pack==='canopies'?forestCanopyImages:forestImages;
export function useForestImages(enabled:boolean,pack:ForestPack='pilot'){
 const store=forestImagesForPack(pack);
 useEffect(()=>{if(enabled)void store.prepare();},[enabled,store]);
 const state=useSyncExternalStore(store.subscribe,store.snapshot,()=>empty);
 return enabled?state:empty;
}
export function forestImageLevel(value:ForestImage,level:RasterDetail):CanvasImageSource{
 return level==='distant'?value.distant??value.medium??value.image:level==='medium'?value.medium??value.image:value.image;
}
