import { surfaces } from './infrastructure';
import { catalogue } from './catalogue';
import { migrateDocument, type SettlementDocument } from './document';
const fail = (path: string): never => { throw new Error(`Invalid Hearthlands project: ${path}.`); };
function record(value: unknown, path: string): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(path); return value as Record<string, unknown>; }
function list(value: unknown, path: string, max = 100_000): unknown[] { if (!Array.isArray(value) || value.length > max) return fail(path); return value; }
function text(value: unknown, path: string, empty = false): asserts value is string { if (typeof value !== 'string' || (!empty && !value.length) || value.length > 1000) fail(path); }
function number(value: unknown, path: string, min = -1_000_000, max = 1_000_000): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path); }
function boolean(value: unknown, path: string) { if (typeof value !== 'boolean') fail(path); }
function oneOf(value: unknown, values: readonly string[], path: string) { if (typeof value !== 'string' || !values.includes(value)) fail(path); }
function cell(value: unknown, path: string, integer = false) { const c = record(value,path); number(c.x,`${path}.x`); number(c.y,`${path}.y`); if (integer && (!Number.isInteger(c.x) || !Number.isInteger(c.y))) fail(path); }
function cells(value: unknown, path: string) { for (const c of list(value,path,500_000)) cell(c,path); }
export function validateDocument(value: unknown): SettlementDocument {
  let nodes = 0;
  function safe(v: unknown, depth = 0) {
    if (++nodes > 2_000_000 || depth > 40) fail('file is too complex');
    if (v && typeof v === 'object') for (const [key, child] of Object.entries(v)) { if (['__proto__','prototype','constructor'].includes(key)) fail('unsafe object key'); safe(child,depth+1); }
  }
  safe(value);
  const d = record(value,'document');
  if (d.version !== 1 && d.version !== 2) throw new Error('Unsupported Hearthlands document version. Supported versions: 1 and 2.');
  text(d.id,'project id'); text(d.name,'name',true); number(d.seed,'seed',-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);
  const grid = record(d.grid,'grid');
  number(grid.width,'grid width',8,192); number(grid.height,'grid height',8,192);
  if (!Number.isInteger(grid.width) || !Number.isInteger(grid.height)) fail('grid dimensions must be integers');
  number(grid.cellSize,'cell size',1,256); boolean(grid.visible,'grid visibility'); if (d.version === 2 || grid.snap !== undefined) boolean(grid.snap,'grid snapping');
  const layerIds = new Set<string>();
  for (const value of list(d.layers,'layers',100)) { const l = record(value,'layer'); text(l.id,'layer id'); if (layerIds.has(l.id)) fail('duplicate layer id'); layerIds.add(l.id); text(l.name,'layer name',true); boolean(l.visible,'layer visibility'); }
  if (!layerIds.size) fail('at least one layer is required');
  const ids = (values: unknown[], path: string) => { const seen = new Set<string>(); for (const v of values) { const r=record(v,path); text(r.id,`${path} id`); if (seen.has(r.id)) fail(`duplicate ${path} id`); seen.add(r.id); text(r.layerId,`${path} layer`); if (!layerIds.has(r.layerId)) fail(`${path} refers to a missing layer`); } };
  const terrain = list(d.terrain,'terrain',192*192), seenTiles = new Set<string>();
  for (const t of terrain) { cell(t,'terrain tile',true); const tile=record(t,'terrain tile'); oneOf(tile.kind,['grass','forest','water','stone'],'terrain kind'); const key=`${tile.x},${tile.y}`; if (seenTiles.has(key)) fail('duplicate terrain tile'); seenTiles.add(key); }
  const buildings = list(d.buildings,'buildings',10_000); ids(buildings,'building');
  let footprintBudget=0;
  for (const value of buildings) { const b=record(value,'building'); cell(b,'building position'); oneOf(b.kind,catalogue.map(b=>b.kind),'building kind');
    for (const key of ['width','height']) if (d.version===2||b[key]!==undefined) number(b[key],`building ${key}`,1,192);
    footprintBudget+=Number(b.width??1)*Number(b.height??1);if(footprintBudget>1_000_000)fail('building footprints exceed the safe import complexity limit');
    if (d.version===2||b.rotation!==undefined) { number(b.rotation,'building rotation',0,270); if ((b.rotation as number)%90) fail('rotation must be a quarter turn'); }
    if (d.version===2||b.name!==undefined) text(b.name,'building name',true); if (d.version===2||b.locked!==undefined) boolean(b.locked,'building lock');
  }
  const roads=list(d.roads,'roads',10_000); ids(roads,'road'); let totalPoints=0;
  for (const value of roads) { const r=record(value,'road'); cells(r.points,'road points'); totalPoints+=(r.points as unknown[]).length; if (totalPoints>500_000) fail('too many road points'); if(r.editVersion===1){if((r.points as unknown[]).length>5000)fail('too many infrastructure control points');for(const p of r.points as {x:number;y:number}[])if(p.x<-.5||p.y<-.5||p.x>(grid.width as number)-.5||p.y>(grid.height as number)-.5)fail('infrastructure points outside map');}if(r.editVersion!==undefined&&r.editVersion!==1)fail('unsupported infrastructure version'); if(r.surface!==undefined)oneOf(r.surface,Object.keys(surfaces),'infrastructure material');if(r.width!==undefined)number(r.width,'infrastructure width',.15,3);if(r.locked!==undefined)boolean(r.locked,'infrastructure lock');if(r.name!==undefined)text(r.name,'infrastructure name',true); if(r.kind!==undefined)oneOf(r.kind,['primary','secondary','access'],'road kind');if(r.style!==undefined)oneOf(r.style,['organic','planned','contextual'],'road style'); }
  const districts=list(d.districts,'districts',1000); ids(districts,'district');
  for (const value of districts) { const r=record(value,'district'); text(r.name,'district name',true); text(r.color,'district colour'); cells(r.cells,'district cells'); }
  if (d.planning!==undefined) {
    const p=record(d.planning,'planning'); if (p.version!==1) fail('unsupported planning version'); oneOf(p.layout,['organic','planned','contextual'],'planning layout');
    for(const k of ['centre','workshop','farming'])cell(p[k],`planning ${k}`);if(p.waterfront!==undefined)cell(p.waterfront,'waterfront');
    for(const value of list(p.clusters,'clusters',100)){const c=record(value,'cluster');text(c.id,'cluster id');oneOf(c.role,['civic','residential','waterfront','farming','workshop'],'cluster role');cell(c.centre,'cluster centre');number(c.radius,'cluster radius',0,1000);}
    for(const value of list(p.openSpaces,'open spaces',1000)){const s=record(value,'open space');oneOf(s.kind,['gathering','working','yard','field','expansion'],'open space kind');cells(s.cells,'open space cells');}
    for(const path of list(p.primaryRoutes,'primary routes',1000))cells(path,'primary route');
  }
  // Preserve all validated document fields, including optional planning/road metadata.
  return migrateDocument(structuredClone(value));
}
