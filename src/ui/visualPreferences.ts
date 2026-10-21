import {normalizeGrasslandMode,type GrasslandMode} from '../assets/grassland/registry';
import type {ForestPack} from '../assets/forests/catalogue';
import { create } from 'zustand';
import { type DetailPreference, type VisualStyle } from '../rendering/styles';
export const VISUAL_PREFERENCE_KEY='hearthlands.visual.v1';
export interface VisualPreferences {ground63:boolean;grassland:GrasslandMode;version:1;style:VisualStyle;detail:DetailPreference;labels:boolean;forestPilot:boolean;forestPack:ForestPack}
export const defaultVisualPreferences:VisualPreferences={ground63:false,grassland:'off',version:1,style:'planning',detail:'auto',labels:false,forestPilot:false,forestPack:'pilot'};
export function readVisualPreferences(storage?:Pick<Storage,'getItem'>):VisualPreferences{
 try{const value=storage?.getItem(VISUAL_PREFERENCE_KEY);if(!value)return {...defaultVisualPreferences};const p=JSON.parse(value);if(p.version!==1||!['planning','illustrated'].includes(p.style)||!['auto','reduced'].includes(p.detail)||typeof p.labels!=='boolean')return {...defaultVisualPreferences};return {ground63:p.ground63===true,grassland:normalizeGrasslandMode(p.grassland),version:1,style:p.style,detail:p.detail,labels:p.labels,forestPilot:p.forestPilot===true,forestPack:p.forestPack==='canopies'?'canopies':'pilot'};}catch{return {...defaultVisualPreferences};}
}
function storage(){try{return globalThis.localStorage;}catch{return undefined;}}
export const useVisualPreferences=create<VisualPreferences&{error:string;change:(patch:Partial<Omit<VisualPreferences,'version'>>)=>void}>(set=>({
 ...readVisualPreferences(storage()),error:'',change:patch=>set(previous=>{const next={ground63:patch.ground63??previous.ground63,grassland:normalizeGrasslandMode(patch.grassland??previous.grassland),version:1 as const,style:patch.style??previous.style,detail:patch.detail??previous.detail,labels:patch.labels??previous.labels,forestPilot:patch.forestPilot??previous.forestPilot,forestPack:patch.forestPack??previous.forestPack};let error='';try{const target=storage();if(!target)throw new Error('Storage unavailable');target.setItem(VISUAL_PREFERENCE_KEY,JSON.stringify(next));}catch{error='Style applied for this session. Browser settings prevented saving visual preferences.';}return {...next,error};}),
}));
