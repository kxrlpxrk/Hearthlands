import type {BuildingAsset} from '../assets/buildings/types';
import {rasterGeometry} from './rasterGeometry';
export type RasterDetail='high'|'medium'|'distant';
export const rasterCacheEdges={medium:256,distant:64} as const;
/** One-eighth octave buckets avoid rerendering memoised artwork on every pinch
 * event. Values are physical pixels per tile, including the device pixel ratio. */
export function rasterPixelBucket(pixels:number){
 return 2**(Math.round(Math.log2(Math.max(.01,Number.isFinite(pixels)?pixels:1))*8)/8);
}
/** Size of the original image canvas on screen, including its transparent padding.
 * This accounts for alpha cropping, safe scale, resizing and retina displays. */
export function projectedRasterPixels(size:{width:number;height:number},asset:BuildingAsset,pixelsPerTile:number){
 if(asset.artwork.format!=='bundled-image')return 0;
 return Math.max(asset.artwork.pixelWidth,asset.artwork.pixelHeight)*rasterGeometry(size,asset).scale*pixelsPerTile;
}
/** Matching bitmaps allow a discrete change with no animation/double drawing.
 * Oversampling headroom and hysteresis avoid blur and threshold oscillation. */
export function rasterDetail(pixels:number,previous?:RasterDetail):RasterDetail{
 if(previous==='distant'&&pixels<=56)return 'distant';
 if(previous==='medium'&&pixels>=40&&pixels<=224)return 'medium';
 if(previous==='high'&&pixels>=160)return 'high';
 if(previous)return pixels<40?'distant':pixels>224?'high':'medium';
 return pixels<=48?'distant':pixels<=192?'medium':'high';
}
