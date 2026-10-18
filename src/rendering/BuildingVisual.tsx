import {ArtworkVisual} from './ArtworkVisual';
import {resolveBuildingAsset} from '../model/appearance';
import type {ArchitectureSettings} from '../model/appearance';
import {assetTransform,artworkPaths,artworkSilhouette} from './buildingArtwork';
import {memo} from 'react';
import {Group,Path,Rect} from 'react-konva';
import type {Building} from '../model/document';
import {footprint} from '../model/buildings';
import {buildingDefinition} from '../model/catalogue';
import {symbolPaths} from './symbols';
import {buildingPresentation,type VisualStyle} from './styles';
/** Non-interactive art only. The editor owns footprint hit regions and all interaction overlays. */
export const BuildingVisual=memo(function BuildingVisual({building:b,style,reduced,cell,seed=1847,architecture}:{building:Building;style:VisualStyle;reduced:boolean;cell:number;seed?:number;architecture?:ArchitectureSettings}){
 const f=footprint(b),a=buildingPresentation(b,style,reduced),w=b.width*cell,h=b.height*cell;
 const asset=style==='illustrated'?resolveBuildingAsset({seed,architecture},b):null,t=asset?assetTransform(b,asset):null;
 return <Group name="building-art" assetId={asset?.id} listening={false}>{a.shadow&&asset&&t&&<Group x={f.width*cell/2+cell*.12} y={f.height*cell/2+cell*.16} rotation={b.rotation} opacity={.25}><Group x={-w/2+t.x*cell} y={-h/2+t.y*cell} scaleX={t.scaleX*cell} scaleY={t.scaleY*cell}>{artworkSilhouette(asset).map((p,i)=><ArtworkVisual key={i} path={p} shadow={a.shadowColor}/>)}</Group></Group>}{style==='planning'&&<><Rect width={f.width*cell} height={f.height*cell} fill={a.base} stroke={a.outline} strokeWidth={cell*.055}/><Rect x={cell*.06} y={cell*.06} width={Math.max(.1,f.width-.12)*cell} height={cell*.14} fill={a.accent}/></>}<Group x={f.width*cell/2} y={f.height*cell/2} rotation={b.rotation}>{asset&&t?<Group x={-w/2+t.x*cell} y={-h/2+t.y*cell} scaleX={t.scaleX*cell} scaleY={t.scaleY*cell}>{artworkPaths(asset,reduced).map((p,i)=><ArtworkVisual key={i} path={p}/>)}</Group>:<Path data={symbolPaths[buildingDefinition(b.kind).symbol]} x={-w/2+cell*.125} y={-h/2+cell*.125} scaleX={(w-cell*.25)/64} scaleY={(h-cell*.25)/64} fill={a.roof} stroke={a.ink} strokeWidth={style==='planning'?2.8:2}/>}</Group><Rect x={Math.floor(f.width/2)*cell} y={(f.height-.125)*cell} width={cell*.6} height={cell*.16} fill={a.entrance}/>{b.locked&&<Rect x={cell*.1} y={cell*.1} width={cell*.3} height={cell*.3} fill={a.lock} stroke="#203d3a" strokeWidth={cell*.04}/>}</Group>;
});
