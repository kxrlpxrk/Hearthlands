import {grasslandRadius,grasslandMaskEdge} from './grasslandGeometry';
const smooth=(from:number,to:number,value:number)=>{const t=Math.max(0,Math.min(1,(value-from)/(to-from)));return t*t*(3-2*t);};
/** Logical screen/output pixels per tile, not zoom percentage or cache resolution.
 * At Fit, only the continuous ground field remains. A gentle, stateless ramp
 * introduces the SAME patch artwork; nothing gets reassigned or rebuilt. */
export function grasslandTextureOpacity(pixelsPerTile:number){return smooth(5.5,12,pixelsPerTile);}
/** Full-source detail replaces the opaque centre only, over the matching medium
 * image. No high-resolution per-patch bitmap or repeated decode is needed. */
export function grasslandSourceMix(projectedDiameter:number){return smooth(grasslandMaskEdge,grasslandMaskEdge*1.65,projectedDiameter);}
export function grasslandOpaquePoints(variant:number){
 return Array.from({length:160},(_,i)=>{const a=i*Math.PI*2/160,r=grasslandRadius(a,variant)*.81;return{x:Math.cos(a)*r,y:Math.sin(a)*r};});
}
export function grasslandOpaquePath(variant:number){return grasslandOpaquePoints(variant).map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('')+'Z';}
