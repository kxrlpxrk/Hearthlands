import { useMemo } from 'react';
import { Group, Path, Rect } from 'react-konva';
import type { SettlementDocument } from '../model/document';
import type { ExpansionProposal } from '../generator/expansion';
import { footprint } from '../model/buildings';
import { districtGeometry } from './districtGeometry';
import { roadContext, roadGeometry } from './roadGeometry';
import { terrainGeometry } from './terrainGeometry';
export function ExpansionOverlay({doc,proposal:p}:{doc:SettlementDocument;proposal:ExpansionProposal|null}){
 const geometry=useMemo(()=>{if(!p)return null;const enlarged=doc.grid.width!==p.document.grid.width||doc.grid.height!==p.document.grid.height;const context=roadContext(p.document);return {districts:p.districts.map(d=>districtGeometry(p.document,d)),roads:p.roads.map(r=>roadGeometry(p.document,r,context)),terrain:enlarged?terrainGeometry(p.document):[]};},[doc,p]);
 if(!p||!geometry)return null;
 return <Group listening={false} scaleX={doc.grid.cellSize} scaleY={doc.grid.cellSize}>
 {[{x:doc.grid.width,y:0,width:p.document.grid.width-doc.grid.width,height:p.document.grid.height},{x:0,y:doc.grid.height,width:doc.grid.width,height:p.document.grid.height-doc.grid.height}].filter(r=>r.width>0&&r.height>0).map((r,i)=><Group key={i} clipX={r.x} clipY={r.y} clipWidth={r.width} clipHeight={r.height}>{geometry.terrain.map((t,j)=><Path key={j} data={t.data} fill={t.fill} stroke={t.stroke} strokeWidth={t.width} opacity={t.opacity}/>)}</Group>)}
 <Rect width={p.document.grid.width} height={p.document.grid.height} stroke="#d5a6f6" strokeWidth={.25} dash={[1,.6]}/>{geometry.districts.map((g,i)=><Group key={i}><Path data={g.fill} fill="#59d0d8" opacity={.15}/><Path data={g.boundary} stroke="#7ce6ed" strokeWidth={.15}/></Group>)}{geometry.roads.map((g,i)=><Path key={i} data={g.data} stroke="#ffdf70" strokeWidth={g.width} lineCap="round"/>)}{p.buildings.map(b=>{const f=footprint(b);return <Rect key={b.id} x={b.x} y={b.y} width={f.width} height={f.height} fill="#459c75" stroke="#b7ffd6" strokeWidth={.13}/>;})}</Group>;
}
