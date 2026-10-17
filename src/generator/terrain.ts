import { createDocument, type SettlementDocument, type TerrainKind } from '../model/document';
import { seededRandom } from './random';
import { landscape, noise } from './noise';
import { validateSettings, type GenerationSettings } from './settings';
export function generateTerrain(s: GenerationSettings): SettlementDocument {
  validateSettings(s);
  const phase = seededRandom(s.seed)() * Math.PI * 2;
  const doc = createDocument();
  doc.name = s.preset === 'viking' ? 'Ravenfjord' : 'Willowmere'; doc.seed = s.seed;
  doc.grid = { ...doc.grid, width: s.width, height: s.height };
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const bend = Math.sin(y / s.height * 6 + phase) * s.width * .045 + Math.sin(y / 13 + phase) * 1.8;
    const riverCentre = s.width * .74 + bend;
    const riverWidth = 1.8 + noise(s.seed + 4, 0, y / 18) * 1.7;
    const coast = s.width * .77 + bend + (noise(s.seed + 3, 0, y / 12) - .5) * 5;
    const water = s.environment === 'river' ? Math.abs(x - riverCentre) <= riverWidth : s.environment === 'coastal' && x > coast;
    const field = landscape(s.seed + 13, x, y);
    // An irregular east-west clearing corridor, rather than a circular central lawn.
    const corridorY = s.height * .49 + Math.sin(x / 14 + phase) * s.height * .065;
    const corridor = Math.max(0, 1 - Math.abs(y - corridorY) / (s.height * .22));
    const threshold = (s.environment === 'forest' ? .48 : .59) + corridor * .16;
    // A noisy woodland edge at the western boundary guarantees workshop resources.
    const woodlandEdge = s.width * (.12 + .07 * Math.sin(y / 16 + phase)) + noise(s.seed + 37, y / 7, 0) * 6;
    const woods = field > threshold || (x < woodlandEdge && field > .36 && y > 1);
    let kind: TerrainKind = water ? 'water' : woods ? 'forest' : 'grass';
    if (!water && !woods && corridor < .4 && noise(s.seed + 701, x / 6, y / 6) > .79 && field > .5) kind = 'stone';
    doc.terrain.push({ x, y, kind });
  }
  return doc;
}
