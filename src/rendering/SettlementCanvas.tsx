import { roadContext, roadGeometry } from './roadGeometry';
import { entrance } from '../generator/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Path } from 'react-konva';
import type Konva from 'konva';
import { useStudio } from '../ui/store';
import { eraseCell, paintTerrain, placeBuilding } from '../model/operations';
import type { BuildingKind, TerrainKind } from '../model/document';
import { buildingDefinition } from '../model/catalogue';
import { buildingWarnings, footprint, snapPosition, updateBuilding } from '../model/buildings';
import { symbolPaths } from './symbols';
const colors = { grass: '#536447', water: '#355d69', forest: '#294c3e', stone: '#737775' };
type View = { x: number; y: number; scale: number };
type Gesture = { start: { x: number; y: number }; view: View; id?: string; x?: number; y?: number; moved: boolean };
export function SettlementCanvas() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [view, setView] = useState<View>({ x: 40, y: 40, scale: .45 });
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const gesture = useRef<Gesture | null>(null), pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const { present: doc, tool, edit, selectedId, select } = useStudio();
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(host.current!); return () => observer.disconnect(); }, []);
  useEffect(() => { setPreview(null); gesture.current = null; }, [tool, doc]);
  const cell = doc.grid.cellSize, width = doc.grid.width * cell, height = doc.grid.height * cell;
  const terrainPaths = useMemo(() => (Object.keys(colors) as TerrainKind[]).map(kind => ({ kind, data: doc.terrain.filter(t => t.kind === kind).map(t => `M${t.x * cell} ${t.y * cell}h${cell}v${cell}h-${cell}Z`).join('') })), [doc.terrain, cell]);
  const roads = useMemo(() => { const context=roadContext(doc); return doc.roads.filter(r => doc.layers.find(l => l.id === r.layerId)?.visible).map(r => ({ id: r.id, ...roadGeometry(doc, r, context) })); }, [doc.roads, doc.layers, doc.seed, doc.terrain, doc.buildings]);
  const openGround = useMemo(() => { const tiles=new Map(doc.terrain.map(t=>[`${t.x},${t.y}`,t.kind])); return (doc.planning?.openSpaces ?? []).filter(s => s.kind !== 'expansion').map((s,i) => ({ id: i, kind: s.kind, data: s.cells.filter(c=>(tiles.get(`${c.x},${c.y}`)??'grass')==='grass').map(c=>`M${c.x*cell} ${c.y*cell}h${cell}v${cell}h-${cell}Z`).join('') })); }, [doc.planning, doc.terrain, cell]);
  const selected = doc.buildings.find(b => b.id === selectedId);
  const warnings = selected ? buildingWarnings(doc, preview?.id === selected.id ? { ...selected, ...preview } : selected) : [];
  function zoom(factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * factor)); return { scale, x: anchor.x - (anchor.x - v.x) * scale / v.scale, y: anchor.y - (anchor.y - v.y) * scale / v.scale }; });
  }
  function fit() { const scale = Math.min((size.width - 64) / width, (size.height - 64) / height); setView({ scale, x: (size.width - width * scale) / 2, y: (size.height - height * scale) / 2 }); }
  function finish() {
    const g = gesture.current; gesture.current = null;
    if (!g || suppress.current) { setPreview(null); return; }
    if (g.moved) { if (preview) edit(d => updateBuilding(d, preview.id, { x: preview.x, y: preview.y })); setPreview(null); return; }
    const p = stage.current!.getPointerPosition(); if (!p) return;
    if (tool === 'select') { select(g.id ?? null); return; }
    if (tool === 'pan') return;
    const target = { x: snapPosition((p.x - view.x) / view.scale / cell, doc.grid.snap), y: snapPosition((p.y - view.y) / view.scale / cell, doc.grid.snap) };
    if (tool === 'erase' || tool in colors) { const tile = { x: Math.floor((p.x - view.x) / view.scale / cell), y: Math.floor((p.y - view.y) / view.scale / cell) }; edit(d => tool === 'erase' ? eraseCell(d, tile) : paintTerrain(d, tile, tool as TerrainKind)); }
    else { const existing = doc.buildings.find(b => b.x === target.x && b.y === target.y); if (existing) { select(existing.id); setNotice('Building origin occupied · choose Select to edit or place nearby.'); return; } const id = crypto.randomUUID(); edit(d => placeBuilding(d, target, tool as BuildingKind, id)); select(id); }
  }
  return <div className={`canvas-host ${tool === 'pan' ? 'panning' : ''}`} ref={host}>
    <div className="canvas-label"><span className="live-dot"/> WORLD VIEW <span> / </span> {doc.grid.width} × {doc.grid.height} TILES</div>
    <Stage ref={stage} {...size} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
      onWheel={e => { e.evt.preventDefault(); zoom(e.evt.deltaY < 0 ? 1.12 : 1 / 1.12, stage.current!.getPointerPosition()!); }}
      onPointerDown={e => {
        if (!e.evt.isPrimary || e.evt.button > 0) return;
        suppress.current = false; setNotice('');
        (e.evt.target as Element).setPointerCapture?.(e.evt.pointerId);
        const id = e.target.findAncestor('.building', true)?.getAttr('buildingId') as string | undefined;
        const b = doc.buildings.find(b => b.id === id);
        gesture.current = { start: stage.current!.getPointerPosition()!, view, id, x: b?.x, y: b?.y, moved: false };
      }}
      onPointerMove={() => { const g = gesture.current, p = stage.current!.getPointerPosition(); if (!g || !p || suppress.current) return;
        const dx = p.x - g.start.x, dy = p.y - g.start.y;
        if (Math.hypot(dx, dy) < 6 && !g.moved) return; g.moved = true;
        if (tool === 'pan') setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
        if (tool === 'select' && g.id) select(g.id);
        if (tool === 'select' && g.id && !doc.buildings.find(b => b.id === g.id)?.locked) setPreview({ id: g.id, x: snapPosition(g.x! + dx / g.view.scale / cell, doc.grid.snap), y: snapPosition(g.y! + dy / g.view.scale / cell, doc.grid.snap) });
      }} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; setPreview(null); }}
      onTouchStart={e => { if (e.evt.touches.length === 2) { suppress.current = true; gesture.current = null; setPreview(null); pinch.current = null; } }}
      onTouchMove={e => { const t = e.evt.touches; if (t.length !== 2) return; e.evt.preventDefault(); const rect = host.current!.getBoundingClientRect(); const point = { x: (t[0].clientX + t[1].clientX) / 2 - rect.left, y: (t[0].clientY + t[1].clientY) / 2 - rect.top }; const distance = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); if (pinch.current) { const old = pinch.current; setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * distance / old.distance)); return { scale, x: point.x - (old.x - v.x) * scale / v.scale, y: point.y - (old.y - v.y) * scale / v.scale }; }); } pinch.current = { ...point, distance }; }}
      onTouchEnd={() => { pinch.current = null; }}>
      <Layer><Rect width={width} height={height} fill="#344536" stroke="#728062" strokeWidth={2}/>
        {terrainPaths.map(t => <Path key={t.kind} data={t.data} fill={colors[t.kind]} listening={false}/>)}
        {openGround.map(s => <Path key={s.id} data={s.data} fill={s.kind === 'field' ? '#71734d' : s.kind === 'yard' ? '#59694b' : '#777052'} opacity={.65} listening={false}/>)}
        {doc.grid.visible && <Group listening={false}>{Array.from({ length: doc.grid.width + 1 }, (_, i) => <Line key={`x${i}`} points={[i * cell, 0, i * cell, height]} stroke="#a5b78e" opacity={.13} strokeWidth={1}/>)}{Array.from({ length: doc.grid.height + 1 }, (_, i) => <Line key={`y${i}`} points={[0, i * cell, width, i * cell]} stroke="#a5b78e" opacity={.13} strokeWidth={1}/>)}</Group>}
        <Group listening={false}>{roads.map(r => <Path key={r.id} data={r.data} scaleX={cell} scaleY={cell} stroke="#b79e72" strokeWidth={r.width} lineCap="round" lineJoin="round"/>)}</Group>
        {doc.buildings.filter(b => doc.layers.find(l => l.id === b.layerId)?.visible).map(original => {
          const b = preview?.id === original.id ? { ...original, ...preview } : original;
          const f = footprint(b), w = b.width * cell, h = b.height * cell;
          const warn = buildingWarnings(doc, b).length > 0, active = selectedId === b.id;
          return <Group key={b.id} name="building" buildingId={b.id} x={b.x * cell} y={b.y * cell}>
            <Rect width={f.width * cell} height={f.height * cell} fill={b.locked ? '#625f4d' : '#997343'} stroke={warn ? '#ef927b' : active ? '#ffe2a0' : '#292d24'} strokeWidth={active ? 4 : 2}/>
            <Group listening={false} x={f.width * cell / 2} y={f.height * cell / 2} rotation={b.rotation}><Path data={symbolPaths[buildingDefinition(b.kind).symbol]} x={-w / 2 + 4} y={-h / 2 + 4} scaleX={(w - 8) / 64} scaleY={(h - 8) / 64} stroke="#efd19a" strokeWidth={2} fill="#725535"/></Group>
            <Rect listening={false} x={(entrance(b).x-b.x)*cell} y={(entrance(b).y-b.y)*cell-4} width={cell*.6} height={5} fill="#f7dda5"/>
            {b.locked && <Rect listening={false} x={3} y={3} width={8} height={8} fill="#c8d4de"/>}
          </Group>;
        })}
      </Layer>
    </Stage>
    {(warnings.length > 0 || notice) && <div role="alert" className="canvas-warning">{notice || warnings.join(' · ')}</div>}
    <div className="canvas-hint">{tool === 'pan' ? 'Drag to explore · Scroll or pinch to zoom' : tool === 'select' ? 'Tap to select · Drag to move · Properties to edit' : 'Tap to place · Select to edit · Pan to explore'}</div>
    <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1 / 1.25)}>−</button><span>{Math.round(view.scale * 100)}%</span><button aria-label="Zoom in" onClick={() => zoom(1.25)}>+</button><button onClick={fit}>Fit</button></div>
  </div>;
}
