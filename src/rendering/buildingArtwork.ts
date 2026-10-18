import type {Building} from '../model/document';
import type {BuildingAsset,ArtworkPath} from '../assets/buildings/types';
export function assetTransform(b:Pick<Building,'width'|'height'>,asset:BuildingAsset){
 const [x,y,width,height]=asset.artwork.viewBox,ratio=b.width/b.height,[min,max]=asset.footprint.aspectRange,contain=ratio<min||ratio>max,ideal=asset.footprint.nominal[0]/asset.footprint.nominal[1];
 let w=Math.max(.1,b.width-.12),h=Math.max(.1,b.height-.12);if(contain){if(w/h>ideal)w=h*ideal;else h=w/ideal;}
 return {x:(b.width-w)/2-x*w/width,y:(b.height-h)/2-y*h/height,scaleX:w/width,scaleY:h/height,contain};
}
/** Identical vector inputs feed Konva, thumbnails and full-map SVG/PNG. */
export const artworkPaths=(asset:BuildingAsset,reduced=false):readonly ArtworkPath[]=>reduced?asset.artwork.paths.filter(p=>p.level==='mass'||p.level==='structure'&&(p.width??1)>=2):asset.artwork.paths;
export const artworkSilhouette=(asset:BuildingAsset)=>artworkPaths(asset,true).filter(p=>p.level==='mass'&&p.fill!=='none');
export function artworkSvg(asset:BuildingAsset,reduced=false,shadow?:string):string{return (shadow?artworkSilhouette(asset):artworkPaths(asset,reduced)).map(p=>`<path d="${p.data}" fill="${shadow??p.fill}" ${p.stroke&&!shadow?`stroke="${p.stroke}" stroke-width="${p.width??1}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`).join('');}
