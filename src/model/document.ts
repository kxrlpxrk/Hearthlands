export type TerrainKind = 'grass' | 'water' | 'forest' | 'stone';
export type BuildingKind = 'longhouse' | 'watchtower' | 'storehouse';
export interface Cell { x: number; y: number }
export interface SettlementDocument {
  version: 1;
  id: string;
  name: string;
  seed: number;
  grid: { width: number; height: number; cellSize: number; visible: boolean };
  terrain: (Cell & { kind: TerrainKind })[];
  buildings: (Cell & { id: string; kind: BuildingKind; layerId: string })[];
  roads: { id: string; points: Cell[]; layerId: string }[];
  districts: { id: string; name: string; cells: Cell[]; color: string; layerId: string }[];
  layers: { id: string; name: string; visible: boolean }[];
}
export function createDocument(): SettlementDocument {
  return { version: 1, id: 'hearthlands-local', name: 'Ravenfjord', seed: 1847,
    grid: { width: 96, height: 96, cellSize: 32, visible: true }, terrain: [], buildings: [], roads: [], districts: [],
    layers: [{ id: 'settlement', name: 'Settlement', visible: true }] };
}
export function isInside(doc: SettlementDocument, cell: Cell) {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < doc.grid.width && cell.y < doc.grid.height;
}
