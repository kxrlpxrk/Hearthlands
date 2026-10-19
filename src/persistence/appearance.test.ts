import 'fake-indexeddb/auto';
import {beforeAll,describe,it,expect} from 'vitest';
import {projectSession} from './session';
import {repository} from './database';
import {useStudio} from '../ui/store';
import {createDocument} from '../model/document';
import type {BuildingKind} from '../model/catalogue';
import {placeBuilding} from '../model/operations';
import {setBuildingAppearance,setArchitectureTheme,resolveBuildingAsset} from '../model/appearance';
import {serializeDocument,parseDocument} from '../exports/json';
beforeAll(()=>projectSession.initialize());
describe('appearance project recovery',()=>{
 it.each([['longhouse','starter.rural.longhouse.1'],['longhouse','demo.viking.longhouse.timber'],['longhouse','hearthlands.viking.longhouse.01'],['longhouse','hearthlands.viking.longhouse.02'],['longhouse','hearthlands.viking.longhouse.03'],['cottage','hearthlands.sheet4.cottage.01'],['tavern','hearthlands.sheet4.tavern.01'],['farm','hearthlands.sheet4.farm.01']] as [BuildingKind,string][])('autosaves %s (%s), reopens, restores snapshots and isolates project copies',async(kind,assetId)=>{await projectSession.create(placeBuilding(createDocument(),{x:8,y:8},kind,'hall'));const base=useStudio.getState().present;useStudio.getState().edit(d=>setBuildingAppearance(d,'hall',assetId));await projectSession.flush();expect(useStudio.getState().past).toHaveLength(1);await projectSession.snapshot('Chosen roof');useStudio.getState().edit(d=>setArchitectureTheme(d,'coastal'));await projectSession.flush();const chosen=useStudio.getState().present;expect((await repository.load(base.id)).document).toEqual(chosen);expect(resolveBuildingAsset(chosen,chosen.buildings[0]).id).toBe(assetId);useStudio.getState().undo();expect(useStudio.getState().present.architecture).toBeUndefined();useStudio.getState().redo();expect(useStudio.getState().present).toBe(chosen);await projectSession.flush();const copy=await projectSession.duplicate(base.id);await projectSession.open(copy.document.id);useStudio.getState().edit(d=>setBuildingAppearance(d,'hall',null));await projectSession.flush();expect((await repository.load(base.id)).document).toEqual(chosen);await projectSession.open(base.id);expect(useStudio.getState().present).toEqual(chosen);expect(parseDocument(serializeDocument(chosen))).toEqual(chosen);const snapshot=(await repository.snapshotsFor(base.id)).find(s=>s.name==='Chosen roof')!;await projectSession.restore(snapshot.id);expect(useStudio.getState().present.buildings[0].appearance).toEqual(chosen.buildings[0].appearance);expect(useStudio.getState().present.architecture).toBeUndefined();});
});
