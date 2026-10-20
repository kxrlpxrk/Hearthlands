import {Group,Image} from 'react-konva';
import type {BuildingAsset} from '../assets/buildings/types';
import {useBundledImage} from './bundledImages';
import {assetTransform,artworkPaths} from './buildingArtwork';
import {rasterGeometry,rasterSourceCrop,rasterOverviewGeometry} from './rasterGeometry';
import {ArtworkVisual} from './ArtworkVisual';
/** Local building coordinates. Entire image subtree is non-interactive; hit regions live in the editor. */
export function RasterArtworkVisual({asset,reduced,overview=false,width,height,cell}:{asset:BuildingAsset;reduced:boolean;overview?:boolean;width:number;height:number;cell:number}){
 const image=useBundledImage(asset,reduced),r=rasterGeometry({width,height},asset),t=assetTransform({width,height},asset),o=overview?rasterOverviewGeometry({width,height},asset):undefined;
 if(o)return <Group name="raster-overview" x={o.x*cell} y={o.y*cell} scaleX={o.scale*cell} scaleY={o.scale*cell} clipX={o.vector.viewBox[0]} clipY={o.vector.viewBox[1]} clipWidth={o.vector.viewBox[2]} clipHeight={o.vector.viewBox[3]} listening={false}>{o.vector.paths.map((p,i)=><ArtworkVisual key={i} path={p}/>)}</Group>;
 return image?<Image name="bundled-building-image" listening={false} image={image} crop={rasterSourceCrop(asset,{width:image.width,height:image.height})} x={r.x*cell} y={r.y*cell} width={r.width*cell} height={r.height*cell}/>:<Group x={t.x*cell} y={t.y*cell} scaleX={t.scaleX*cell} scaleY={t.scaleY*cell} listening={false}>{artworkPaths(asset,reduced).map((p,i)=><ArtworkVisual key={i} path={p}/>)}</Group>;
}
