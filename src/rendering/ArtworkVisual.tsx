import {memo,useMemo} from 'react';
import {Path,Shape} from 'react-konva';
import type {ArtworkPath} from '../assets/buildings/types';
import {nativeTerrainPath} from './nativeTerrain';
/** The same registry path is parsed once, even when many homes share an asset.
 * SVG thumbnails/exports consume its data directly; no scene pixels become state. */
export const ArtworkVisual=memo(function ArtworkVisual({path:p,shadow}:{path:ArtworkPath;shadow?:string}){
 const native=useMemo(()=>nativeTerrainPath(p),[p]);
 if(!native)return <Path listening={false} data={p.data} fill={shadow??p.fill} stroke={shadow?undefined:p.stroke} strokeWidth={p.width??1} lineJoin="round" lineCap="round"/>;
 return <Shape listening={false} sceneFunc={context=>{const ctx=context._context;ctx.save();if(shadow||p.fill!=='none'){ctx.fillStyle=shadow??p.fill;ctx.fill(native);}if(p.stroke&&!shadow){ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width??1;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(native);}ctx.restore();}}/>;
});
