import type {RasterPresentation} from './types';
/** Preserve the footprint-safe 6B.7 scales. Distant images now come from the PNG
 * cache pyramid, never a separately drawn roof or a different catalogue asset. */
export const pilotPresentations:Readonly<Partial<Record<string,RasterPresentation>>>={
 cottage:{version:1,scale:1.06,bounds:{x:0,y:0,width:1,height:1}},
 tavern:{version:1,scale:1.04,bounds:{x:0,y:0,width:1,height:1}},
 farm:{version:1,scale:1.03,bounds:{x:0,y:0,width:1,height:1}},
};
