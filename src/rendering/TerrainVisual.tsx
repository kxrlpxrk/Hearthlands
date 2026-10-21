import {GrasslandVisual} from './GrasslandVisual';
import {ForestRasterVisual} from './ForestRasterVisual';
import type Konva from 'konva';
import {memo,useMemo,useRef,useLayoutEffect} from 'react';
import {Group} from 'react-konva';
import {TerrainBatch} from './TerrainBatch';
import type {TerrainPath} from './terrainGeometry';
const emptyPaths:readonly TerrainPath[]=[];
/** The low-frequency field needs no micro-detail. At close zoom retain one
 * small 4px/tile bitmap rather than filling six full-map paths every frame.
 * At overview zoom its parent already owns that same-resolution bitmap. */
const GroundBatches=memo(function GroundBatches({paths,width,height,cachedByParent}:{paths:readonly TerrainPath[];width:number;height:number;cachedByParent:boolean}){
 const root=useRef<Konva.Group>(null);
 useLayoutEffect(()=>{const group=root.current;if(!group)return;group.clearCache();if(!cachedByParent)try{group.cache({x:0,y:0,width,height,pixelRatio:4,hitCanvasPixelRatio:1});}catch{group.clearCache();}return()=>{group.clearCache();};},[paths,width,height,cachedByParent]);
 return <Group ref={root} name="grassland-ground-cache" listening={false}>{paths.map((p,i)=><TerrainBatch key={i} name="grassland-ground-batch" path={p}/>)}</Group>;
});
const TerrainSurface=memo(function TerrainSurface({paths,cell,width,height,cachePixels=0,extraPaths=emptyPaths}:{paths:TerrainPath[];extraPaths?:readonly TerrainPath[];cell:number;width:number;height:number;cachePixels?:number}){
 const root=useRef<Konva.Group>(null);
 // A disposable overview bitmap speeds camera redraws. It is presentation only,
 // bounded to 2048px per edge, never saved/exported; close zoom keeps native vectors.
 useLayoutEffect(()=>{const group=root.current;if(!group)return;group.clearCache();if(cachePixels>0&&paths.length){try{group.cache({x:0,y:0,width,height,pixelRatio:Math.min(cachePixels,2048/Math.max(width,height)),hitCanvasPixelRatio:1});}catch{group.clearCache();}}return()=>{group.clearCache();};},[paths,extraPaths,width,height,cachePixels]);
 return <Group ref={root} listening={false} scaleX={cell} scaleY={cell}>{(['base','nature','water','relief'] as const).map(layer=><Group key={layer} name={layer}>{paths.filter(p=>(p.layer??'base')===layer).map((p,i)=>p.sprites?<ForestRasterVisual key={i} sprites={p.sprites}/>:<TerrainBatch key={i} path={p}/>)}</Group>)}{!!extraPaths.length&&<GroundBatches paths={extraPaths} width={width} height={height} cachedByParent={cachePixels>0}/>}</Group>;
});

/** Keep grassland outside overview bitmaps so the Fit fade never rebuilds trees.
 * Ground is cached at <=4px/tile; the approved forest/water/relief cache retains
 * its original resolution. Close views keep the original native terrain paths. */
export const TerrainVisual=memo(function TerrainVisual({paths,cell,width,height,cachePixels=0,pixelsPerTile=Infinity}:{paths:TerrainPath[];cell:number;width:number;height:number;cachePixels?:number;pixelsPerTile?:number}){
 const groups=useMemo(()=>({base:paths.filter(p=>!p.grassland&&(p.layer??'base')==='base'),top:paths.filter(p=>!p.grassland&&(p.layer??'base')!=='base'),ground:paths.flatMap(p=>p.grasslandGround??[]),meadows:paths.filter(p=>p.grassland)}),[paths]);
 if(!groups.meadows.length)return <TerrainSurface paths={paths} cell={cell} width={width} height={height} cachePixels={cachePixels}/>;
 return <><TerrainSurface extraPaths={groups.ground} paths={groups.base} cell={cell} width={width} height={height} cachePixels={cachePixels?Math.min(cachePixels,4):0}/><Group listening={false} scaleX={cell} scaleY={cell}>{groups.meadows.map((p,i)=><GrasslandVisual key={i} patches={p.grassland!} pixelsPerTile={pixelsPerTile}/>)}</Group><TerrainSurface paths={groups.top} cell={cell} width={width} height={height} cachePixels={cachePixels}/></>;
});
