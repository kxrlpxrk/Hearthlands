import {forestImageAssets} from './registry';
import {forestCanopyAssets} from './canopies/registry';
export type ForestPack='pilot'|'canopies';
export const forestPackAssets={pilot:forestImageAssets,canopies:forestCanopyAssets} as const;
export const allForestAssets=[...forestImageAssets,...forestCanopyAssets];
export const forestAssetsById=new Map(allForestAssets.map(a=>[a.id,a]));
export const assetForestPack=(id:string):ForestPack=>id.startsWith('hearthlands.viking.canopy.')?'canopies':'pilot';
