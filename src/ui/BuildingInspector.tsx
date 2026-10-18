import {BuildingAppearancePanel} from './BuildingAppearance';
import { useState } from 'react';
import type { Building } from '../model/document';
import { buildingWarnings, deleteBuilding, duplicateBuilding, updateBuilding, snapPosition } from '../model/buildings';
import { useStudio } from './store';
function NumericField({ label, value, disabled, onCommit }: { label: string; value: number; disabled: boolean; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  return <label>{label}<input aria-label={label} type="number" step="any" disabled={disabled} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { if (draft.trim() && Number.isFinite(Number(draft))) onCommit(Number(draft)); else setDraft(String(value)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/></label>;
}
export function BuildingInspector({ building: b }: { building: Building }) {
  const s = useStudio(), warnings = buildingWarnings(s.present, b);
  function update(patch: Parameters<typeof updateBuilding>[2]) { s.edit(d => updateBuilding(d, b.id, patch)); }
  return <section className="building-inspector"><div className="section-label">SELECTED BUILDING</div><label>Name<input aria-label="Building name" key={`${b.id}-${b.name}`} defaultValue={b.name} disabled={b.locked} maxLength={80} onBlur={e => update({ name: e.target.value.trim() || b.name })} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/></label><p className="field-note">{b.rotation}° · footprint in local building axes</p><div className="inspector-fields">{(['x','y','width','height'] as const).map(k => <NumericField key={`${b.id}-${k}-${b[k]}`} label={k === 'x' ? 'Position X' : k === 'y' ? 'Position Y' : k === 'width' ? 'Building width' : 'Building height'} value={b[k]} disabled={b.locked} onCommit={n => update({ [k]: k === 'x' || k === 'y' ? snapPosition(n, s.present.grid.snap) : n })}/>)}</div><div className="building-actions"><button disabled={b.locked} onClick={() => update({ rotation: b.rotation + 90 })}>Rotate 90°</button><button onClick={() => { const id = crypto.randomUUID(); s.edit(d => duplicateBuilding(d, b.id, id)); s.select(id); }}>Duplicate</button><button onClick={() => update({ locked: !b.locked })}>{b.locked ? 'Unlock' : 'Lock'}</button><button disabled={b.locked} onClick={() => { s.edit(d => deleteBuilding(d, b.id)); s.select(null); }}>Delete building</button></div>{b.locked && <p>Locked · unlock to edit or move.</p>}{warnings.map(w => <p role="alert" className="warning" key={w}>{w}</p>)}<button className="full-button" onClick={() => s.select(null)}>Clear selection</button><hr/><BuildingAppearancePanel building={b}/><hr/></section>;
}
