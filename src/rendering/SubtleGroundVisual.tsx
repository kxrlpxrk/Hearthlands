import {Group} from 'react-konva';
import {TerrainBatch} from './TerrainBatch';
import {subtleOpacity} from './groundDetail';
import type {SubtleScene} from './subtleGround';
export function SubtleGroundVisual({scene,pixelsPerTile}:{scene:SubtleScene;pixelsPerTile:number}){
 return <Group name="subtle-ground" listening={false} opacity={subtleOpacity(pixelsPerTile)} accentCount={scene.accents.length}>{scene.paths.map((p,i)=><TerrainBatch key={i} name="subtle-ground-batch" path={p}/>)}</Group>;
}
