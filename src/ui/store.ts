import type { District, DistrictType } from '../model/districts';
import { defaultBrush, type BrushSettings, type TerrainPreview } from '../model/terrainStroke';
import type { Cell, Road } from '../model/document';
import type { Surface } from '../model/infrastructure';
import { create } from 'zustand';
import { createDocument, type SettlementDocument, type TerrainKind, type BuildingKind, migrateDocument } from '../model/document';
import { commit, undo, redo, type History } from '../commands/history';
export type Tool = 'districts' | 'terrain-editor' | 'infrastructure' | 'pan' | 'select' | 'erase' | TerrainKind | BuildingKind;
export interface InfrastructureState { camera:boolean; mode:'draw'|'select'|'add-point'|'delete-segment'; surface:Surface; width:number; smooth:boolean; roadId:string|null; point:number|null; draft:Cell[]; preview:Road|null }
export interface TerrainEditorState { settings:BrushSettings; tab:'Sculpt'|'Water'|'Ground'|'Nature'; camera:boolean; readout:number; pending:TerrainPreview|null }
export interface DistrictEditorState { corner?:number|null; base?:SettlementDocument; camera:boolean; mode:'select'|'polygon'|'paint'|'erase'|'reshape'; selectedId:string|null; type:DistrictType; size:number; draft:Cell[]; pending:District|null; detection:District[]|null; highlight:boolean }
interface StudioState extends History {
  districtEditor:DistrictEditorState;
  setDistrictEditor:(patch:Partial<DistrictEditorState>)=>void;
  terrainEditor:TerrainEditorState;
  setTerrainEditor:(patch:Partial<TerrainEditorState>)=>void;
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
  districtEditor:{camera:false,mode:'select',selectedId:null,type:'farming',size:3,draft:[],pending:null,detection:null,highlight:false},
  setDistrictEditor:patch=>set(s=>({districtEditor:{...s.districtEditor,...patch,...(patch.pending||patch.detection?{base:s.present}:{})}})),
  terrainEditor:{settings:defaultBrush,tab:'Sculpt',camera:false,readout:0,pending:null},
  setTerrainEditor:patch=>set(s=>({terrainEditor:{...s.terrainEditor,...patch}})),
  infrastructure:{camera:false,mode:'draw',surface:'dirt',width:.4,smooth:true,roadId:null,point:null,draft:[],preview:null},
  setInfrastructure:patch=>set(s=>({infrastructure:{...s.infrastructure,...patch}})),
  selectedId: null, select: selectedId => set(s=>({ selectedId,infrastructure:{...s.infrastructure,preview:null} })),
  present: createDocument(), past: [], future: [], tool: 'pan',
  setTool: tool => set(s=>({ tool, selectedId: null,districtEditor:{...s.districtEditor,camera:false},terrainEditor:{...s.terrainEditor,camera:false,pending:tool==='terrain-editor'||tool==='pan'?s.terrainEditor.pending:null},infrastructure:{...s.infrastructure,camera:false,roadId:tool==='pan'||tool==='infrastructure'?s.infrastructure.roadId:null,draft:tool==='pan'||tool==='infrastructure'?s.infrastructure.draft:[],preview:null,point:null} })), edit: operation => set(s => {const next=operation(s.present);return {...commit(s,next),infrastructure:{...s.infrastructure,preview:next.buildings!==s.present.buildings?null:s.infrastructure.preview}};}),
  undo: () => set(s => ({...undo(s),districtEditor:{...s.districtEditor,pending:null,detection:null,draft:[]},terrainEditor:{...s.terrainEditor,pending:null},infrastructure:{...s.infrastructure,preview:null,point:null}})), redo: () => set(s => ({...redo(s),districtEditor:{...s.districtEditor,pending:null,detection:null,draft:[]},terrainEditor:{...s.terrainEditor,pending:null},infrastructure:{...s.infrastructure,preview:null,point:null}})),
  restore: present => set(s=>({ present: migrateDocument(present),districtEditor:{...s.districtEditor,selectedId:null,pending:null,detection:null,draft:[],camera:false,highlight:false}, selectedId: null, past: [], future: [],terrainEditor:{...s.terrainEditor,camera:false,pending:null},infrastructure:{...s.infrastructure,roadId:null,point:null,draft:[],preview:null} })),
}));
