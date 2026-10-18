import { useMemo, useState } from 'react';
import { useStudio } from './store';
import { connectionProposal, entranceConnected, deleteInfrastructure, infrastructureWarnings, isBridge, putInfrastructure, surfaces } from '../model/infrastructure';
import type { Surface } from '../model/infrastructure';
import type { Road } from '../model/document';
export function draftRoad():Road {
  const {present,infrastructure:i}=useStudio.getState();
  return {id:crypto.randomUUID(),layerId:present.layers[0].id,points:i.draft,editVersion:1,surface:i.surface,width:i.width,style:i.smooth?'organic':'planned',name:surfaces[i.surface],locked:false};
}
export function InfrastructureActions(){
  const s=useStudio(),i=s.infrastructure,[error,setError]=useState('');
  const selected=s.present.roads.find(r=>r.id===i.roadId);
  const run=(action:()=>void)=>{try{action();setError('');}catch(e){setError(String(e instanceof Error?e.message:e));}};
  return <div className="infrastructure-actions">
    <strong>{s.tool==='pan'?'Camera':`Infrastructure · ${i.mode.replace('-',' ')}`}</strong>
    {i.draft.length>0&&<><span>{i.draft.length} points</span><button onClick={()=>run(()=>{s.edit(d=>putInfrastructure(d,draftRoad()));s.setInfrastructure({draft:[]});})}>Finish path</button><button onClick={()=>s.setInfrastructure({draft:i.draft.slice(0,-1)})}>Back a point</button><button className="action-cancel" onClick={()=>s.setInfrastructure({draft:[]})}>Cancel path</button></>}
    {selected&&i.point!==null&&<><span>Point {i.point+1}</span><button disabled={selected.locked||selected.points.length<=2||isBridge(selected)} onClick={()=>run(()=>{s.edit(d=>putInfrastructure(d,{...selected,editVersion:1,points:selected.points.filter((_,n)=>n!==i.point)}));s.setInfrastructure({point:null});})}>Delete point</button></>}
    <button onClick={()=>{const camera=s.tool!=='pan';s.setTool(camera?'pan':'infrastructure');s.setInfrastructure({camera});}}>{s.tool==='pan'?'Resume infrastructure':'Pan camera'}</button>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
export function InfrastructurePanel({onDraw}:{onDraw:()=>void}){
  const s=useStudio(),i=s.infrastructure,[error,setError]=useState(''),r=s.present.roads.find(r=>r.id===i.roadId);
  const run=(action:()=>void)=>{try{action();setError('');}catch(e){setError(e instanceof Error?e.message:String(e));}};
  const update=(patch:Partial<Road>)=>{if(r)run(()=>s.edit(d=>putInfrastructure(d,{...r,editVersion:1,...patch})));};
  return <div className="infrastructure-panel">
    <h3>Roads & infrastructure</h3>
    <p className="field-note">Tap corners or drag to trace a path, then Finish path. Two fingers pan/zoom. Use Pan camera for one-finger exploration.</p>
    <label>Structure or road type<select value={i.surface} onChange={e=>s.setInfrastructure({surface:e.target.value as Surface})}>{Object.entries(surfaces).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <label>New path width (tiles)<input type="number" min={.15} max={3} step={.05} value={i.width} onChange={e=>s.setInfrastructure({width:Number(e.target.value)})}/></label>
    <label><input type="checkbox" checked={i.smooth} onChange={e=>s.setInfrastructure({smooth:e.target.checked})}/> Smooth curves (bridges stay straight)</label>
    <div className="infrastructure-modes">{(['draw','select','add-point','delete-segment'] as const).map(mode=><button key={mode} aria-pressed={s.tool==='infrastructure'&&i.mode===mode} className={s.tool==='infrastructure'&&i.mode===mode?'active':''} onClick={()=>{s.setTool('infrastructure');s.setInfrastructure({mode});onDraw();}}>{({'draw':'Draw on map','select':'Select / reshape','add-point':'Add control point','delete-segment':'Delete segment'})[mode]}</button>)}</div>
    <p className="field-note">Draw bridges with two taps on opposite banks. Roads snap within 0.8 tile to existing paths. Gates snap to nearby wall or fence sections. Delete segment cuts only the tapped span.</p>
    {r&&<section><h3>Selected infrastructure</h3><label>Name<input value={r.name??surfaces[r.surface??'dirt']} onChange={e=>update({name:e.target.value})} disabled={r.locked}/></label><label>Material<select disabled={r.locked} value={r.surface??'dirt'} onChange={e=>update({surface:e.target.value as Surface})}>{Object.entries(surfaces).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Width (tiles)<input type="number" min={.15} max={3} step={.05} value={r.width??(r.kind==='primary'?.42:r.kind==='secondary'?.3:r.kind==='access'?.2:.55)} disabled={r.locked} onChange={e=>update({width:Number(e.target.value)})}/></label><label><input type="checkbox" checked={r.style!=='planned'} disabled={r.locked||isBridge(r)} onChange={e=>update({style:e.target.checked?'organic':'planned'})}/> Smooth selected path</label>
      <button aria-pressed={!!r.locked} onClick={()=>s.edit(d=>({...d,roads:d.roads.map(v=>v.id===r.id?{...v,locked:!v.locked}:v)}))}>{r.locked?'Unlock infrastructure':'Lock infrastructure'}</button>
      <button disabled={r.locked} onClick={()=>{s.edit(d=>deleteInfrastructure(d,r.id));s.setInfrastructure({roadId:null,point:null});}}>Delete selected path</button>
      {i.point!==null&&r.points[i.point]&&<><h4>Control point {i.point+1}</h4>{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()}<input type="number" step={.25} value={r.points[i.point!][axis]} disabled={r.locked} onChange={e=>update({points:r.points.map((p,n)=>n===i.point?{...p,[axis]:Number(e.target.value)}:p)})}/></label>)}<p className="field-note">Drag the highlighted handles on the map to reshape. Use Delete point in the map toolbar to remove one.</p></>}
      {infrastructureWarnings(s.present,r).map(w=><p role="alert" key={w}>{w}</p>)}
    </section>}
    {error&&<p role="alert">{error}</p>}
    <details><summary>Choose an existing path ({s.present.roads.length})</summary>{s.present.roads.map(r=><button className="full-button" key={r.id} onClick={()=>{s.setTool('infrastructure');s.setInfrastructure({roadId:r.id,point:null,mode:'select'});}}>{r.locked?'▣ ':''}{r.name??`${surfaces[r.surface??'dirt']} · ${r.id.slice(-8)}`}</button>)}</details>
  </div>;
}
export function ConnectionAssistance(){
  const s=useStudio(),[error,setError]=useState('');
  const connected=useMemo(()=>!s.selectedId||entranceConnected(s.present,s.selectedId),[s.present,s.selectedId]);
  const proposal=useMemo(()=>s.selectedId&&!connected?connectionProposal(s.present,s.selectedId):null,[s.present,s.selectedId,connected]);
  if(!s.selectedId||connected&&!s.infrastructure.preview)return null;
  return <section><h3>Optional road connection</h3><p className="field-note">This entrance may need a new access path. Preview a spur while preserving every existing path and lock.</p>{proposal?<button onClick={()=>s.setInfrastructure({preview:proposal})}>Preview connection</button>:<p role="status">No safe access spur found. Use Roads to draw a connection or bridge.</p>}{s.infrastructure.preview&&<><button onClick={()=>{try{s.edit(d=>putInfrastructure(d,{...s.infrastructure.preview!,id:crypto.randomUUID()}));s.setInfrastructure({preview:null});setError('');}catch(e){setError(String(e));}}}>Approve connection</button><button onClick={()=>s.setInfrastructure({preview:null})}>Dismiss preview</button></>}{error&&<p role="alert">{error}</p>}</section>;
}
