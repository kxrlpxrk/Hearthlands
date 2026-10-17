import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { useStudio } from '../ui/store';
import { eraseCell, paintTerrain, placeBuilding } from '../model/operations';
import type { BuildingKind, TerrainKind } from '../model/document';
const colors = { grass: '#536447', water: '#355d69', forest: '#294c3e', stone: '#737775' };
export function SettlementCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [view, setView] = useState({ x: 40, y: 40, scale: .45 });
  const pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const doc = useStudio(s => s.present), tool = useStudio(s => s.tool), edit = useStudio(s => s.edit);
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(host.current!); return () => observer.disconnect(); }, []);
  const cell = doc.grid.cellSize, width = doc.grid.width * cell, height = doc.grid.height * cell;
  function zoom(factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * factor)); return { scale, x: anchor.x - (anchor.x - v.x) * scale / v.scale, y: anchor.y - (anchor.y - v.y) * scale / v.scale }; });
  }
  function fit() { const scale = Math.min((size.width - 64) / width, (size.height - 64) / height); setView({ scale, x: (size.width - width * scale) / 2, y: (size.height - height * scale) / 2 }); }
  function apply() {
    const p = stage.current?.getPointerPosition(); if (!p || tool === 'pan') return;
    if (Math.hypot(p.x - start.current.x, p.y - start.current.y) > 8) return;
    const target = { x: Math.floor((p.x - view.x) / view.scale / cell), y: Math.floor((p.y - view.y) / view.scale / cell) };
    edit(d => tool === 'erase' ? eraseCell(d, target) : tool in colors ? paintTerrain(d, target, tool as TerrainKind) : placeBuilding(d, target, tool as BuildingKind, crypto.randomUUID()));
  }
  return <div className={`canvas-host ${tool === 'pan' ? 'panning' : ''}`} ref={host}>
    <div className="canvas-label"><span className="live-dot"/> WORLD VIEW <span> / </span> {doc.grid.width} × {doc.grid.height} TILES</div>
    <Stage ref={stage} {...size} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale} draggable={tool === 'pan'}
      onDragEnd={e => { if (e.target === stage.current) setView(v => ({ ...v, x: e.target.x(), y: e.target.y() })); }}
      onWheel={e => { e.evt.preventDefault(); zoom(e.evt.deltaY < 0 ? 1.12 : 1 / 1.12, stage.current!.getPointerPosition()!); }}
      onPointerDown={() => { start.current = stage.current!.getPointerPosition()!; }} onPointerUp={apply}
      onTouchStart={e => { if (e.evt.touches.length === 2) { stage.current?.stopDrag(); pinch.current = null; } }}
      onTouchMove={e => { const t = e.evt.touches; if (t.length !== 2) return; e.evt.preventDefault(); const rect = host.current!.getBoundingClientRect(); const point = { x: (t[0].clientX + t[1].clientX) / 2 - rect.left, y: (t[0].clientY + t[1].clientY) / 2 - rect.top }; const distance = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); if (pinch.current) { const old = pinch.current; setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * distance / old.distance)); return { scale, x: point.x - (old.x - v.x) * scale / v.scale, y: point.y - (old.y - v.y) * scale / v.scale }; }); } pinch.current = { ...point, distance }; }}
      onTouchEnd={() => { if (pinch.current) { start.current = { x: -9999, y: -9999 }; pinch.current = null; } }}>
      <Layer><Rect width={width} height={height} fill="#344536" stroke="#728062" strokeWidth={2}/>
        {doc.terrain.map(t => <Rect key={`${t.x}:${t.y}`} x={t.x * cell} y={t.y * cell} width={cell} height={cell} fill={colors[t.kind]}/>)}
        {doc.grid.visible && <Group listening={false}>{Array.from({ length: doc.grid.width + 1 }, (_, i) => <Line key={`x${i}`} points={[i * cell, 0, i * cell, height]} stroke="#a5b78e" opacity={.13} strokeWidth={1}/>)}{Array.from({ length: doc.grid.height + 1 }, (_, i) => <Line key={`y${i}`} points={[0, i * cell, width, i * cell]} stroke="#a5b78e" opacity={.13} strokeWidth={1}/>)}</Group>}
        {doc.buildings.filter(b => doc.layers.find(l => l.id === b.layerId)?.visible).map(b => <Group key={b.id} x={b.x * cell} y={b.y * cell}><Rect x={3} y={3} width={26} height={26} fill={b.kind === 'watchtower' ? '#a9aaa0' : '#b58a55'} stroke="#302b24" strokeWidth={2}/><Line points={[2, 15, 16, 2, 30, 15]} stroke="#e0ba7a" strokeWidth={3}/><Text text={b.kind === 'longhouse' ? 'H' : b.kind === 'watchtower' ? 'T' : 'S'} x={10} y={14} fontSize={12} fill="#292a24"/></Group>)}
      </Layer>
    </Stage>
    <div className="canvas-hint">{tool === 'pan' ? 'Drag to explore · Scroll or pinch to zoom' : 'Tap a tile to place · Choose Pan to explore'}</div>
    <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1 / 1.25)}>−</button><span>{Math.round(view.scale * 100)}%</span><button aria-label="Zoom in" onClick={() => zoom(1.25)}>+</button><button onClick={fit}>Fit</button></div>
  </div>;
}
