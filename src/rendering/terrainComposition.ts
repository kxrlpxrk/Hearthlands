import type {TerrainPath} from './terrainGeometry';
/** Water stays native between its original nature/relief neighbours. Overview
 * raster changes must never replace its mask, clipped paint or highlights. */
export function waterSurfaceParts(paths:readonly TerrainPath[]){
 const water=paths.filter(p=>p.water),before=paths.filter(p=>!p.water&&p.layer!=='relief'),after=paths.filter(p=>p.layer==='relief');
 return {water,before,after};
}
export function terrainCacheRatio(requested:number,width:number,height:number){return requested>0?Math.min(requested,2048/Math.max(width,height)):0;}
