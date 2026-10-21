import {memo,useMemo} from 'react';
import {Shape} from 'react-konva';
import type {GrasslandPatch} from './grasslandGeometry';
import {grasslandAssetsById} from '../assets/grassland/registry';
import {useGrasslandImages} from './grasslandImages';
import {grasslandTextureOpacity,grasslandSourceMix,grasslandOpaquePath} from './grasslandPresentation';
import {terrainChunkVisible} from './nativeTerrain';
/** One non-interactive texture batch above the cached ground bands.
 * Screen density controls opacity only: no regenerated geometry during zoom. */
export const GrasslandVisual=memo(function GrasslandVisual({patches,pixelsPerTile}:{patches:readonly GrasslandPatch[];pixelsPerTile:number}){
 const state=useGrasslandImages(true),opacity=grasslandTextureOpacity(pixelsPerTile);
 const clips=useMemo(()=>typeof Path2D==='undefined'?[]:Array.from({length:3},(_,i)=>new Path2D(grasslandOpaquePath(i))),[]);
 return <Shape name="grassland-pilot-images" grasslandTextureOpacity={opacity} grasslandPatchCount={patches.length} grasslandAssetIds={[...new Set(patches.map(p=>p.assetId))].sort()} listening={false} sceneFunc={context=>{
  if(!opacity)return;
  const ctx=context._context,m=ctx.getTransform(),density=Math.hypot(m.a,m.b);
  for(const p of patches){
   if(!terrainChunkVisible({x:p.x-p.radius,y:p.y-p.radius,width:p.radius*2,height:p.radius*2},m,ctx.canvas.width,ctx.canvas.height))continue;
   const v=state.images.get(p.assetId)?.[p.variant];if(!v)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(p.radius,p.radius);ctx.globalAlpha*=opacity;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(v.image,-1,-1,2,2);
   const detail=opacity===1?grasslandSourceMix(p.radius*2*density):0,clip=clips[p.variant],asset=grasslandAssetsById.get(p.assetId);
   // The clip is strictly inside fully opaque mask pixels. Replacing this
   // interior cannot double alpha, change the silhouette or create a halo.
   if(detail&&clip&&v.original&&asset){const c=asset.crop;ctx.clip(clip);ctx.globalAlpha*=detail;ctx.drawImage(v.original,c.x,c.y,c.size,c.size,-1,-1,2,2);}
   ctx.restore();
  }
 }}/>;
});
