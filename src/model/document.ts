export type TerrainKind = 'grass' | 'water' | 'forest' | 'stone';
import { buildingDefinition, type BuildingKind } from './catalogue';
export type { BuildingKind } from './catalogue';
export interface Building extends Cell { id: string; kind: BuildingKind; layerId: string; name: string; width: number; height: number; rotation: number; locked: boolean }
export interface Cell { x: number; y: number }
export interface SettlementDocument {
  version: 2;
  id: string;
  name: string;
  seed: number;
  grid: { width: number; height: number; cellSize: number; visible: boolean; snap: boolean };
  terrain: (Cell & { kind: TerrainKind })[];
  buildings: Building[];
  roads: { id: string; points: Cell[]; layerId: string }[];
  districts: { id: string; name: string; cells: Cell[]; color: string; layerId: string }[];
  layers: { id: string; name: string; visible: boolean }[];
}
export function createDocument(): SettlementDocument {
  return { version: 2, id: 'hearthlands-local', name: 'Ravenfjord', seed: 1847,
    grid: { width: 96, height: 96, cellSize: 32, visible: true, snap: true }, terrain: [], buildings: [], roads: [], districts: [],
    layers: [{ id: 'settlement', name: 'Settlement', visible: true }] };
}
export function isInside(doc: SettlementDocument, cell: Cell) {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < doc.grid.width && cell.y < doc.grid.height;
}

/** Upgrade saved v1 documents without dropping their original content or placement. */
export function migrateDocument(value: unknown): SettlementDocument {
  const doc = value as SettlementDocument;
  if (!doc || ![1, 2].includes(doc.version)) throw new Error('Unsupported document version');
  return { ...doc, version: 2, grid: { ...doc.grid, snap: doc.grid.snap ?? true }, buildings: doc.buildings.map(b => ({
    ...b, name: b.name ?? buildingDefinition(b.kind).name, width: b.width ?? 1, height: b.height ?? 1, rotation: b.rotation ?? 0, locked: b.locked ?? false,
  })) };
}
