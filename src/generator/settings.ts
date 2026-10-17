import { catalogue, type BuildingKind } from '../model/catalogue';
export interface GenerationSettings {
  preset: 'viking' | 'medieval';
  environment: 'forest' | 'plains' | 'river' | 'coastal';
  layout: 'organic' | 'planned' | 'contextual';
  width: number; height: number; count: number; seed: number;
  required: Partial<Record<BuildingKind, number>>;
}
export const defaultSettings: GenerationSettings = { preset: 'viking', environment: 'river', layout: 'contextual', width: 96, height: 96, count: 35, seed: 1847, required: { longhouse: 1, fishinghut: 3, harbour: 1, sawmill: 1 } };
export class GenerationError extends Error {}
export function validateSettings(s: GenerationSettings) {
  if (![s.width,s.height].every(n => Number.isInteger(n) && n >= 24 && n <= 192)) throw new GenerationError('Map dimensions must be integers from 24 to 192. Small maps may not fit your target.');
  if (!Number.isInteger(s.count) || s.count < 20 || s.count > 60) throw new GenerationError('Choose 20–60 buildings.');
  if (!Number.isSafeInteger(s.seed)) throw new GenerationError('Seed must be a safe integer.');
  if (!['viking','medieval'].includes(s.preset) || !['forest','plains','river','coastal'].includes(s.environment) || !['organic','planned','contextual'].includes(s.layout)) throw new GenerationError('Unknown generation option.');
  let total = 0;
  for (const [kind,n] of Object.entries(s.required)) {
    if (!catalogue.some(b => b.kind === kind) || !Number.isInteger(n) || n! < 0 || n! > 60) throw new GenerationError('Required quantities must be integers from 0 to 60.');
    total += n!;
    if (n && ['fishinghut','harbour','shipyard','bridge'].includes(kind) && !['river','coastal'].includes(s.environment)) throw new GenerationError(`${catalogue.find(b => b.kind === kind)!.name} requires a river or coastal environment.`);
  }
  if (total > s.count) throw new GenerationError(`Required quantities (${total}) exceed the target (${s.count}).`);
}
