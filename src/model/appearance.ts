import type {Building,SettlementDocument} from './document';
import {assetById,assetsForKind} from '../assets/buildings/registry';
import {architectureThemes,type ArchitectureTheme,type BuildingAsset} from '../assets/buildings/types';
export type BuildingAppearance={version:1;mode:'automatic'}|{version:1;mode:'manual';assetId:string};
export interface ArchitectureSettings {version:1;theme:ArchitectureTheme;lockedAutomatic?:{buildingId:string;assetId:string}[]}
export const architectureTheme=(doc:Pick<SettlementDocument,'architecture'>):ArchitectureTheme=>doc.architecture?.theme??'viking';
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;}
/** No position, rotation, camera, array index or random-state consumption is involved. */
export function resolveBuildingAsset(doc:Pick<SettlementDocument,'seed'|'architecture'>,b:Building):BuildingAsset{
 const manual=b.appearance?.mode==='manual'?assetById.get(b.appearance.assetId):undefined;
 if(manual?.kind===b.kind)return manual;
 if(b.locked&&b.appearance?.mode!=='manual'){const pin=doc.architecture?.lockedAutomatic?.find(p=>p.buildingId===b.id),asset=pin&&assetById.get(pin.assetId);if(asset?.kind===b.kind)return asset;}
 return selectAutomaticAsset(doc.seed,architectureTheme(doc),b);
}
/** Rendezvous selection depends on asset IDs, not registry/renderer array ordering. */
export function selectAutomaticAsset(seed:number,theme:ArchitectureTheme,b:Pick<Building,'id'|'kind'>,candidates:readonly BuildingAsset[]=assetsForKind(b.kind)):BuildingAsset{
 const compatible=candidates.filter(a=>a.kind===b.kind&&a.automatic),themed=compatible.filter(a=>a.theme===theme),pool=themed.length?themed:compatible;
 let best=pool[0],bestScore=-1;for(const asset of pool){const score=hash(`${seed}:${b.kind}:${b.id}:${asset.id}`);if(score>bestScore||score===bestScore&&asset.id<best.id){best=asset;bestScore=score;}}return best??assetsForKind(b.kind)[0];
}
export function setBuildingAppearance(doc:SettlementDocument,id:string,assetId:string|null):SettlementDocument{
 const b=doc.buildings.find(b=>b.id===id);if(!b||b.locked)return doc;
 if(assetId!==null&&assetById.get(assetId)?.kind!==b.kind)throw new Error('Choose an available asset compatible with this building kind.');
 const next={...b};if(assetId===null)delete next.appearance;else next.appearance={version:1,mode:'manual',assetId};
 if(JSON.stringify(next.appearance)===JSON.stringify(b.appearance))return doc;
 return {...doc,buildings:doc.buildings.map(b=>b.id===id?next:b)};
}
/** Theme changes preserve all object data and explicitly freeze locked automatic art.
 * Unlocking releases its pin; manual selections are always independent of theme. */
export function setArchitectureTheme(doc:SettlementDocument,theme:ArchitectureTheme):SettlementDocument{
 if(!Object.hasOwn(architectureThemes,theme))throw new Error('Unknown architecture theme.');if(theme===architectureTheme(doc))return doc;
 const lockedAutomatic=doc.buildings.filter(b=>b.locked&&b.appearance?.mode!=='manual').map(b=>({buildingId:b.id,assetId:resolveBuildingAsset(doc,b).id}));
 return {...doc,architecture:{version:1,theme,...(lockedAutomatic.length?{lockedAutomatic}:{})}};
}
export function releaseAppearancePin(doc:SettlementDocument,id:string){const architecture=doc.architecture;if(!architecture?.lockedAutomatic?.some(p=>p.buildingId===id))return architecture;const lockedAutomatic=architecture.lockedAutomatic.filter(p=>p.buildingId!==id);const next={...architecture};if(lockedAutomatic.length)next.lockedAutomatic=lockedAutomatic;else delete next.lockedAutomatic;return next;}
