import { InfrastructureVisual } from './InfrastructureVisual';
import { TerrainVisual } from './TerrainVisual';
import { useVisualPreferences } from '../ui/visualPreferences';
import { terrainScene } from './scene';
import { reducedDetail, styleBackground, terrainCachePixels } from './styles';
import { BuildingVisual } from './BuildingVisual';
import { ExpansionActions } from '../ui/ExpansionPanel';
import { ExpansionOverlay } from './ExpansionOverlay';
import { ActionDock, ActionSlot } from '../ui/ActionDock';
import { DevelopmentActions } from '../ui/DevelopmentPanel';
import { DevelopmentOverlay } from './DevelopmentOverlay';
import { DistrictActions } from '../ui/DistrictPanel';
import { defaultDistrictView, insertBoundaryPoint, districtCells, districtMembership, DistrictStroke, districtTypes, key as districtKey, overlapCells, type District } from '../model/districts';
import { districtGeometry, visibleDistricts } from './districtGeometry';
import { TerrainActions } from '../ui/TerrainPanel';
import { previewTerrainColor } from './terrainGeometry';
import { TerrainStroke, commitTerrain, terrainProtection } from '../model/terrainStroke';
import { terrainQuery, terrainKey, type LandscapeCell } from '../model/terrain';
import { InfrastructureActions } from '../ui/InfrastructurePanel';
import { closestSegment, deleteSegment, isBridge, isDefense, putInfrastructure, snapConnection, distance } from '../model/infrastructure';
import type { Cell, Road } from '../model/document';
import { roadContext, roadGeometry } from './roadGeometry';
import { entrance } from '../generator/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Path, Circle, Text } from 'react-konva';
import type Konva from 'konva';
import { useStudio } from '../ui/store';
import { eraseCell, paintTerrain, placeBuilding } from '../model/operations';
import type { BuildingKind, TerrainKind } from '../model/document';
import { buildingWarnings, footprint, snapPosition, updateBuilding } from '../model/buildings';
const colors = { grass: '#536447', water: '#355d69', forest: '#294c3e', stone: '#737775' };
type View = { x: number; y: number; scale: number };
type Gesture = { start: { x: number; y: number }; view: View; id?: string; x?: number; y?: number; moved: boolean; roadId?:string; pointIndex?:number; trace?:Cell[]; districtPointIndex?:number };
export function SettlementCanvas() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [view, setView] = useState<View>({ x: 40, y: 40, scale: .45 });
  const [roadPreview,setRoadPreview]=useState<Road|null>(null);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const gesture = useRef<Gesture | null>(null), pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const suppress = useRef(false);
  const terrainStroke=useRef<TerrainStroke|null>(null),frame=useRef(0);
  const [terrainPatch,setTerrainPatch]=useState<LandscapeCell[]>([]),[brushPoint,setBrushPoint]=useState<Cell|null>(null);
  const districtStroke=useRef<DistrictStroke|null>(null);
  const [districtPatch,setDistrictPatch]=useState<Cell[]>([]),[districtCorner,setDistrictCorner]=useState<{index:number;point:Cell}|null>(null);
  const [elevationReadout,setElevationReadout]=useState(0);
  const { present: doc, tool, edit, selectedId, select, infrastructure:infra, setInfrastructure, terrainEditor:terrainEditor, setTerrainEditor, districtEditor:district, setDistrictEditor, development, expansion } = useStudio();
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(host.current!); return () => observer.disconnect(); }, []);
  useEffect(() => { setDistrictPatch([]);setDistrictCorner(null);districtStroke.current=null;setPreview(null); setRoadPreview(null); gesture.current = null; terrainStroke.current=null;setTerrainPatch([]);cancelAnimationFrame(frame.current);frame.current=0; }, [tool, doc]);
  useEffect(()=>{const cancel=()=>{districtStroke.current=null;setDistrictPatch([]);setDistrictCorner(null);terrainStroke.current=null;gesture.current=null;setTerrainPatch([]);cancelAnimationFrame(frame.current);frame.current=0;};const multiTouch=(e:TouchEvent)=>{if(e.touches.length>1){suppress.current=true;cancel();}};document.addEventListener('touchstart',multiTouch,{passive:true});window.addEventListener('hearthlands-cancel-stroke',cancel);return()=>{cancel();window.removeEventListener('hearthlands-cancel-stroke',cancel);document.removeEventListener('touchstart',multiTouch);};},[]);
  const expansionActive=!!expansion.preview||expansion.busy||expansion.applying;
  const developmentActive=!!development.preview||development.busy||development.applying||expansionActive;
  const visual=useVisualPreferences(),style=visual.style;
  const reduced=reducedDetail(style,doc.grid.cellSize*view.scale,visual.detail);
  const cell = doc.grid.cellSize, width = doc.grid.width * cell, height = doc.grid.height * cell;
  const gridLines=useMemo(()=>[...Array.from({length:doc.grid.width+1},(_,i)=>({id:`x${i}`,points:[i*cell,0,i*cell,height]})),...Array.from({length:doc.grid.height+1},(_,i)=>({id:`y${i}`,points:[0,i*cell,width,i*cell]}))],[doc.grid.width,doc.grid.height,cell,width,height]);
  useMemo(()=>tool==='terrain-editor'?terrainProtection(doc):null,[tool,doc]);
  const terrainPaths=useMemo(()=>terrainScene(doc,{...doc.landscape,style,reduced}),[doc.terrain,doc.landscape,doc.grid.width,doc.grid.height,doc.seed,doc.planning,style,reduced]);
  const roads = useMemo(() => { const context=roadContext(doc); return doc.roads.filter(r => doc.layers.find(l => l.id === r.layerId)?.visible).map(r => ({ road:r, id: r.id, ...roadGeometry(doc, r, context) })); }, [doc.roads, doc.layers, doc.seed, doc.terrain, doc.landscape, doc.buildings]);
  const districtView=doc.districtView??defaultDistrictView;
  const districtShapes=useMemo(()=>{const districts=district.detection??visibleDistricts(doc);return districts.map(d=>({district:d,...districtGeometry(doc,d)}));},[doc.districts,doc.districtView,doc.layers,doc.grid.width,doc.grid.height,district.detection]);
  const highlighted=useMemo(()=>new Set(district.highlight&&district.selectedId?districtMembership(doc).get(district.selectedId)?.map(b=>b.id):[]),[doc.buildings,doc.districts,district.highlight,district.selectedId]);
  const districtBoundary=district.draft.map((p,i)=>districtCorner?.index===i?districtCorner.point:p);
  const districtPendingGeometry=useMemo(()=>district.pending?districtGeometry(doc,district.pending):null,[district.pending,doc.grid.width,doc.grid.height]);
  const districtConflicts=useMemo(()=>district.pending?overlapCells(doc,district.pending):new Set<string>(),[district.pending,doc.districts]);
  const buildingWarningIds=useMemo(()=>new Set(doc.buildings.filter(b=>buildingWarnings(doc,b).length).map(b=>b.id)),[doc.buildings,doc.grid.width,doc.grid.height,doc.terrain,doc.landscape]);
  const selected = doc.buildings.find(b => b.id === selectedId);
  const warnings = selected ? buildingWarnings(doc, preview?.id === selected.id ? { ...selected, ...preview } : selected) : [];
  function zoom(factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) {
    setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * factor)); return { scale, x: anchor.x - (anchor.x - v.x) * scale / v.scale, y: anchor.y - (anchor.y - v.y) * scale / v.scale }; });
  }
  function fit() { const w=(expansion.preview?.document.grid.width??doc.grid.width)*cell,h=(expansion.preview?.document.grid.height??doc.grid.height)*cell;const scale = Math.min((size.width - 64) / w, (size.height - 64) / h); setView({ scale, x: (size.width - w * scale) / 2, y: (size.height - h * scale) / 2 }); }
  const selectedRoad=roadPreview??doc.roads.find(r=>r.id===infra.roadId);
  const infrastructureActive=tool==='infrastructure';
  const worldPoint=(p:{x:number;y:number},exclude?:string):Cell=>{
    const q={x:snapPosition((p.x-view.x)/view.scale/cell-.5,doc.grid.snap),y:snapPosition((p.y-view.y)/view.scale/cell-.5,doc.grid.snap)};
    const surface=infra.mode==='draw'?infra.surface:doc.roads.find(r=>r.id===infra.roadId)?.surface;
    return snapConnection(doc,q,exclude,surface==='gate');
  };
  const safeEdit=(fn:()=>void)=>{try{fn();setNotice('');}catch(e){setNotice(e instanceof Error?e.message:String(e));}};
  function finishInfrastructure(g:Gesture,p:{x:number;y:number}) {
    if(infra.mode==='draw'){
      const points=g.trace??[],end=worldPoint(p);
      if(!points.length||distance(points[points.length-1],end)>.05)points.push(end);
      const combined=[...infra.draft,...points].filter((p,n,a)=>n===0||distance(p,a[n-1])>.05);
      setInfrastructure({draft:isBridge({surface:infra.surface} as Road)&&combined.length>1?[combined[0],combined[combined.length-1]]:combined});setRoadPreview(null);return;
    }
    const r=doc.roads.find(r=>r.id===g.roadId);
    if(!r){setInfrastructure({roadId:null,point:null});return;}
    setInfrastructure({roadId:r.id,point:g.pointIndex??null});
    if(r.locked){setNotice('Infrastructure locked · unlock in the Roads panel.');setRoadPreview(null);return;}
    if(g.pointIndex!==undefined){if(g.moved&&roadPreview)safeEdit(()=>edit(d=>putInfrastructure(d,roadPreview)));setRoadPreview(null);return;}
    const hit=closestSegment(r,worldPoint(p,r.id));
    if(infra.mode==='add-point'&&!isBridge(r))safeEdit(()=>{edit(d=>putInfrastructure(d,{...r,editVersion:1,points:[...r.points.slice(0,hit.index+1),hit.point,...r.points.slice(hit.index+1)]}));setInfrastructure({point:hit.index+1});});
    if(infra.mode==='delete-segment')safeEdit(()=>edit(d=>deleteSegment(d,r.id,hit.index,crypto.randomUUID())));
  }
  const terrainPoint=(p:{x:number;y:number}):Cell=>({x:(p.x-view.x)/view.scale/cell,y:(p.y-view.y)/view.scale/cell});
  const shownPatch=terrainEditor.pending?.changes??terrainPatch;
  const patchPaths=useMemo(()=>{const groups=new Map<string,string[]>();for(const t of shownPatch){const color=terrainEditor.pending?.blocked.has(terrainKey(t))?'#ed7c66':t.elevation>terrainQuery(doc).at(t).elevation?'#c7b875':t.elevation<terrainQuery(doc).at(t).elevation?'#6a9aa9':previewTerrainColor(t);if(!groups.has(color))groups.set(color,[]);groups.get(color)!.push(`M${t.x} ${t.y}h1v1h-1Z`);}return [...groups].map(([color,data])=>({color,data:data.join('')}));},[shownPatch,terrainEditor.pending,doc]);
  const conflictIds=new Set(terrainEditor.pending?.conflicts.map(c=>`${c.type}:${c.id}`));
  const cancelTerrain=()=>{terrainStroke.current=null;setTerrainPatch([]);cancelAnimationFrame(frame.current);frame.current=0;};
  function finish() {
    const g = gesture.current; gesture.current = null;
    if (!g || suppress.current) { setPreview(null);setRoadPreview(null); return; }
    if(developmentActive)return;
    if(tool==='districts'){const p=stage.current!.getPointerPosition();if(!p)return;const q=terrainPoint(p);if(district.pending||district.detection)return;if(districtStroke.current){const stroke=districtStroke.current;districtStroke.current=null;setDistrictPatch([]);safeEdit(()=>{const old=doc.districts.find(d=>d.id===district.selectedId);if(old?.locked)throw new Error('Unlock this district before painting.');const d:District=old??{id:crypto.randomUUID(),name:`New ${districtTypes[district.type].name.split(' / ')[0]} district`,type:district.type,color:districtTypes[district.type].color,layerId:doc.layers[0].id,cells:[]};setDistrictEditor({pending:stroke.result(doc,d,district.mode==='erase')});});return;}if(g.districtPointIndex!==undefined){setDistrictEditor({...(districtCorner?{draft:districtBoundary}:{}),corner:g.districtPointIndex});setDistrictCorner(null);return;}if(district.mode==='polygon'||district.mode==='reshape'){if(!g.moved){const point={x:Math.max(0,Math.min(doc.grid.width,q.x)),y:Math.max(0,Math.min(doc.grid.height,q.y))};setDistrictEditor({corner:null,draft:district.mode==='reshape'&&doc.districts.find(d=>d.id===district.selectedId)?.boundary?insertBoundaryPoint(district.draft,point):[...district.draft,point]});}return;}if(district.mode==='select'){const hit=districtView.visible?doc.districts.find(d=>d.visible!==false&&doc.layers.some(l=>l.id===d.layerId&&l.visible)&&districtCells(d,doc).some(c=>districtKey(c)===districtKey(q))):undefined;setDistrictEditor({selectedId:hit?.id??null});}return;}
    if(tool==='terrain-editor'){const stroke=terrainStroke.current;cancelTerrain();if(stroke){const pending=stroke.preview();setTerrainEditor({readout:pending.conflicts.length?elevationReadout:stroke.patches.get(terrainKey(brushPoint??{x:-1,y:-1}))?.elevation??elevationReadout});if(pending.conflicts.length)setTerrainEditor({pending});else safeEdit(()=>edit(d=>commitTerrain(d,pending)));}return;}
    if(tool==='infrastructure'){const p=stage.current!.getPointerPosition();if(p)finishInfrastructure(g,p);return;}
    if (g.moved) { if (preview) edit(d => updateBuilding(d, preview.id, { x: preview.x, y: preview.y })); setPreview(null); return; }
    const p = stage.current!.getPointerPosition(); if (!p) return;
    if (tool === 'select') { select(g.id ?? null); return; }
    if (tool === 'pan') return;
    const target = { x: snapPosition((p.x - view.x) / view.scale / cell, doc.grid.snap), y: snapPosition((p.y - view.y) / view.scale / cell, doc.grid.snap) };
    if (tool === 'erase' || tool in colors) { const tile = { x: Math.floor((p.x - view.x) / view.scale / cell), y: Math.floor((p.y - view.y) / view.scale / cell) }; edit(d => tool === 'erase' ? eraseCell(d, tile) : paintTerrain(d, tile, tool as TerrainKind)); }
    else { const existing = doc.buildings.find(b => b.x === target.x && b.y === target.y); if (existing) { select(existing.id); setNotice('Building origin occupied · choose Select to edit or place nearby.'); return; } const id = crypto.randomUUID(); edit(d => placeBuilding(d, target, tool as BuildingKind, id)); select(id); }
  }
  return <div data-visual-style={style} data-detail={reduced?'reduced':'full'} className={`canvas-host ${tool === 'pan' ? 'panning' : ''}`} ref={host}>
    <div className="canvas-label"><span className="live-dot"/> WORLD VIEW <span> / </span> {doc.grid.width} × {doc.grid.height} TILES</div>
    <Stage ref={stage} {...size} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
      onWheel={e => { e.evt.preventDefault(); zoom(e.evt.deltaY < 0 ? 1.12 : 1 / 1.12, stage.current!.getPointerPosition()!); }}
      onPointerDown={e => {
        if (!e.evt.isPrimary || e.evt.button > 0) return;
        suppress.current = false; setNotice('');
        if(developmentActive){if(development.applying||expansion.applying)return;const p=stage.current!.getPointerPosition()!;gesture.current={start:p,view,moved:false};(e.evt.target as Element).setPointerCapture?.(e.evt.pointerId);return;}
        if(tool==='districts'){if(district.pending||district.detection)return;if((district.mode==='paint'||district.mode==='erase')&&!doc.districts.find(d=>d.id===district.selectedId)?.locked){districtStroke.current=new DistrictStroke(district.size);districtStroke.current.add(terrainPoint(stage.current!.getPointerPosition()!));setDistrictPatch([...districtStroke.current.cells.values()]);}}
        if(tool==='terrain-editor'){if(terrainEditor.pending)return;const p=terrainPoint(stage.current!.getPointerPosition()!);setBrushPoint(p);const sampled=terrainQuery(doc).at(p).elevation;setElevationReadout(sampled);setTerrainEditor({readout:sampled});terrainStroke.current=new TerrainStroke(doc,{...terrainEditor.settings});terrainStroke.current.add(p);setTerrainPatch([...terrainStroke.current.patches.values()]);}
        (e.evt.target as Element).setPointerCapture?.(e.evt.pointerId);
        const id = e.target.findAncestor('.building', true)?.getAttr('buildingId') as string | undefined;
        const b = doc.buildings.find(b => b.id === id);
        const roadId=(e.target as Konva.Node).getAttr('roadId') as string|undefined,pointIndex=(e.target as Konva.Node).getAttr('pointIndex') as number|undefined;
        gesture.current = { start: stage.current!.getPointerPosition()!, view, id, x: b?.x, y: b?.y, moved: false,roadId,pointIndex,districtPointIndex:(e.target as Konva.Node).getAttr('districtPointIndex') as number|undefined,trace:tool==='infrastructure'&&infra.mode==='draw'?[worldPoint(stage.current!.getPointerPosition()!)]:undefined };
      }}
      onPointerMove={() => { const g = gesture.current, p = stage.current!.getPointerPosition();
        if(developmentActive){if(g&&p&&!suppress.current&&!development.applying&&!expansion.applying){g.moved=true;setView({...g.view,x:g.view.x+p.x-g.start.x,y:g.view.y+p.y-g.start.y});}return;}
        if(p&&tool==='terrain-editor'&&!suppress.current){const q=terrainPoint(p);setBrushPoint(q);setElevationReadout(terrainQuery(doc).at(q).elevation);if(terrainStroke.current){terrainStroke.current.add(q);if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;if(terrainStroke.current)setTerrainPatch([...terrainStroke.current.patches.values()]);});}return;}
        if (!g || !p || suppress.current) return;
        const dx = p.x - g.start.x, dy = p.y - g.start.y;
        if (Math.hypot(dx, dy) < 6 && !g.moved) return; g.moved = true;
        if(tool==='districts'){const q=terrainPoint(p);if(districtStroke.current){districtStroke.current.add(q);if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;if(districtStroke.current)setDistrictPatch([...districtStroke.current.cells.values()]);});}else if(g.districtPointIndex!==undefined)setDistrictCorner({index:g.districtPointIndex,point:{x:Math.max(0,Math.min(doc.grid.width,q.x)),y:Math.max(0,Math.min(doc.grid.height,q.y))}});return;}
        if(tool==='infrastructure'){
          if(infra.mode==='draw'){const q=worldPoint(p);if(g.trace&&distance(q,g.trace[g.trace.length-1])>.65){g.trace.push(q);setRoadPreview({id:'trace',layerId:doc.layers[0].id,points:[...infra.draft,...g.trace],surface:infra.surface,width:infra.width,style:infra.smooth?'organic':'planned',editVersion:1});}}
          else if(g.pointIndex!==undefined){const r=doc.roads.find(r=>r.id===g.roadId);if(r&&!r.locked){const q=worldPoint(p,r.id);setRoadPreview({...r,editVersion:1,points:r.points.map((point,n)=>n===g.pointIndex?q:point)});}}
          return;
        }
        if (tool === 'pan') setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
        if (tool === 'select' && g.id) select(g.id);
        if (tool === 'select' && g.id && !doc.buildings.find(b => b.id === g.id)?.locked) setPreview({ id: g.id, x: snapPosition(g.x! + dx / g.view.scale / cell, doc.grid.snap), y: snapPosition(g.y! + dy / g.view.scale / cell, doc.grid.snap) });
      }} onPointerUp={finish} onPointerCancel={() => { gesture.current = null; districtStroke.current=null;setDistrictPatch([]);setDistrictCorner(null);cancelTerrain(); setPreview(null); setRoadPreview(null); }}
      onTouchStart={e => { if (e.evt.touches.length === 2) { suppress.current = true; gesture.current = null; districtStroke.current=null;setDistrictPatch([]);setDistrictCorner(null);cancelTerrain(); setPreview(null); setRoadPreview(null); pinch.current = null; } }}
      onTouchMove={e => { const t = e.evt.touches; if (t.length !== 2) return; e.evt.preventDefault(); const rect = host.current!.getBoundingClientRect(); const point = { x: (t[0].clientX + t[1].clientX) / 2 - rect.left, y: (t[0].clientY + t[1].clientY) / 2 - rect.top }; const distance = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); if (pinch.current) { const old = pinch.current; setView(v => { const scale = Math.max(.12, Math.min(3, v.scale * distance / old.distance)); return { scale, x: point.x - (old.x - v.x) * scale / v.scale, y: point.y - (old.y - v.y) * scale / v.scale }; }); } pinch.current = { ...point, distance }; }}
      onTouchEnd={() => { pinch.current = null; }}>
      <Layer name="world-presentation"><Rect width={width} height={height} fill={styleBackground(style)} stroke="#728062" strokeWidth={2}/>
        <TerrainVisual paths={terrainPaths} cell={cell} width={doc.grid.width} height={doc.grid.height} cachePixels={terrainCachePixels(cell*view.scale)}/>
        {doc.grid.visible&&<Group name="grid" listening={false}>{gridLines.map(l=><Line key={l.id} points={l.points} stroke="#a5b78e" opacity={.13} strokeWidth={1}/>)}</Group>}
        <Group name="districts" listening={false} scaleX={cell} scaleY={cell}>{districtShapes.map(g=><Group key={g.district.id}><Path data={g.fill} fill={/^#[0-9a-f]{6}$/i.test(g.district.color)?g.district.color:'#8eaaa1'} opacity={districtView.opacity}/><Path data={g.boundary} stroke={g.district.id===district.selectedId?'#fff0b5':g.district.color} strokeWidth={(g.district.id===district.selectedId?2.5:1.3)/view.scale/cell} dash={g.district.locked?[.3,.2]:undefined}/>{districtView.names&&<Text x={g.label.x-4} y={g.label.y-.5} width={8} align="center" fontSize={.7} text={`${g.district.locked?'◆ ':''}${g.district.name}`} fill="#fff2c9" stroke="#26372b" strokeWidth={.05} fillAfterStrokeEnabled/>}</Group>)}</Group>
        {(['roads','infrastructure'] as const).map(layer=><Group name={layer} key={layer}>{roads.filter(r=>(isDefense(r.road)||isBridge(r.road)?'infrastructure':'roads')===layer).map(r => <InfrastructureVisual key={r.id} road={r.road} geometry={r} style={style} reduced={reduced} cell={cell} hitWidth={24/view.scale/cell} interactive={infrastructureActive&&infra.mode!=='draw'} conflict={conflictIds.has(`infrastructure:${r.id}`)} active={infra.roadId===r.id}/>)}</Group>)}
        {doc.buildings.filter(b => doc.layers.find(l => l.id === b.layerId)?.visible).map(original => {
          const b = preview?.id === original.id ? { ...original, ...preview } : original;
          const f = footprint(b);
          const warn = b===original?buildingWarningIds.has(b.id):buildingWarnings(doc,b).length>0, active = selectedId === b.id;
          return <Group key={b.id} name="building" buildingId={b.id} x={b.x * cell} y={b.y * cell}>
            <BuildingVisual building={b} seed={doc.seed} architecture={doc.architecture} style={style} reduced={reduced} cell={cell}/>
            <Rect name="building-footprint-hit" hitStrokeWidth={0} width={f.width*cell} height={f.height*cell} fill="rgba(0,0,0,0.001)" stroke={conflictIds.has(`building:${b.id}`)?'#ff7059':warn?'#ef927b':active?'#ffe2a0':highlighted.has(b.id)?'#9ee5d5':undefined} strokeWidth={active||highlighted.has(b.id)?4:2}/>

          </Group>;
        })}
        <Group name="labels" listening={false}><Group name="decorations"/>{visual.labels&&doc.buildings.filter(b=>doc.layers.some(l=>l.id===b.layerId&&l.visible)).map(b=>{const f=footprint(b);return <Text key={b.id} x={(b.x+f.width/2-4)*cell} y={(b.y+f.height+.2)*cell} width={8*cell} align="center" fontSize={cell*.65} text={b.name} fill="#f6ead0" stroke="#152019" strokeWidth={cell*.08} fillAfterStrokeEnabled/>;})}</Group>
        {!developmentActive&&(infrastructureActive||infra.preview)&&<Group>
          {[infra.preview,roadPreview,infra.draft.length?{id:'draft',layerId:doc.layers[0].id,points:infra.draft,surface:infra.surface,width:infra.width,style:infra.smooth?'organic':'planned',editVersion:1} as Road:null].filter((r):r is Road=>!!r).map(r=>{const g=roadGeometry(doc,r);return <Path key={r.id} listening={false} data={g.data} scaleX={cell} scaleY={cell} stroke="#ffe2a0" strokeWidth={g.width} opacity={.8} dash={[.3,.2]}/>;})}
          {infrastructureActive&&infra.mode==='select'&&selectedRoad?.points.map((p,n,points)=>{
            // Dense generated navigation paths keep all points; show spaced handles at low zoom.
            const stride=Math.max(1,Math.ceil(32/(cell*view.scale)));
            if(n!==0&&n!==points.length-1&&n!==infra.point&&n%stride!==0)return null;
            return <Circle key={n} roadId={selectedRoad.id} pointIndex={n} x={(p.x+.5)*cell} y={(p.y+.5)*cell} radius={(n===infra.point?9:6)/view.scale} hitStrokeWidth={32/view.scale} fill={selectedRoad.locked?'#84948c':n===infra.point?'#ffe2a0':'#e2ede0'} stroke="#26382b" strokeWidth={2/view.scale}/>;
          })}
        </Group>}
      </Layer>
      <Layer name="district-interactions" listening={tool==='districts'}>
        <Group scaleX={cell} scaleY={cell}>
          {districtPendingGeometry&&<Group listening={false}><Path data={districtPendingGeometry.fill} fill={district.pending!.color} opacity={.28}/><Path data={districtPendingGeometry.boundary} stroke="#fff0b5" strokeWidth={2/view.scale/cell}/>{[...districtConflicts].map(k=>{const [x,y]=k.split(',').map(Number);return <Rect key={k} x={x} y={y} width={1} height={1} fill="#f26d5b" opacity={.6}/>;})}</Group>}
          {!!districtPatch.length&&<Path listening={false} data={districtPatch.map(p=>`M${p.x} ${p.y}h1v1h-1Z`).join('')} fill={district.mode==='erase'?'#f28c79':'#ecd695'} opacity={.5}/>}
          {!!districtBoundary.length&&(tool==='districts'||district.camera)&&<Group><Line listening={false} points={districtBoundary.flatMap(p=>[p.x,p.y])} closed={districtBoundary.length>=3} stroke="#ffe2a0" fill="#c3b16a" opacity={.6} strokeWidth={2/view.scale/cell}/>{districtBoundary.map((p,i)=><Circle key={i} districtPointIndex={i} x={p.x} y={p.y} radius={7/view.scale/cell} hitStrokeWidth={30/view.scale/cell} fill={district.corner===i?'#a7ead5':'#ffe2a0'} stroke="#253a2d" strokeWidth={2/view.scale/cell}/>)}</Group>}
        </Group>
      </Layer>
      <Layer name="proposal-interactions" listening={false}><DevelopmentOverlay doc={doc} proposal={development.preview} style={style} reduced={reduced}/><ExpansionOverlay doc={doc} proposal={expansion.preview} style={style} reduced={reduced} cachePixels={terrainCachePixels(cell*view.scale)}/></Layer>
      <Layer listening={false}>
        <Group listening={false} scaleX={cell} scaleY={cell}>{patchPaths.map(p=><Path key={p.color} data={p.data} fill={p.color} opacity={.58}/>)}
          {tool==='terrain-editor'&&brushPoint&&(terrainEditor.settings.shape==='circle'?<Circle x={brushPoint.x} y={brushPoint.y} radius={terrainEditor.settings.size/2} stroke="#ffe2a0" strokeWidth={1.5/view.scale/cell}/>:<Rect x={brushPoint.x-terrainEditor.settings.size/2} y={brushPoint.y-terrainEditor.settings.size/2} width={terrainEditor.settings.size} height={terrainEditor.settings.size} stroke="#ffe2a0" strokeWidth={1.5/view.scale/cell}/>)}
        </Group>
      </Layer>
    </Stage>
    <ActionSlot place="map"/><ActionDock><ExpansionActions/><DevelopmentActions/>
    {!developmentActive&&(tool==='districts'||district.pending||district.detection||tool==='pan'&&district.camera)&&<DistrictActions/>}

    {!developmentActive&&(infrastructureActive||(infra.camera||infra.roadId||infra.draft.length>0)&&tool==='pan')&&<InfrastructureActions/>}
    {!developmentActive&&(tool==='terrain-editor'||terrainEditor.pending||tool==='pan'&&terrainEditor.camera)&&<TerrainActions painting={terrainPatch.length>0}/>}</ActionDock>
    {(warnings.length > 0 || notice) && <div role="alert" className="canvas-warning">{notice || warnings.join(' · ')}</div>}
    <div className="canvas-hint">{tool==='districts'?'District editing · one finger edits · two fingers explore':null}{tool==='terrain-editor'?`One finger paints · Two fingers explore · ${elevationReadout.toFixed(1)} m`:null}{tool==='infrastructure'?'Tap or trace · Finish path · Two fingers pan/zoom · Roads panel to edit':null}{tool==='districts'||tool==='infrastructure'||tool==='terrain-editor'?null:tool === 'pan' ? 'Drag to explore · Scroll or pinch to zoom' : tool === 'select' ? 'Tap to select · Drag to move · Properties to edit' : 'Tap to place · Select to edit · Pan to explore'}</div>
    <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1 / 1.25)}>−</button><span>{Math.round(view.scale * 100)}%</span><button aria-label="Zoom in" onClick={() => zoom(1.25)}>+</button><button onClick={fit}>Fit</button></div>
  </div>;
}
