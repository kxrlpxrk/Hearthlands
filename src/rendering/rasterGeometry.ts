import type {BuildingAsset,ImageBounds} from '../assets/buildings/types';
/** Crop transparent canvas padding non-destructively, then contain visible content
 * with one uniform pixel→tile scale. Never use nominal roof/footprint aspect to stretch pixels. */
export function rasterGeometry(size:{width:number;height:number},asset:BuildingAsset){
 if(asset.artwork.format!=='bundled-image')throw new Error('Raster geometry needs a bundled image.');
 const art=asset.artwork,crop:ImageBounds=art.visibleBounds??{x:0,y:0,width:art.pixelWidth,height:art.pixelHeight};
 const scale=Math.min(Math.max(.1,size.width-.12)/crop.width,Math.max(.1,size.height-.12)/crop.height);
 const width=crop.width*scale,height=crop.height*scale;
 return {x:(size.width-width)/2,y:(size.height-height)/2,width,height,crop,scale};
}
/** Same crop when using the shared reduced-resolution image instead of the original. */
export function rasterSourceCrop(asset:BuildingAsset,source:{width:number;height:number}){
 const {crop}=rasterGeometry({width:1,height:1},asset);
 if(asset.artwork.format!=='bundled-image')throw new Error('Expected raster');
 return {x:crop.x*source.width/asset.artwork.pixelWidth,y:crop.y*source.height/asset.artwork.pixelHeight,width:crop.width*source.width/asset.artwork.pixelWidth,height:crop.height*source.height/asset.artwork.pixelHeight};
}
export const artworkHasShadow=(asset:BuildingAsset)=>asset.artwork.format==='vector';
