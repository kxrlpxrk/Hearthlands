import {rasterGeometry,artworkHasShadow,rasterOverviewGeometry} from './rasterGeometry';
import {imageFailed} from './bundledImages';
import {bundledImageSource} from '../assets/buildings/images';
import type {Building} from '../model/document';
import type {BuildingAsset,ArtworkPath} from '../assets/buildings/types';
export const vectorArtwork=(asset:BuildingAsset)=>asset.artwork.format==='vector'?asset.artwork:asset.artwork.fallback;
export function assetTransform(b:Pick<Building,'width'|'height'>,asset:BuildingAsset){
 const [x,y,width,height]=vectorArtwork(asset).viewBox,ratio=b.width/b.height,[min,max]=asset.footprint.aspectRange,contain=ratio<min||ratio>max,ideal=asset.footprint.nominal[0]/asset.footprint.nominal[1];
 let w=Math.max(.1,b.width-.12),h=Math.max(.1,b.height-.12);if(contain){if(w/h>ideal)w=h*ideal;else h=w/ideal;}
 return {x:(b.width-w)/2-x*w/width,y:(b.height-h)/2-y*h/height,scaleX:w/width,scaleY:h/height,contain};
}
/** Identical vector inputs feed Konva, thumbnails and full-map SVG/PNG. */
export const artworkPaths=(asset:BuildingAsset,reduced=false):readonly ArtworkPath[]=>{const paths=vectorArtwork(asset).paths;return reduced?paths.filter(p=>p.level==='mass'||p.level==='structure'&&(p.width??1)>=2):paths;};
export const artworkSilhouette=(asset:BuildingAsset)=>artworkPaths(asset,true).filter(p=>p.level==='mass'&&p.fill!=='none');
/** Vectors use their viewBox; raster output is in local building tile coordinates.
 * The optional size supplies exactly the same alpha crop/contain fit as the editor. */
export function artworkSvg(asset:BuildingAsset,reduced=false,shadow?:string,size={width:asset.footprint.nominal[0],height:asset.footprint.nominal[1]}):string{
 if(shadow&&!artworkHasShadow(asset))return '';
 const overview=!shadow&&reduced?rasterOverviewGeometry(size,asset):undefined;
 if(overview){const r=overview.bounds;return `<svg data-raster-overview="${asset.id}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" viewBox="${overview.vector.viewBox.join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden">${overview.vector.paths.map(p=>`<path d="${p.data}" fill="${p.fill}" ${p.stroke?`stroke="${p.stroke}" stroke-width="${p.width??1}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`).join('')}</svg>`;}
 const source=!shadow&&!imageFailed(asset)&&asset.artwork.format==='bundled-image'?bundledImageSource(asset.artwork.source):undefined;
 if(source&&asset.artwork.format==='bundled-image'){
  const r=rasterGeometry(size,asset),c=r.crop;
  return `<svg data-raster="${asset.id}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" viewBox="${c.x} ${c.y} ${c.width} ${c.height}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="${source}" x="0" y="0" width="${asset.artwork.pixelWidth}" height="${asset.artwork.pixelHeight}" preserveAspectRatio="xMidYMid meet"/></svg>`;
 }
 const paths=(shadow?artworkSilhouette(asset):artworkPaths(asset,reduced)).map(p=>`<path d="${p.data}" fill="${shadow??p.fill}" ${p.stroke&&!shadow?`stroke="${p.stroke}" stroke-width="${p.width??1}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`).join('');
 if(asset.artwork.format==='bundled-image'){const t=assetTransform(size,asset);return `<g transform="translate(${t.x} ${t.y}) scale(${t.scaleX} ${t.scaleY})">${paths}</g>`;}
 return paths;
}
