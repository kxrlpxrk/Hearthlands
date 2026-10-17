import { create } from 'zustand';
import { createDocument, type SettlementDocument, type TerrainKind, type BuildingKind, migrateDocument } from '../model/document';
import { commit, undo, redo, type History } from '../commands/history';
export type Tool = 'pan' | 'select' | 'erase' | TerrainKind | BuildingKind;
interface StudioState extends History {
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
  selectedId: null, select: selectedId => set({ selectedId }),
  present: createDocument(), past: [], future: [], tool: 'pan',
  setTool: tool => set({ tool, selectedId: null }), edit: operation => set(s => commit(s, operation(s.present))),
  undo: () => set(s => undo(s)), redo: () => set(s => redo(s)),
  restore: present => set({ present: migrateDocument(present), selectedId: null, past: [], future: [] }),
}));
