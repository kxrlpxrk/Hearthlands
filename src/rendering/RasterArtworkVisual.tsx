import {Group,Image} from 'react-konva';
import type {BuildingAsset} from '../assets/buildings/types';
import {useBundledImage} from './bundledImages';
import {assetTransform,artworkPaths} from './buildingArtwork';
import {rasterGeometry,rasterSourceCrop} from './rasterGeometry';
import {ArtworkVisual} from './ArtworkVisual';
/** Local building coordinates. Entire image subtree is non-interactive; hit regions live in the editor. */
export function RasterArtworkVisual({asset,reduced,width,height,cell}:{asset:BuildingAsset;reduced:boolean;width:number;height:number;cell:number}){
 const image=useBundledImage(asset,reduced),r=rasterGeometry({width,height},asset),t=assetTransform({width,height},asset);
 return image?<Image name="bundled-building-image" listening={false} image={image} crop={rasterSourceCrop(asset,{width:image.width,height:image.height})} x={r.x*cell} y={r.y*cell} width={r.width*cell} height={r.height*cell}/>:<Group x={t.x*cell} y={t.y*cell} scaleX={t.scaleX*cell} scaleY={t.scaleY*cell} listening={false}>{artworkPaths(asset,reduced).map((p,i)=><ArtworkVisual key={i} path={p}/>)}</Group>;
}
