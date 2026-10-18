import {Image} from 'react-konva';
import type {BuildingAsset} from '../assets/buildings/types';
import {useBundledImage} from './bundledImages';
import {vectorArtwork,artworkPaths} from './buildingArtwork';
import {ArtworkVisual} from './ArtworkVisual';
export function RasterArtworkVisual({asset,reduced}:{asset:BuildingAsset;reduced:boolean}){
 const image=useBundledImage(asset,reduced),[x,y,width,height]=vectorArtwork(asset).viewBox;
 return image?<Image name="bundled-building-image" listening={false} image={image} x={x} y={y} width={width} height={height}/>:<>{artworkPaths(asset,reduced).map((p,i)=><ArtworkVisual key={i} path={p}/>)}</>;
}
