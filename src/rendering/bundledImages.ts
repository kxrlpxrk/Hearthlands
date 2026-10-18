import {useSyncExternalStore} from 'react';
import type {BuildingAsset} from '../assets/buildings/types';
import {bundledImageSource} from '../assets/buildings/images';
interface DecodedImage {status:'loading'|'ready'|'failed';image?:HTMLImageElement;overview?:HTMLCanvasElement;done:Promise<void>;listeners:Set<()=>void>}
const cache=new Map<string,DecodedImage>();
/** One decode and one small overview surface per installed source, shared by every building. */
function entry(asset:BuildingAsset):DecodedImage|undefined {
 const art=asset.artwork;if(art.format!=='bundled-image'||typeof Image==='undefined')return;
 const key=art.source;const existing=cache.get(key);if(existing)return existing;
 const source=bundledImageSource(key);if(!source)return;
 let finish!:()=>void;const value:DecodedImage={status:'loading',done:new Promise<void>(r=>finish=r),listeners:new Set()};cache.set(key,value);
 const image=new Image();let complete=false;
 const timer=setTimeout(()=>settle(false),5000);
 function settle(ok:boolean){if(complete)return;complete=true;clearTimeout(timer);image.onload=null;image.onerror=null;
  value.status=ok?'ready':'failed';
  if(ok){value.image=image;try{const small=document.createElement('canvas');small.width=256;small.height=Math.max(1,Math.round(256*image.naturalHeight/image.naturalWidth));const ctx=small.getContext('2d');if(ctx){ctx.drawImage(image,0,0,small.width,small.height);value.overview=small;}}catch{/* Full image remains usable if an overview surface cannot be allocated. */}}
  finish();for(const notify of value.listeners)notify();
 }
 image.onload=()=>settle(image.naturalWidth===art.pixelWidth&&image.naturalHeight===art.pixelHeight);image.onerror=()=>settle(false);image.src=source;return value;
}
export function useBundledImage(asset:BuildingAsset,reduced=false){
 const value=entry(asset);
 useSyncExternalStore(notify=>{value?.listeners.add(notify);return()=>{value?.listeners.delete(notify);};},()=>value?.status??'failed',()=> 'failed');
 return value?.status==='ready'?(reduced?value.overview??value.image:value.image):undefined;
}
export const imageFailed=(asset:BuildingAsset)=>asset.artwork.format==='bundled-image'&&cache.get(asset.artwork.source)?.status==='failed';
export async function prepareBundledImages(assets:readonly BuildingAsset[]):Promise<void>{await Promise.all([...new Set(assets)].map(a=>entry(a)?.done));}
