import type {TerrainPath} from './terrainGeometry';
import type {GrasslandSnapshot} from './grasslandImages';
import {grasslandAssetsById} from '../assets/grassland/registry';
import {grasslandTextureOpacity,grasslandSourceMix,grasslandOpaquePath} from './grasslandPresentation';
/** SVG uses output density, never the editor camera. Matching medium masks and
 * source-only opaque centres reproduce the native two-pass artwork exactly. */
export function grasslandSvg(paths:readonly TerrainPath[],images:GrasslandSnapshot,pixelsPerTile:number){
 const opacity=grasslandTextureOpacity(pixelsPerTile),used=new Map<string,string>();let defs='',content='';
 const define=(id:string,value:string)=>{if(!used.has(id)){used.set(id,value);defs+=value;}return id;};
 for(const t of paths){
  if(!t.grassland)continue;
  content+=(t.grasslandGround??[]).map(p=>`<path data-grassland-ground="true" d="${p.data}" fill="${p.fill}" opacity="${p.opacity}"/>`).join('');
  if(!opacity)continue;
  const sprites=t.grassland.map(p=>{
   const value=images.images.get(p.assetId)?.[p.variant],a=grasslandAssetsById.get(p.assetId);if(!value||!a)return '';
   const key=p.assetId.replace(/\./g,'-'),id=define(`grassland-source-${key}-${p.variant}`,`<image id="grassland-source-${key}-${p.variant}" width="384" height="384" href="${value.source}"/>`);
   const detail=opacity===1?grasslandSourceMix(p.radius*2*pixelsPerTile):0;let original='';
   if(detail&&value.originalSource){
    const source=define(`grassland-original-${key}`,`<image id="grassland-original-${key}" width="${a.width}" height="${a.height}" href="${value.originalSource}"/>`),clip=define(`grassland-opaque-${p.variant}`,`<clipPath id="grassland-opaque-${p.variant}"><path d="${grasslandOpaquePath(p.variant)}"/></clipPath>`),c=a.crop;
    original=`<g data-grassland-source-detail="${detail}" transform="scale(${p.radius})" clip-path="url(#${clip})" opacity="${detail}"><svg x="-1" y="-1" width="2" height="2" viewBox="${c.x} ${c.y} ${c.size} ${c.size}" preserveAspectRatio="xMidYMid meet"><use href="#${source}"/></svg></g>`;
   }
   return `<g data-grassland-asset="${p.assetId}" transform="translate(${p.x} ${p.y}) rotate(${p.angle*180/Math.PI})"><svg x="${-p.radius}" y="${-p.radius}" width="${2*p.radius}" height="${2*p.radius}" viewBox="0 0 384 384"><use href="#${id}"/></svg>${original}</g>`;
  }).join('');
  content+=`<g data-grassland-textures="true" opacity="${opacity}">${sprites}</g>`;
 }
 return {defs,content};
}
