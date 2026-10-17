import { generateTerrain, generateBuildings, generateRoads, generateSettlement } from './generate';
import type { GenerationSettings } from './settings';
import type { SettlementDocument } from '../model/document';
export interface GenerationRequest { stage: 'complete'|'terrain'|'buildings'|'roads'; settings: GenerationSettings; draft: SettlementDocument | null }
export type GenerationResponse = { doc: SettlementDocument } | { error: string };
self.onmessage = (event: MessageEvent<GenerationRequest>) => {
  const {stage,settings,draft}=event.data;
  try { const doc=stage==='complete'?generateSettlement(settings):stage==='terrain'?generateTerrain(settings):stage==='buildings'?generateBuildings(draft!,settings):generateRoads(draft!);self.postMessage({doc} satisfies GenerationResponse); }
  catch(e) { self.postMessage({error:e instanceof Error?e.message:'Generation failed.'} satisfies GenerationResponse); }
};
