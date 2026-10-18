import type { Building } from '../model/document';
import { buildingDefinition } from '../model/catalogue';
/** Visual state never enters the settlement model, history, navigation or generation. */
export type VisualStyle='planning'|'illustrated';
export type DetailPreference='auto'|'reduced';
export const visualStyles:VisualStyle[]=['planning','illustrated'];
export const sceneLayers=['base','nature','water','relief','grid','districts','roads','infrastructure','buildings','decorations','labels','interactions'] as const;
export type TerrainLayer='base'|'nature'|'water'|'relief';
export function reducedDetail(style:VisualStyle,cellPixels:number,preference:DetailPreference='auto'){return preference==='reduced'||style==='illustrated'&&cellPixels<7;}
const categories={homes:'#d6bd7e',trade:'#c98b65',farming:'#b0c174',waterfront:'#8ec6cf',defence:'#c2abbf'};
export function buildingPresentation(b:Building,style:VisualStyle,reduced=false){
 const category=['farm','stables','mill'].includes(b.kind)?'farming':buildingDefinition(b.kind).group==='Waterfront'?'waterfront':buildingDefinition(b.kind).group==='Defence & horses'?'defence':buildingDefinition(b.kind).group==='Trade & industry'?'trade':'homes';
 const accent=categories[category],illustrated=style==='illustrated';
 return {category,accent,base:b.locked?'#626c65':illustrated?'#ab926a':'#273d35',roof:illustrated?({homes:'#97704b',trade:'#865c47',farming:'#85804d',waterfront:'#647d79',defence:'#77747b'})[category]:'#395347',ink:illustrated?'#f1d8a3':accent,outline:illustrated?'#3b3c2e':'#e1d8ae',shadow:illustrated&&!reduced,shadowColor:'#1c3029',lock:'#d3e7ee',entrance:'#fff1b6'};
}
export const styleBackground=(style:VisualStyle)=>style==='illustrated'?'#73815a':'#344536';

/** Quantised, bounded overview cache. Pan never rebuilds it; close zoom uses vectors. */
export const terrainCachePixels=(cellPixels:number)=>cellPixels<=3?4:cellPixels<=6?8:cellPixels<=10?12:0;
