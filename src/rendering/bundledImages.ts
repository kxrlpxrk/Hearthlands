import {useSyncExternalStore} from 'react';
import type {BuildingAsset} from '../assets/buildings/types';
import {bundledImageSource} from '../assets/buildings/images';
import {rasterCacheEdges,type RasterDetail} from './rasterDetail';
interface DecodedImage {status:'loading'|'ready'|'failed';image?:HTMLImageElement;medium?:HTMLCanvasElement;distant?:HTMLCanvasElement;done:Promise<void>;listeners:Set<()=>void>}
const cache=new Map<string,DecodedImage>();
/** Decode once and build at most two transparent surfaces per installed source.
 * Every building shares them. No resampling, decoding or allocation during zoom. */
function entry(asset:BuildingAsset):DecodedImage|undefined {
 const art=asset.artwork;if(art.format!=='bundled-image'||typeof Image==='undefined')return;
 const key=art.source;const existing=cache.get(key);if(existing)return existing;
 const source=bundledImageSource(key);if(!source)return;
 let finish!:()=>void;const value:DecodedImage={status:'loading',done:new Promise<void>(r=>finish=r),listeners:new Set()};cache.set(key,value);
 const image=new Image();let complete=false;
 const timer=setTimeout(()=>settle(false),5000);
 function settle(ok:boolean){if(complete)return;complete=true;clearTimeout(timer);image.onload=null;image.onerror=null;
  value.status=ok?'ready':'failed';
  if(ok){
   value.image=image;let from:CanvasImageSource=image,width=image.naturalWidth,height=image.naturalHeight;
   for(const level of ['medium','distant'] as const){
    const edge=rasterCacheEdges[level];if(Math.max(width,height)<=edge)continue;
    let small:HTMLCanvasElement|undefined;
    try{
     small=document.createElement('canvas');const ratio=edge/Math.max(width,height);
     small.width=Math.max(1,Math.round(width*ratio));small.height=Math.max(1,Math.round(height*ratio));
     const ctx=small.getContext('2d');if(!ctx)throw new Error('Image cache memory unavailable');
     ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(from,0,0,small.width,small.height);
     value[level]=small;from=small;width=small.width;height=small.height;
    }catch{if(small){small.width=0;small.height=0;}/* A larger cached surface/original remains usable. */}
   }
  }
  finish();for(const notify of value.listeners)notify();
 }
 image.onload=()=>settle(image.naturalWidth===art.pixelWidth&&image.naturalHeight===art.pixelHeight);image.onerror=()=>settle(false);image.src=source;return value;
}
export function useBundledImage(asset:BuildingAsset,detail:RasterDetail='high'){
 const value=entry(asset);
 useSyncExternalStore(notify=>{value?.listeners.add(notify);return()=>{value?.listeners.delete(notify);};},()=>value?.status??'failed',()=> 'failed');
 if(value?.status!=='ready')return;
 return detail==='distant'?value.distant??value.medium??value.image:detail==='medium'?value.medium??value.image:value.image;
}
export const imageFailed=(asset:BuildingAsset)=>asset.artwork.format==='bundled-image'&&(!bundledImageSource(asset.artwork.source)||cache.get(asset.artwork.source)?.status==='failed');
export async function prepareBundledImages(assets:readonly BuildingAsset[]):Promise<void>{await Promise.all([...new Set(assets)].map(a=>entry(a)?.done));}
