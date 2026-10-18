import { useMemo } from 'react';
import { Group, Path, Rect, Line } from 'react-konva';
import type { SettlementDocument } from '../model/document';
import type { DevelopmentProposal } from '../generator/development';
import { footprint } from '../model/buildings';
import { districtGeometry } from './districtGeometry';
import { roadGeometry } from './roadGeometry';
import { symbolPaths } from './symbols';
import { buildingDefinition } from '../model/catalogue';
export function DevelopmentOverlay({doc,proposal}:{doc:SettlementDocument;proposal:DevelopmentProposal|null}){
 const geometry=useMemo(()=>{if(!proposal)return null;const district=doc.districts.find(d=>d.id===proposal.districtId);if(!district)return null;const scene={...doc,buildings:[...doc.buildings.filter(b=>!proposal.removeIds.includes(b.id)),...proposal.buildings],roads:[...doc.roads,...proposal.roads]};return {district:districtGeometry(doc,district),roads:proposal.roads.map(r=>({...roadGeometry(scene,r),id:r.id}))};},[doc,proposal]);
 if(!proposal||!geometry)return null;
 return <Group listening={false} scaleX={doc.grid.cellSize} scaleY={doc.grid.cellSize}><Path data={geometry.district.fill} fill="#6bbdc8" opacity={.08}/><Path data={geometry.district.boundary} stroke="#7ed3dd" strokeWidth={.15}/>{geometry.roads.map(r=><Path key={r.id} data={r.data} stroke="#ffdf70" strokeWidth={Math.max(.3,r.width)} lineCap="round"/>)}{doc.buildings.filter(b=>proposal.removeIds.includes(b.id)).map(b=>{const f=footprint(b);return <Group key={b.id}><Rect x={b.x} y={b.y} width={f.width} height={f.height} fill="#ee5e58" opacity={.65}/><Line points={[b.x,b.y,b.x+f.width,b.y+f.height]} stroke="#ffbeb5" strokeWidth={.15}/></Group>;})}{proposal.buildings.map(b=>{const f=footprint(b);return <Group key={b.id} x={b.x} y={b.y}><Rect width={f.width} height={f.height} fill="#459c75" stroke="#9fffc4" strokeWidth={.12}/><Group x={f.width/2} y={f.height/2} rotation={b.rotation}><Path data={symbolPaths[buildingDefinition(b.kind).symbol]} x={-b.width/2+.125} y={-b.height/2+.125} scaleX={(b.width-.25)/64} scaleY={(b.height-.25)/64} fill="#32694e" stroke="#d8ffe3" strokeWidth={2}/></Group></Group>;})}</Group>;
}
