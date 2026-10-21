import {Shape} from 'react-konva';
import type {GrasslandPatch} from './grasslandGeometry';
import {useGrasslandImages} from './grasslandImages';
import {terrainChunkVisible} from './nativeTerrain';
/** Single non-interactive batch. Camera changes only cull/draw cached surfaces. */
export function GrasslandVisual({patches}:{patches:readonly GrasslandPatch[]}){
 const state=useGrasslandImages(true);
 return <Shape name="grassland-pilot-images" grasslandPatchCount={patches.length} grasslandAssetIds={[...new Set(patches.map(p=>p.assetId))].sort()} listening={false} sceneFunc={context=>{
  const ctx=context._context,m=ctx.getTransform();
  for(const p of patches){
   if(!terrainChunkVisible({x:p.x-p.radius,y:p.y-p.radius,width:p.radius*2,height:p.radius*2},m,ctx.canvas.width,ctx.canvas.height))continue;
   const v=state.images.get(p.assetId)?.[p.variant];if(!v)continue;
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(v.image,-p.radius,-p.radius,p.radius*2,p.radius*2);ctx.restore();
  }
 }}/>;
}
