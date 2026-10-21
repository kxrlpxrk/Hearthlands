import {memo,useMemo} from 'react';
import {Path,Shape} from 'react-konva';
import type {TerrainPath} from './terrainGeometry';
import {nativeTerrainPath,nativeTerrainChunks,visibleTerrainPath} from './nativeTerrain';
export const TerrainBatch=memo(function TerrainBatch({path:p,name}:{path:TerrainPath;name?:string}){
 const chunks=useMemo(()=>nativeTerrainChunks(p),[p]);
 const native=useMemo(()=>chunks?null:nativeTerrainPath(p),[p,chunks]);
 if(!native&&!chunks)return <Path listening={false} data={p.data} fill={p.fill} stroke={p.stroke} strokeWidth={p.width} opacity={p.opacity}/>;
 return <Shape name={name??(chunks?'forest-canopy-batch':undefined)} listening={false} opacity={p.opacity??1} sceneFunc={context=>{
  const ctx=context._context;ctx.save();
  if(p.fill)ctx.fillStyle=p.fill;if(p.stroke){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width??1;ctx.lineCap='round';}
  const draw=(path:Path2D)=>{if(p.fill)ctx.fill(path);if(p.stroke)ctx.stroke(path);};
  if(chunks){const visible=visibleTerrainPath(p,chunks,ctx.getTransform(),ctx.canvas.width,ctx.canvas.height);if(visible)draw(visible);}else if(native)draw(native);
  ctx.restore();
 }}/>;
});
