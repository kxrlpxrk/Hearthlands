import type { Cell, Road } from '../model/document';
import type { Surface } from '../model/infrastructure';
import { create } from 'zustand';
import { createDocument, type SettlementDocument, type TerrainKind, type BuildingKind, migrateDocument } from '../model/document';
import { commit, undo, redo, type History } from '../commands/history';
export type Tool = 'infrastructure' | 'pan' | 'select' | 'erase' | TerrainKind | BuildingKind;
export interface InfrastructureState { camera:boolean; mode:'draw'|'select'|'add-point'|'delete-segment'; surface:Surface; width:number; smooth:boolean; roadId:string|null; point:number|null; draft:Cell[]; preview:Road|null }
interface StudioState extends History {
  infrastructure:InfrastructureState;
  setInfrastructure:(patch:Partial<InfrastructureState>)=>void;
  selectedId: string | null;
  select: (id: string | null) => void;
  tool: Tool;
  setTool: (tool: Tool) => void;
  edit: (operation: (doc: SettlementDocument) => SettlementDocument) => void;
  undo: () => void;
  redo: () => void;
  restore: (doc: SettlementDocument) => void;
}
export const useStudio = create<StudioState>(set => ({
  infrastructure:{camera:false,mode:'draw',surface:'dirt',width:.4,smooth:true,roadId:null,point:null,draft:[],preview:null},
  setInfrastructure:patch=>set(s=>({infrastructure:{...s.infrastructure,...patch}})),
  selectedId: null, select: selectedId => set(s=>({ selectedId,infrastructure:{...s.infrastructure,preview:null} })),
  present: createDocument(), past: [], future: [], tool: 'pan',
  setTool: tool => set(s=>({ tool, selectedId: null,infrastructure:{...s.infrastructure,camera:false,roadId:tool==='pan'||tool==='infrastructure'?s.infrastructure.roadId:null,draft:tool==='pan'||tool==='infrastructure'?s.infrastructure.draft:[],preview:null,point:null} })), edit: operation => set(s => {const next=operation(s.present);return {...commit(s,next),infrastructure:{...s.infrastructure,preview:next.buildings!==s.present.buildings?null:s.infrastructure.preview}};}),
  undo: () => set(s => ({...undo(s),infrastructure:{...s.infrastructure,preview:null,point:null}})), redo: () => set(s => ({...redo(s),infrastructure:{...s.infrastructure,preview:null,point:null}})),
  restore: present => set(s=>({ present: migrateDocument(present), selectedId: null, past: [], future: [],infrastructure:{...s.infrastructure,roadId:null,point:null,draft:[],preview:null} })),
}));
