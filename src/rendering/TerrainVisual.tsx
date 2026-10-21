import {GrasslandVisual} from './GrasslandVisual';
import {ForestRasterVisual} from './ForestRasterVisual';
import type Konva from 'konva';
import {memo,useMemo,useRef,useLayoutEffect} from 'react';
import {Group,Path,Shape} from 'react-konva';
import type {TerrainPath} from './terrainGeometry';
import {nativeTerrainPath,nativeTerrainChunks,visibleTerrainPath} from './nativeTerrain';
const TerrainBatch=memo(function TerrainBatch({path:p}:{path:TerrainPath}){
 const chunks=useMemo(()=>nativeTerrainChunks(p),[p]);
 const native=useMemo(()=>chunks?null:nativeTerrainPath(p),[p,chunks]);
 if(!native&&!chunks)return <Path listening={false} data={p.data} fill={p.fill} stroke={p.stroke} strokeWidth={p.width} opacity={p.opacity}/>;
 return <Shape name={chunks?'forest-canopy-batch':undefined} listening={false} opacity={p.opacity??1} sceneFunc={context=>{
  const ctx=context._context;ctx.save();
  if(p.fill)ctx.fillStyle=p.fill;if(p.stroke){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width??1;ctx.lineCap='round';}
  const draw=(path:Path2D)=>{if(p.fill)ctx.fill(path);if(p.stroke)ctx.stroke(path);};
  if(chunks){const visible=visibleTerrainPath(p,chunks,ctx.getTransform(),ctx.canvas.width,ctx.canvas.height);if(visible)draw(visible);}else if(native)draw(native);
  ctx.restore();
 }}/>;
});
export const TerrainVisual=memo(function TerrainVisual({paths,cell,width,height,cachePixels=0}:{paths:TerrainPath[];cell:number;width:number;height:number;cachePixels?:number}){
 const root=useRef<Konva.Group>(null);
 // A disposable overview bitmap speeds camera redraws. It is presentation only,
 // bounded to 2048px per edge, never saved/exported; close zoom keeps native vectors.
 useLayoutEffect(()=>{const group=root.current;if(!group)return;group.clearCache();if(cachePixels>0&&paths.length){try{group.cache({x:0,y:0,width,height,pixelRatio:Math.min(cachePixels,2048/Math.max(width,height)),hitCanvasPixelRatio:1});}catch{group.clearCache();}}return()=>{group.clearCache();};},[paths,width,height,cachePixels]);
 return <Group ref={root} listening={false} scaleX={cell} scaleY={cell}>{(['base','nature','water','relief'] as const).map(layer=><Group key={layer} name={layer}>{paths.filter(p=>(p.layer??'base')===layer).map((p,i)=>p.grassland?<GrasslandVisual key={i} patches={p.grassland}/>:p.sprites?<ForestRasterVisual key={i} sprites={p.sprites}/>:<TerrainBatch key={i} path={p}/>)}</Group>)}</Group>;
});
