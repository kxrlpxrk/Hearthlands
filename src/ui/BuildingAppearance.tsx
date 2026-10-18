import {bundledImageSource} from '../assets/buildings/images';
import {useBundledImage} from '../rendering/bundledImages';
import {vectorArtwork} from '../rendering/buildingArtwork';
import {useEffect,useState} from 'react';
import type {Building} from '../model/document';
import type {BuildingAsset,ArchitectureTheme} from '../assets/buildings/types';
import {architectureThemes} from '../assets/buildings/types';
import {assetsForKind,assetById} from '../assets/buildings/registry';
import {architectureTheme,resolveBuildingAsset,setBuildingAppearance,setArchitectureTheme} from '../model/appearance';
import {assetTransform,artworkPaths} from '../rendering/buildingArtwork';
import {useStudio} from './store';
import {useVisualPreferences} from './visualPreferences';
export function AssetThumbnail({asset}:{asset:BuildingAsset}){
 const [w,h]=asset.footprint.nominal,t=assetTransform({width:w,height:h},asset),image=useBundledImage(asset),[x,y,width,height]=vectorArtwork(asset).viewBox,source=asset.artwork.format==='bundled-image'?bundledImageSource(asset.artwork.source):undefined;
 return <svg style={{background:asset.thumbnail.background}} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${asset.name} · ${architectureThemes[asset.theme]}`}><g transform={`translate(${t.x} ${t.y}) scale(${t.scaleX} ${t.scaleY})`}>{source&&image?<image href={source} x={x} y={y} width={width} height={height} preserveAspectRatio="none"/>:artworkPaths(asset).map((p,i)=><path key={i} d={p.data} fill={p.fill} stroke={p.stroke} strokeWidth={p.width??1} strokeLinejoin="round" strokeLinecap="round"/>)}</g></svg>;
}
export function BuildingAppearancePanel({building:b}:{building:Building}){
 const s=useStudio(),visual=useVisualPreferences(),current=resolveBuildingAsset(s.present,b),manual=b.appearance?.mode==='manual',unavailable=manual&&!assetById.has(b.appearance!.mode==='manual'?b.appearance!.assetId:''),[chosen,setChosen]=useState(current.id),[filter,setFilter]=useState<ArchitectureTheme|'all'>('all');
 useEffect(()=>setChosen(current.id),[b.id,current.id,b.appearance]);
 const busy=s.development.busy||s.development.applying||!!s.development.preview||s.expansion.busy||s.expansion.applying||!!s.expansion.preview;
 return <section className="appearance-panel" aria-label="Building appearance"><h3>Appearance</h3><p aria-live="polite"><strong>Current: {current.name}</strong><br/>{manual?'Manually selected':'Automatic'} · {architectureThemes[current.theme]}{b.locked?' · Locked':''}</p>{unavailable&&<p className="warning" role="status">Saved artwork is unavailable. An automatic fallback is shown; its original asset ID is retained in JSON.</p>}{visual.style==='planning'&&<p className="field-note">Planning keeps its clean symbol. Switch to Illustrated to see this artwork on the map.</p>}
 <label>Filter architecture<select aria-label="Filter architecture" value={filter} onChange={e=>setFilter(e.target.value as ArchitectureTheme|'all')}><option value="all">All architecture themes</option>{Object.entries(architectureThemes).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
 <div className="appearance-grid" role="group" aria-label="Compatible building artwork">{assetsForKind(b.kind).filter(a=>filter==='all'||a.theme===filter).map(a=><button key={a.id} data-asset-id={a.id} className={`appearance-card ${chosen===a.id?'selected':''}`} aria-pressed={chosen===a.id} aria-label={`Choose ${a.name} · ${architectureThemes[a.theme]}`} disabled={b.locked||busy} onClick={()=>setChosen(a.id)}><AssetThumbnail asset={a}/><strong>{a.name}</strong><small>{architectureThemes[a.theme]} · {a.variation}</small></button>)}</div>
 <p className="field-note">Selected: {assetById.get(chosen)?.name} · {architectureThemes[assetById.get(chosen)?.theme??current.theme]}</p><div className="building-actions"><button className="primary" disabled={b.locked||busy||manual&&chosen===current.id} onClick={()=>s.edit(doc=>setBuildingAppearance(doc,b.id,chosen))}>Apply appearance</button><button disabled={b.locked||busy||!manual} onClick={()=>s.edit(doc=>setBuildingAppearance(doc,b.id,null))}>Reset to automatic</button></div><p className="field-note">Choose a thumbnail, then Apply for one undoable change. Artwork only; footprint and entrance stay unchanged. Extreme aspect ratios contain the artwork instead of distorting it.</p>{b.locked&&<p className="warning">Unlock this building before changing its appearance.</p>}{busy&&<p className="warning">Finish or cancel the development / expansion preview before editing appearances.</p>}
 </section>;
}
export function ArchitectureThemePanel(){
 const s=useStudio(),busy=s.development.busy||s.development.applying||!!s.development.preview||s.expansion.busy||s.expansion.applying||!!s.expansion.preview;
 return <section className="architecture-panel" aria-label="Settlement architecture"><h3>Settlement architecture</h3><label>Architecture theme<select aria-label="Architecture theme" disabled={busy} value={architectureTheme(s.present)} onChange={e=>s.edit(doc=>setArchitectureTheme(doc,e.target.value as ArchitectureTheme))}>{Object.entries(architectureThemes).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><p className="field-note">Changes automatic Illustrated artwork only. Manual choices and locked appearances are preserved. Theme is saved with this project and is separate from Planning / Illustrated style. Unlocking releases a protected automatic appearance to the current theme.</p>{busy&&<p className="field-note">Finish or cancel the map proposal to change architecture.</p>}</section>;
}
