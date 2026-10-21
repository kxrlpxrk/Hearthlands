import {type GrasslandMode} from '../assets/grassland/registry';
/** One opt-in setting: intensity changes patch frequency, never source colours. */
export function GrasslandSelect({value,onChange,disabled=false,label='Illustrated grassland pilot'}:{value:GrasslandMode;onChange:(v:GrasslandMode)=>void;disabled?:boolean;label?:string}){
 return <label>{label}<select aria-label={label} value={value} disabled={disabled} onChange={e=>onChange(e.target.value as GrasslandMode)}><option value="off">Off · existing terrain</option><option value="restrained">On · restrained accents</option><option value="accents">On · more meadow accents</option></select></label>;
}
