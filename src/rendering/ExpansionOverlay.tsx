import type {GroundRegion} from './illustratedGround';
import type {GrasslandMode} from '../assets/grassland/registry';
import {BuildingVisual} from './BuildingVisual';
import {TerrainVisual} from './TerrainVisual';
import { useMemo } from 'react';
import { Group, Path, Rect } from 'react-konva';
import type { SettlementDocument } from '../model/document';
import type { ExpansionProposal } from '../generator/expansion';
import { footprint } from '../model/buildings';
import { districtGeometry } from './districtGeometry';
import { roadContext, roadGeometry } from './roadGeometry';
import { terrainScene } from './scene';
import type {ForestPack} from '../assets/forests/catalogue';
import type {VisualStyle} from './styles';
export function ExpansionOverlay({doc,proposal:p,style='planning',reduced=false,pixelsPerTile=Infinity,cachePixels=0,forestPilot=false,forestPack='pilot',forestAssets=[],groundViewport,ground63=false,grassland='off',grasslandAssets=[],terrainPixelsPerTile=Infinity}:{groundViewport?:GroundRegion;ground63?:boolean;terrainPixelsPerTile?:number;grassland?:GrasslandMode;grasslandAssets?:readonly string[];forestPack?:ForestPack;forestPilot?:boolean;forestAssets?:readonly string[];doc:SettlementDocument;proposal:ExpansionProposal|null;style?:VisualStyle;reduced?:boolean;pixelsPerTile?:number;cachePixels?:number}){
 const geometry=useMemo(()=>{if(!p)return null;const enlarged=doc.grid.width!==p.document.grid.width||doc.grid.height!==p.document.grid.height;const context=roadContext(p.document);return {districts:p.districts.map(d=>districtGeometry(p.document,d)),roads:p.roads.map(r=>roadGeometry(p.document,r,context)),terrain:enlarged?terrainScene(p.document,{...p.document.landscape,style,reduced,forestPilot,forestPack,forestAssets,ground63,grassland,grasslandAssets}):[]};},[doc,p,style,reduced,forestPilot,forestPack,forestAssets,ground63,grassland,grasslandAssets]);
 if(!p||!geometry)return null;
 return <Group listening={false} scaleX={doc.grid.cellSize} scaleY={doc.grid.cellSize}>
 {!!geometry.terrain.length&&<Group clipFunc={context=>{context.rect(doc.grid.width,0,p.document.grid.width-doc.grid.width,p.document.grid.height);context.rect(0,doc.grid.height,doc.grid.width,p.document.grid.height-doc.grid.height);}}><TerrainVisual viewport={groundViewport} pixelsPerTile={terrainPixelsPerTile} paths={geometry.terrain} cell={1} width={p.document.grid.width} height={p.document.grid.height} cachePixels={cachePixels}/></Group>}
 <Rect width={p.document.grid.width} height={p.document.grid.height} stroke="#d5a6f6" strokeWidth={.25} dash={[1,.6]}/>{geometry.districts.map((g,i)=><Group key={i}><Path data={g.fill} fill="#59d0d8" opacity={.15}/><Path data={g.boundary} stroke="#7ce6ed" strokeWidth={.15}/></Group>)}{geometry.roads.map((g,i)=><Path key={i} data={g.data} stroke="#ffdf70" strokeWidth={g.width} lineCap="round"/>)}{p.buildings.map(b=>{const f=footprint(b);return <Group key={b.id} x={b.x} y={b.y}><BuildingVisual building={b} seed={doc.seed} architecture={doc.architecture} style={style} reduced={reduced} pixelsPerTile={pixelsPerTile} cell={1}/><Rect width={f.width} height={f.height} fill="rgba(69,156,117,.25)" stroke="#b7ffd6" strokeWidth={.13}/></Group>;})}</Group>;
}
