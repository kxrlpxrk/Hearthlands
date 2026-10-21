import type {ForestPack} from '../assets/forests/catalogue';
export function ForestPackSelect({value,onChange,disabled=false,label='Forest artwork'}:{value:ForestPack;onChange:(value:ForestPack)=>void;disabled?:boolean;label?:string}){
 return <label>{label}<select aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value as ForestPack)}><option value="pilot">Original Viking trees · 6C.1B.1</option><option value="canopies">Canopy variety · 20 designs · 6C.1C</option></select></label>;
}
