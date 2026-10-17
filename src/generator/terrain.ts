import { createDocument, type SettlementDocument, type TerrainKind } from '../model/document';
import { seededRandom } from './random';
import { validateSettings, type GenerationSettings } from './settings';
export function generateTerrain(s: GenerationSettings): SettlementDocument {
  validateSettings(s);
  const random = seededRandom(s.seed), phase = random() * Math.PI * 2;
  const patches = Array.from({length: s.environment === 'forest' ? 24 : 8}, () => ({x: 2 + random() * (s.width - 4), y: 2 + random() * (s.height - 4), r: 2 + random() * (s.environment === 'forest' ? 7 : 4)}));
  const doc = createDocument();
  doc.name = s.preset === 'viking' ? 'Ravenfjord' : 'Willowmere'; doc.seed = s.seed;
  doc.grid = { ...doc.grid, width: s.width, height: s.height };
  for (let y=0;y<s.height;y++) for (let x=0;x<s.width;x++) {
    const wave = Math.sin(y / 9 + phase) * 2 + Math.sin(y / 19 + phase) * 2;
    const water = s.environment === 'river' ? Math.abs(x - (s.width * .72 + wave)) < 2.5 : s.environment === 'coastal' && x > s.width * .76 + wave;
    let kind: TerrainKind = water ? 'water' : 'grass';
    // A generous central clearing keeps the village usable; woodland has coherent edges.
    const clearing = Math.hypot((x-s.width*.38)/(s.width*.25),(y-s.height*.5)/(s.height*.28)) < 1;
    if (!water && !clearing && patches.some(p => Math.hypot(x-p.x,y-p.y) < p.r)) kind = 'forest';
    // Guaranteed accessible woodland resource even when random patches land in water.
    if (!water && x >= 3 && x <= 7 && y >= 3 && y <= Math.min(11,s.height-4)) kind = 'forest';
    doc.terrain.push({x,y,kind});
  }
  return doc;
}
