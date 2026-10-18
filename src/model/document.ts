import type { District, DistrictView } from './districts';
import { emptyLandscape, type Landscape } from './terrain';
export type TerrainKind = 'grass' | 'water' | 'forest' | 'stone';
import { buildingDefinition, type BuildingKind } from './catalogue';
export type { BuildingKind } from './catalogue';
export interface Building extends Cell { provenance?: import('./provenance').Provenance; id: string; kind: BuildingKind; layerId: string; name: string; width: number; height: number; rotation: number; locked: boolean }
export interface Cell { x: number; y: number }
export type RoadStyle = 'organic' | 'planned' | 'contextual';
export interface Road { provenance?: import('./provenance').Provenance; editVersion?: 1; surface?: import('./infrastructure').Surface; width?: number; locked?: boolean; name?: string; id: string; points: Cell[]; layerId: string; kind?: 'primary' | 'secondary' | 'access'; style?: RoadStyle }
export interface SettlementPlan {
  version: 1;
  layout: RoadStyle;
  centre: Cell;
  clusters: { id: string; role: 'civic' | 'residential' | 'waterfront' | 'farming' | 'workshop'; centre: Cell; radius: number }[];
  waterfront?: Cell;
  workshop: Cell;
  farming: Cell;
  openSpaces: { kind: 'gathering' | 'working' | 'yard' | 'field' | 'expansion'; cells: Cell[] }[];
  primaryRoutes: Cell[][];
}
export interface SettlementDocument {
  version: 3;
  landscape: Landscape;
  id: string;
  name: string;
  seed: number;
  grid: { width: number; height: number; cellSize: number; visible: boolean; snap: boolean };
  terrain: (Cell & { kind: TerrainKind })[];
  buildings: Building[];
  roads: Road[];
  planning?: SettlementPlan;
  districts: District[];
  districtView?: DistrictView;
  layers: { id: string; name: string; visible: boolean }[];
}
export function createDocument(): SettlementDocument {
  return { version: 3, landscape:emptyLandscape(), id: 'hearthlands-local', name: 'Ravenfjord', seed: 1847,
    grid: { width: 96, height: 96, cellSize: 32, visible: true, snap: true }, terrain: [], buildings: [], roads: [], districts: [],
    layers: [{ id: 'settlement', name: 'Settlement', visible: true }] };
}
export function isInside(doc: SettlementDocument, cell: Cell) {
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < doc.grid.width && cell.y < doc.grid.height;
}

/** Lazily upgrade v1/v2 documents; retain original terrain, objects and optional metadata. */
export function migrateDocument(value: unknown): SettlementDocument {
  const doc = value as SettlementDocument;
  if (!doc || ![1, 2, 3].includes(doc.version)) throw new Error('Unsupported document version');
  return { ...doc, version: 3, landscape:doc.landscape??emptyLandscape(), grid: { ...doc.grid, snap: doc.grid.snap ?? true }, buildings: doc.buildings.map(b => ({
    ...b, name: b.name ?? buildingDefinition(b.kind).name, width: b.width ?? 1, height: b.height ?? 1, rotation: b.rotation ?? 0, locked: b.locked ?? false,
  })) };
}
