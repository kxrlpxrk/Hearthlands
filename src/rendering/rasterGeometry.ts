import type {BuildingAsset,ImageBounds} from '../assets/buildings/types';
/** Crop transparent canvas padding non-destructively, then contain visible content
 * with one uniform pixel→tile scale. Never use nominal roof/footprint aspect to stretch pixels. */
export function rasterGeometry(size:{width:number;height:number},asset:BuildingAsset){
 if(asset.artwork.format!=='bundled-image')throw new Error('Raster geometry needs a bundled image.');
 const art=asset.artwork,crop:ImageBounds=art.visibleBounds??{x:0,y:0,width:art.pixelWidth,height:art.pixelHeight};
 const baseScale=Math.min(Math.max(.1,size.width-.12)/crop.width,Math.max(.1,size.height-.12)/crop.height);
 const p=art.presentation,b=p?.bounds??{x:0,y:0,width:1,height:1};
 const safe={x:b.x*size.width,y:b.y*size.height,width:b.width*size.width,height:b.height*size.height};
 // Cap enlargement rather than clipping roofs or drawing into neighbours/roads.
 const scale=Math.min(baseScale*(p?.scale??1),safe.width/crop.width,safe.height/crop.height);
 const width=crop.width*scale,height=crop.height*scale;
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 const x=clamp((size.width-width)/2+(p?.offset?.x??0)*size.width,safe.x,safe.x+safe.width-width);
 const y=clamp((size.height-height)/2+(p?.offset?.y??0)*size.height,safe.y,safe.y+safe.height-height);
 return {x,y,width,height,crop,scale};
}
/** A quantised LOD flag keeps memoised buildings stable during pan/zoom. CSS
 * pixels, independent of device pixel ratio. Existing assets opt in individually. */
export const rasterOverview=(reduced:boolean,cellPixels:number)=>reduced||cellPixels<16;
/** Uniform fitting of a lightweight overview within the same safe raster bounds. */
export function rasterOverviewGeometry(size:{width:number;height:number},asset:BuildingAsset){
 const art=asset.artwork;if(art.format!=='bundled-image'||!art.presentation?.overview)return;
 const r=rasterGeometry(size,asset),vector=art.presentation.overview,[vx,vy,vw,vh]=vector.viewBox;
 const scale=Math.min(r.width/vw,r.height/vh);
 return {vector,bounds:r,x:r.x+(r.width-vw*scale)/2-vx*scale,y:r.y+(r.height-vh*scale)/2-vy*scale,scale};
}
/** Same crop when using the shared reduced-resolution image instead of the original. */
export function rasterSourceCrop(asset:BuildingAsset,source:{width:number;height:number}){
 const {crop}=rasterGeometry({width:1,height:1},asset);
 if(asset.artwork.format!=='bundled-image')throw new Error('Expected raster');
 return {x:crop.x*source.width/asset.artwork.pixelWidth,y:crop.y*source.height/asset.artwork.pixelHeight,width:crop.width*source.width/asset.artwork.pixelWidth,height:crop.height*source.height/asset.artwork.pixelHeight};
}
export const artworkHasShadow=(asset:BuildingAsset)=>asset.artwork.format==='vector';
