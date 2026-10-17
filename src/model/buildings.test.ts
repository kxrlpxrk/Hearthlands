import { describe, it, expect } from 'vitest';
import { createDocument, migrateDocument } from './document';
import { placeBuilding, resizeGrid, eraseCell } from './operations';
import { updateBuilding, deleteBuilding, duplicateBuilding, footprint, overlaps, buildingWarnings, snapPosition } from './buildings';
import { commit, undo, redo, type History } from '../commands/history';
import { catalogue } from './catalogue';
const base = () => placeBuilding(createDocument(), { x: 3, y: 4 }, 'longhouse', 'a');
describe('building transforms', () => {
  it('uses catalogue defaults and rotates in quarter turns about the top-left footprint anchor', () => {
    const d = base(), b = d.buildings[0]; expect([b.width,b.height]).toEqual([4,2]);
    const rotated = updateBuilding(d, 'a', { rotation: 90 }).buildings[0]; expect(footprint(rotated)).toEqual({ width: 2, height: 4 }); expect([rotated.x,rotated.y]).toEqual([3,4]);
    expect(updateBuilding(d, 'a', { rotation: -90 }).buildings[0].rotation).toBe(270);
    expect(updateBuilding(d, 'a', { rotation: 360 }).buildings[0].rotation).toBe(0);
  });
  it('moves, resizes, renames immutably and rejects invalid sizes', () => {
    const d = base(), next = updateBuilding(d, 'a', { x: 8.25, y: 9, width: 6, height: 3, name: 'My hall' });
    expect(d.buildings[0].x).toBe(3); expect(next.buildings[0]).toMatchObject({ x: 8.25, y: 9, width: 6, height: 3, name: 'My hall' });
    for (const width of [0, -1, Infinity, NaN, 193]) expect(updateBuilding(d, 'a', { width })).toBe(d);
    expect(snapPosition(2.6, true)).toBe(3); expect(snapPosition(2.625, false)).toBe(2.63);
  });
  it('duplicates with independent identity and deletes by identity', () => {
    const d = duplicateBuilding(base(), 'a', 'b'); expect(d.buildings).toHaveLength(2); expect(d.buildings[1]).toMatchObject({ id: 'b', x: 8, y: 4, name: 'Longhouse copy', locked: false }); expect(deleteBuilding(d, 'a').buildings.map(b => b.id)).toEqual(['b']);
  });
});
describe('collision and bounds', () => {
  it('detects full rotated footprints but allows adjacent edges', () => {
    const a = base().buildings[0], b = { ...a, id: 'b', x: 7 };
    expect(overlaps(a,b)).toBe(false); expect(overlaps(a,{ ...b,x: 6.99 })).toBe(true);
    expect(overlaps({ ...a, rotation: 90 },{ ...b,x: 3,y: 7 })).toBe(true);
    const d = { ...base(), buildings: [a,{ ...b,x: 6 }] }; expect(buildingWarnings(d,a)).toContain('Overlaps another building');
  });
  it('warns on bounds and refuses grid shrink that clips footprint', () => {
    const d = updateBuilding(base(), 'a', { x: 94 }); expect(buildingWarnings(d,d.buildings[0])).toContain('Outside map bounds'); const original = base(); expect(resizeGrid(original, 8, 5)).toBe(original);
    const edge = updateBuilding(base(), 'a', { x: 7, y: 7 }); expect(resizeGrid(edge, 8, 8)).toBe(edge);
  });
});
describe('locking', () => {
  it('blocks transforms, rename, deletion and eraser; unlock restores editing', () => {
    const locked = updateBuilding(base(),'a',{ locked:true });
    for (const patch of [{x:20},{width:8},{rotation:90},{name:'Changed'}]) expect(updateBuilding(locked,'a',patch)).toBe(locked);
    expect(deleteBuilding(locked,'a')).toBe(locked); expect(eraseCell(locked,{x:4,y:5}).buildings).toHaveLength(1);
    expect(updateBuilding(updateBuilding(locked,'a',{locked:false}),'a',{x:20}).buildings[0].x).toBe(20);
  });
});
it('undoes and redoes each building action in a single command', () => {
  let h: History = {present:createDocument(),past:[],future:[]};
  const actions = [
    (d: History['present']) => placeBuilding(d,{x:3,y:4},'longhouse','a'),
    (d: History['present']) => updateBuilding(d,'a',{x:10,y:12}),
    (d: History['present']) => updateBuilding(d,'a',{width:6,height:3}),
    (d: History['present']) => updateBuilding(d,'a',{rotation:90}),
    (d: History['present']) => deleteBuilding(d,'a'),
  ];
  for (const action of actions) { const before = h.present; h = commit(h,action(before)); const after = h.present; expect(undo(h).present).toEqual(before); expect(redo(undo(h)).present).toEqual(after); }
  expect(h.past).toHaveLength(5);
});
it('preserves one-tile v1 buildings when upgrading and keeps v2 footprints', () => {
  const legacy = { ...createDocument(), version: 1, buildings: [{ id:'old',x:5,y:5,kind:'longhouse',layerId:'settlement' }] };
  const migrated = migrateDocument(legacy); expect(migrated.version).toBe(2); expect(migrated.buildings[0]).toMatchObject({width:1,height:1,rotation:0,locked:false,name:'Longhouse'}); expect(migrateDocument(base())).toEqual(base());
});
it('contains every requested catalogue family with valid footprints', () => { expect(catalogue).toHaveLength(19); expect(catalogue.every(b => b.width > 0 && b.height > 0)).toBe(true); expect(new Set(catalogue.map(b => b.kind)).size).toBe(catalogue.length); });
