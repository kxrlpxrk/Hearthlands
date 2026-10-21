import {useMemo} from 'react';
import {Shape} from 'react-konva';
import type {ForestSprite} from './forestPilot';
import {forestAssetsById,assetForestPack} from '../assets/forests/catalogue';
import {useForestImages,forestImageLevel} from './forestImages';
import {rasterDetail,type RasterDetail} from './rasterDetail';
import {terrainChunkVisible} from './nativeTerrain';
/** One non-interactive draw batch, shared decoded images, zero per-tree Konva nodes. */
export function ForestRasterVisual({sprites}:{sprites:readonly ForestSprite[]}){
 const pack=assetForestPack(sprites[0]?.assetId??''),images=useForestImages(true,pack),levels=useMemo(()=>new Map<ForestSprite,RasterDetail>(),[sprites]);
 return <Shape name="forest-pilot-images" forestPack={pack} forestSpriteCount={sprites.length} forestAssetIds={[...new Set(sprites.map(s=>s.assetId))].sort()} listening={false} sceneFunc={context=>{
  const ctx=context._context,m=ctx.getTransform(),pixels=Math.hypot(m.a,m.b);
  for(const s of sprites){
   if(!terrainChunkVisible({x:s.x-s.radius,y:s.y-s.radius,width:2*s.radius,height:2*s.radius},m,ctx.canvas.width,ctx.canvas.height))continue;
   const a=forestAssetsById.get(s.assetId),value=images.images.get(s.assetId);if(!a||!value)continue;
   const projected=Math.max(a.pixelWidth,a.pixelHeight)*s.width/a.alpha.width*pixels,level=rasterDetail(projected,levels.get(s));levels.set(s,level);
   const image=forestImageLevel(value,level),ratio=(image as HTMLImageElement|HTMLCanvasElement).width/a.pixelWidth;
   ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,a.alpha.x*ratio,a.alpha.y*ratio,a.alpha.width*ratio,a.alpha.height*ratio,s.left,s.top,s.width,s.height);ctx.restore();
  }
 }}/>;
}
