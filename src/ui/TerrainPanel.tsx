import { useEffect, useState } from 'react';
import { useStudio, type TerrainEditorState } from './store';
import { commitTerrain, type TerrainBrush } from '../model/terrainStroke';
export const terrainBrushes:Record<TerrainEditorState['tab'],{id:TerrainBrush;name:string}[]>={
  Sculpt:[{id:'sample',name:'Sample elevation'},{id:'raise',name:'Raise terrain'},{id:'lower',name:'Lower terrain'},{id:'flatten',name:'Flatten terrain'},{id:'smooth',name:'Smooth terrain'},{id:'ridge',name:'Elevated ridge'},{id:'valley',name:'Lowered valley'}],
  Water:[{id:'water',name:'Draw water'},{id:'land',name:'Reclaim land'}],
  Ground:[{id:'grass',name:'Grass'},{id:'dirt',name:'Dirt'},{id:'sand',name:'Sand'},{id:'rock',name:'Rocky ground'},{id:'soil',name:'Cultivated soil'}],
  Nature:[{id:'forest',name:'Paint forest'},{id:'clear-forest',name:'Clear woodland'},{id:'boulders',name:'Rocky details'},{id:'clear-rocks',name:'Remove rocks'}],
};
export const brushName=(id:TerrainBrush)=>Object.values(terrainBrushes).flat().find(b=>b.id===id)?.name??(id==='restore'?'Restore original terrain':'Reset to meadow');
export function TerrainActions({painting=false}:{painting?:boolean}){
  const s=useStudio(),t=s.terrainEditor,[error,setError]=useState(''),p=t.pending;
  return <div className="terrain-actions" aria-label="Terrain stroke actions"><strong>{s.tool==='pan'?'Terrain camera':brushName(t.settings.brush)} · {t.readout.toFixed(1)} m</strong>
    {p?<><span>Unsaved preview · {p.changes.length} changed cells · {p.blocked.size} protected</span><button className="primary" disabled={p.changes.length===p.blocked.size} onClick={()=>{try{s.edit(d=>commitTerrain(d,p,true));s.setTerrainEditor({pending:null});setError('');}catch(e){setError(String(e));}}}>Apply unaffected cells</button><button onClick={()=>{s.setTerrainEditor({pending:null});setError('');}}>Cancel terrain preview</button><details><summary role="alert">Review {p.conflicts.length} affected structures</summary><ul>{p.conflicts.map(c=><li key={`${c.type}:${c.id}`}>{c.locked?'Locked ':''}{c.name} · {c.cells} cells protected</li>)}</ul></details></>:<button disabled={!painting} onClick={()=>window.dispatchEvent(new Event('hearthlands-cancel-stroke'))}>Cancel stroke</button>}
    <button onClick={()=>{const camera=s.tool!=='pan';s.setTool(camera?'pan':'terrain-editor');s.setTerrainEditor({camera});}}>{s.tool==='pan'?'Resume terrain':'Pan terrain camera'}</button>{error&&<p role="alert">{error}</p>}
  </div>;
}
export function TerrainPanel({onPaint}:{onPaint:()=>void}){
  const s=useStudio(),t=s.terrainEditor,b=t.settings;
  const [elevationText,setElevationText]=useState(String(b.elevation));
  useEffect(()=>setElevationText(String(b.elevation)),[b.elevation]);
  const parsedElevation=()=>elevationText.trim()!==''&&Number.isFinite(Number(elevationText))&&Number(elevationText)>=-16&&Number(elevationText)<=32?Number(elevationText):b.elevation;
  const choose=(id:TerrainBrush)=>{s.setTool('terrain-editor');s.setTerrainEditor({settings:{...b,elevation:parsedElevation(),brush:id}});onPaint();};
  return <div className="terrain-panel"><h3>Terrain & landscape</h3><div className="terrain-tabs" role="tablist" aria-label="Terrain categories">{(Object.keys(terrainBrushes) as TerrainEditorState['tab'][]).map(tab=><button role="tab" aria-selected={t.tab===tab} key={tab} onClick={()=>s.setTerrainEditor({tab})}>{tab}</button>)}</div>
    <p className="field-note">Active: <strong>{brushName(b.brush)}</strong>. One finger paints, two fingers pan/zoom without painting. Release to apply one stroke; conflicting changes require review.</p>
    <label>Brush size · {b.size} tiles<input aria-label="Terrain brush size" type="range" min={1} max={31} step={1} value={b.size} onChange={e=>s.setTerrainEditor({settings:{...b,size:Number(e.target.value)}})}/></label>
    <label>Brush strength · {Math.round(b.strength*100)}%<input aria-label="Terrain brush strength" type="range" disabled={['grass','dirt','sand','rock','soil','restore','reset','sample'].includes(b.brush)} min={.05} max={1} step={.05} value={b.strength} onChange={e=>s.setTerrainEditor({settings:{...b,strength:Number(e.target.value)}})}/></label>
    <p className="field-note">Strength affects height and coverage; ground materials and restore/reset use full coverage.</p><label>Brush shape<select value={b.shape} onChange={e=>s.setTerrainEditor({settings:{...b,shape:e.target.value as 'circle'|'square'}})}><option value="circle">Circular · soft edges</option><option value="square">Square · uniform</option></select></label>
    {t.tab==='Sculpt'&&<><label>Flatten elevation (metres)<input type="number" min={-16} max={32} step={.5} value={elevationText} onChange={e=>setElevationText(e.target.value)} onBlur={()=>{const value=parsedElevation();setElevationText(String(value));s.setTerrainEditor({settings:{...b,elevation:value}});}}/></label><button className="full-button" onClick={()=>s.setTerrainEditor({settings:{...b,elevation:t.readout}})}>Use sampled elevation · {t.readout.toFixed(1)} m</button></>}
    <div className="terrain-brushes">{terrainBrushes[t.tab].map(brush=><button key={brush.id} aria-pressed={s.tool==='terrain-editor'&&b.brush===brush.id} className={b.brush===brush.id?'active':''} onClick={()=>choose(brush.id)}>{brush.name}</button>)}</div>
    <p className="field-note">Elevation −16…32 m; one raise/lower stroke adds up to 4 × strength metres (ridges/valleys: 8). Cliffs exceed 2 m per tile. Buildings need ≤1 m slopes and footprint variation. Square + 100% flattens a whole pad exactly.</p>
    <details><summary>Erase / restore terrain only</summary><button onClick={()=>choose('restore')}>Restore original terrain</button><button onClick={()=>choose('reset')}>Reset to meadow</button><p className="field-note">Restore removes landscape edits back to the original generated/legacy tile. Reset clears all landscape layers to level, dry grass. Neither deletes objects; protection review still applies.</p></details>
    <h4>Map appearance</h4><label className="checkbox-label"><input type="checkbox" disabled={!!t.pending} checked={s.present.landscape.contours} onChange={e=>s.edit(d=>({...d,landscape:{...d.landscape,contours:e.target.checked}}))}/> Elevation contours</label><label className="checkbox-label"><input type="checkbox" disabled={!!t.pending} checked={s.present.landscape.detail} onChange={e=>s.edit(d=>({...d,landscape:{...d.landscape,detail:e.target.checked}}))}/> Terrain detail (off: clean planning)</label><label className="checkbox-label"><input type="checkbox" checked={s.present.grid.visible} disabled={!!t.pending} onChange={e=>s.edit(d=>({...d,grid:{...d.grid,visible:e.target.checked}}))}/> Terrain grid</label>
    <button className="full-button" onClick={()=>{s.setTool('pan');s.setTerrainEditor({camera:true});onPaint();}}>Pan without painting</button>
  </div>;
}
