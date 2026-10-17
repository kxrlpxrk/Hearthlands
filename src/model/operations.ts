import { infrastructureWidth } from './infrastructure';
import { buildingDefinition } from './catalogue';
import { footprint } from './buildings';
import { type SettlementDocument, type Cell, type TerrainKind, type BuildingKind, isInside } from './document';
export function paintTerrain(doc: SettlementDocument, cell: Cell, kind: TerrainKind): SettlementDocument {
  if (!isInside(doc, cell)) return doc;
  return { ...doc, landscape:{...doc.landscape,cells:doc.landscape.cells.filter(t=>t.x!==cell.x||t.y!==cell.y)}, terrain: [...doc.terrain.filter(t => t.x !== cell.x || t.y !== cell.y), { ...cell, kind }] };
}
export function placeBuilding(doc: SettlementDocument, cell: Cell, kind: BuildingKind, id: string): SettlementDocument {
  if (![cell.x, cell.y].every(Number.isFinite) || doc.buildings.some(b => b.x === cell.x && b.y === cell.y)) return doc;
  const definition = buildingDefinition(kind);
  return { ...doc, buildings: [...doc.buildings, { ...cell, kind, id, layerId: 'settlement', name: definition.name, width: definition.width, height: definition.height, rotation: 0, locked: false }] };
}
export function eraseCell(doc: SettlementDocument, cell: Cell): SettlementDocument {
  return { ...doc, landscape:{...doc.landscape,cells:doc.landscape.cells.filter(t=>t.x!==cell.x||t.y!==cell.y)}, terrain: doc.terrain.filter(t => t.x !== cell.x || t.y !== cell.y), buildings: doc.buildings.filter(b => { const f = footprint(b); return b.locked || !(cell.x >= b.x && cell.x < b.x + f.width && cell.y >= b.y && cell.y < b.y + f.height); }) };
}
export function resizeGrid(doc: SettlementDocument, width: number, height: number): SettlementDocument {
  if (![width, height].every(n => Number.isInteger(n) && n >= 8 && n <= 192)) return doc;
  if(doc.roads.some(r=>r.editVersion===1&&r.points.some(p=>p.x+.5+infrastructureWidth(r)/2>width||p.y+.5+infrastructureWidth(r)/2>height)))return doc;
  // Preserve all placed content rather than silently deleting it when shrinking.
  if (doc.buildings.some(b => { const f = footprint(b); return b.x + f.width > width || b.y + f.height > height; })) return doc;
  if ([...doc.landscape.cells,...doc.terrain, ...doc.buildings, ...doc.roads.flatMap(r => r.points), ...doc.districts.flatMap(d => d.cells)].some(c => c.x >= width || c.y >= height)) return doc;
  return { ...doc, grid: { ...doc.grid, width, height } };
}
