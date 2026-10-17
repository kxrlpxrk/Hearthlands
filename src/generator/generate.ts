import { generateTerrain } from './terrain';
import { generateBuildings } from './buildings';
import { generateRoads } from './navigation';
import type { GenerationSettings } from './settings';
export function generateSettlement(settings: GenerationSettings) { return generateRoads(generateBuildings(generateTerrain(settings),settings)); }
export { generateTerrain, generateBuildings, generateRoads };
