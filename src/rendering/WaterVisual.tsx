import {memo,useMemo} from 'react';
import {Path,Shape} from 'react-konva';
import {nativeTerrainPath} from './nativeTerrain';
import {waterBase,type WaterScene} from './waterGeometry';
/** A single non-listening draw node. Native paths are decoded once per immutable
 * scene; camera transforms and the existing overview cache handle zoom/pan. */
export const WaterVisual=memo(function WaterVisual({scene}:{scene:WaterScene}){
 const mask=useMemo(()=>nativeTerrainPath({data:scene.mask}),[scene]);
 const paints=useMemo(()=>scene.paints.map(p=>({paint:p,path:nativeTerrainPath(p)})),[scene]);
 if(!mask)return <Path name="illustrated-water" listening={false} data={scene.mask} fill={waterBase}/>;
 return <Shape name="illustrated-water" listening={false} waterHighlights={scene.highlights.length} waterFallback={scene.fallback} sceneFunc={context=>{
  const ctx=context._context;ctx.save();ctx.fillStyle=waterBase;ctx.fill(mask);ctx.clip(mask);ctx.lineCap='round';ctx.lineJoin='round';
  for(const {paint:p,path}of paints){if(!path)continue;ctx.globalAlpha=p.opacity??1;if(p.fill){ctx.fillStyle=p.fill;ctx.fill(path);}if(p.stroke){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width??1;ctx.stroke(path);}}
  ctx.restore();
 }}/>;
});
