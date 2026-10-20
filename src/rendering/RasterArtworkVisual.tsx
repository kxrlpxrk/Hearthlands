import {useRef} from 'react';
import {Group,Image} from 'react-konva';
import type {BuildingAsset} from '../assets/buildings/types';
import {useBundledImage,imageFailed} from './bundledImages';
import {assetTransform,artworkPaths} from './buildingArtwork';
import {rasterGeometry,rasterSourceCrop} from './rasterGeometry';
import {projectedRasterPixels,rasterDetail,type RasterDetail} from './rasterDetail';
import {ArtworkVisual} from './ArtworkVisual';
/** Local building coordinates. Detail changes source resolution only; all tiers
 * use the same alpha crop, transform, asset ID and non-interactive image node. */
export function RasterArtworkVisual({asset,reduced,pixelsPerTile=Infinity,width,height,cell}:{asset:BuildingAsset;reduced:boolean;pixelsPerTile?:number;width:number;height:number;cell:number}){
 const source=asset.artwork.format==='bundled-image'?asset.artwork.source:'',last=useRef<{source:string;detail:RasterDetail}|null>(null);
 const detail=rasterDetail(projectedRasterPixels({width,height},asset,pixelsPerTile),last.current?.source===source?last.current.detail:undefined);
 last.current={source,detail};
 const image=useBundledImage(asset,detail),r=rasterGeometry({width,height},asset),t=assetTransform({width,height},asset);
 if(image)return <Image name="bundled-building-image" rasterLevel={detail} rasterSource={source} listening={false} image={image} crop={rasterSourceCrop(asset,{width:image.width,height:image.height})} x={r.x*cell} y={r.y*cell} width={r.width*cell} height={r.height*cell}/>;
 // Avoid briefly showing a different design during the one-time initial decode.
 if(!imageFailed(asset))return null;
 return <Group name="raster-load-fallback" x={t.x*cell} y={t.y*cell} scaleX={t.scaleX*cell} scaleY={t.scaleY*cell} listening={false}>{artworkPaths(asset,reduced).map((p,i)=><ArtworkVisual key={i} path={p}/>)}</Group>;
}
