import { type SettlementDocument, type Cell, type TerrainKind, type BuildingKind, isInside } from './document';
export function paintTerrain(doc: SettlementDocument, cell: Cell, kind: TerrainKind): SettlementDocument {
  if (!isInside(doc, cell)) return doc;
  return { ...doc, terrain: [...doc.terrain.filter(t => t.x !== cell.x || t.y !== cell.y), { ...cell, kind }] };
}
export function placeBuilding(doc: SettlementDocument, cell: Cell, kind: BuildingKind, id: string): SettlementDocument {
  if (!isInside(doc, cell) || doc.buildings.some(b => b.x === cell.x && b.y === cell.y)) return doc;
  return { ...doc, buildings: [...doc.buildings, { ...cell, kind, id, layerId: 'settlement' }] };
}
export function eraseCell(doc: SettlementDocument, cell: Cell): SettlementDocument {
  return { ...doc, terrain: doc.terrain.filter(t => t.x !== cell.x || t.y !== cell.y), buildings: doc.buildings.filter(b => b.x !== cell.x || b.y !== cell.y) };
}
export function resizeGrid(doc: SettlementDocument, width: number, height: number): SettlementDocument {
  if (![width, height].every(n => Number.isInteger(n) && n >= 8 && n <= 192)) return doc;
  // Preserve all placed content rather than silently deleting it when shrinking.
  if ([...doc.terrain, ...doc.buildings, ...doc.roads.flatMap(r => r.points), ...doc.districts.flatMap(d => d.cells)].some(c => c.x >= width || c.y >= height)) return doc;
  return { ...doc, grid: { ...doc.grid, width, height } };
}
