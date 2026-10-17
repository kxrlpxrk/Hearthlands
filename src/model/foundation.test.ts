import { describe, it, expect } from 'vitest';
import { createDocument } from './document';
import { paintTerrain, placeBuilding, resizeGrid, eraseCell } from './operations';
import { commit, undo, redo } from '../commands/history';
import { seededRandom } from '../generator/random';
describe('document operations', () => {
  it('paints immutably, replaces tiles and rejects out-of-bounds edits', () => { const doc = createDocument(); const next = paintTerrain(doc, { x: 2, y: 3 }, 'water'); expect(doc.terrain).toEqual([]); expect(next.terrain).toHaveLength(1); expect(paintTerrain(next, { x: 2, y: 3 }, 'forest').terrain).toEqual([{ x: 2, y: 3, kind: 'forest' }]); expect(paintTerrain(doc, { x: 96, y: 0 }, 'water')).toBe(doc); });
  it('prevents occupied building placement and erases content', () => { const doc = placeBuilding(createDocument(), { x: 1, y: 1 }, 'longhouse', 'a'); expect(placeBuilding(doc, { x: 1, y: 1 }, 'watchtower', 'b')).toBe(doc); expect(eraseCell(doc, { x: 1, y: 1 }).buildings).toEqual([]); });
  it('validates dimensions and preserves content on shrink', () => { const doc = placeBuilding(createDocument(), { x: 90, y: 90 }, 'longhouse', 'a'); expect(resizeGrid(doc, 8, 8)).toBe(doc); expect(resizeGrid(doc, 200, 96)).toBe(doc); expect(resizeGrid(doc, 120, 120).grid.width).toBe(120); });
});
describe('history', () => {
  it('undoes, redoes and discards redo after a new command', () => { const doc = createDocument(); const a = commit({ present: doc, past: [], future: [] }, paintTerrain(doc, { x: 1, y: 1 }, 'water')); const b = undo(a); expect(b.present).toBe(doc); expect(redo(b).present).toBe(a.present); expect(commit(b, paintTerrain(doc, { x: 2, y: 2 }, 'forest')).future).toEqual([]); });
  it('ignores empty commands and limits history', () => { let h = { present: createDocument(), past: [] as ReturnType<typeof createDocument>[], future: [] as ReturnType<typeof createDocument>[] }; expect(commit(h, h.present)).toBe(h); for (let i = 0; i < 110; i++) h = commit(h, { ...h.present, seed: i }); expect(h.past).toHaveLength(100); });
});
it('produces repeatable seeded random sequences', () => { const a = seededRandom(1847), b = seededRandom(1847), c = seededRandom(12); const values = Array.from({ length: 20 }, a); expect(values).toEqual(Array.from({ length: 20 }, b)); expect(values).not.toEqual(Array.from({ length: 20 }, c)); expect(values.every(v => v >= 0 && v < 1)).toBe(true); });
