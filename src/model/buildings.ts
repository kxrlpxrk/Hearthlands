import {releaseAppearancePin} from './appearance';
import { footprintTerrainWarnings } from './terrain';
import type { Building, SettlementDocument } from './document';
export function footprint(b: Building) { return b.rotation % 180 === 0 ? { width: b.width, height: b.height } : { width: b.height, height: b.width }; }
export function overlaps(a: Building, b: Building) {
  const aa = footprint(a), bb = footprint(b);
  return a.x < b.x + bb.width && a.x + aa.width > b.x && a.y < b.y + bb.height && a.y + aa.height > b.y;
}
export function buildingWarnings(doc: SettlementDocument, b: Building): string[] {
  const f = footprint(b), warnings: string[] = [];
  if (b.x < 0 || b.y < 0 || b.x + f.width > doc.grid.width || b.y + f.height > doc.grid.height) warnings.push('Outside map bounds');
  if (doc.buildings.some(other => other.id !== b.id && overlaps(b, other))) warnings.push('Overlaps another building');
  return [...warnings,...footprintTerrainWarnings(doc,b)];
}
export function updateBuilding(doc: SettlementDocument, id: string, patch: Partial<Omit<Building, 'id' | 'kind' | 'layerId'>>): SettlementDocument {
  const b = doc.buildings.find(b => b.id === id);
  if (!b || (b.locked && Object.keys(patch).some(k => k !== 'locked'))) return doc;
  const next = { ...b, ...patch };
  if (![next.x, next.y, next.width, next.height, next.rotation].every(Number.isFinite) || next.width < 1 || next.height < 1 || next.width > 192 || next.height > 192) return doc;
  next.rotation = ((Math.round(next.rotation / 90) * 90) % 360 + 360) % 360;
  const architecture=b.locked!==next.locked?releaseAppearancePin(doc,id):doc.architecture;
  return { ...doc,...(architecture!==doc.architecture?{architecture}:{}), buildings: doc.buildings.map(item => item.id === id ? next : item) };
}
export function deleteBuilding(doc: SettlementDocument, id: string): SettlementDocument {
  if (doc.buildings.find(b => b.id === id)?.locked) return doc;
  return { ...doc, buildings: doc.buildings.filter(b => b.id !== id) };
}
export function duplicateBuilding(doc: SettlementDocument, id: string, newId: string): SettlementDocument {
  const b = doc.buildings.find(b => b.id === id); if (!b) return doc;
  const f = footprint(b);
  return { ...doc, buildings: [...doc.buildings, { ...b, id: newId, name: `${b.name} copy`, x: b.x + f.width + 1, locked: false }] };
}
export const snapPosition = (n: number, snap: boolean) => snap ? Math.round(n) : Math.round(n * 100) / 100;
