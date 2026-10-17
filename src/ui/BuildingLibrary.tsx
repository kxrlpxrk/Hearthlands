import { useState } from 'react';
import { catalogue } from '../model/catalogue';
import { symbolPaths } from '../rendering/symbols';
import { useStudio } from './store';
export function BuildingLibrary({ onChoose }: { onChoose: () => void }) {
  const [query, setQuery] = useState('');
  const tool = useStudio(s => s.tool), setTool = useStudio(s => s.setTool);
  const matches = catalogue.filter(b => `${b.name} ${b.group}`.toLowerCase().includes(query.toLowerCase()));
  return <><label className="search-label">Search buildings<input type="search" placeholder="Find a building…" value={query} onChange={e => setQuery(e.target.value)}/></label>
    {[...new Set(matches.map(b => b.group))].map(group => <section key={group}><h3 className="section-label">{group}</h3><div className="asset-list">{matches.filter(b => b.group === group).map(b => <button aria-label={`Place ${b.name}`} key={b.kind} className={`asset ${tool === b.kind ? 'chosen' : ''}`} onClick={() => { setTool(b.kind); onChoose(); }}><svg className="building-symbol" viewBox="0 0 64 64" aria-hidden="true"><path d={symbolPaths[b.symbol]}/></svg><span><strong>{b.name}</strong><small>{b.width} × {b.height} tiles</small></span></button>)}</div></section>)}{!matches.length && <p>No buildings found.</p>}</>;
}
