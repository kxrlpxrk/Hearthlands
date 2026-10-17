import { create } from 'zustand';
import { createDocument, type SettlementDocument, type TerrainKind, type BuildingKind } from '../model/document';
import { commit, undo, redo, type History } from '../commands/history';
export type Tool = 'pan' | 'erase' | TerrainKind | BuildingKind;
interface StudioState extends History {
  tool: Tool;
  setTool: (tool: Tool) => void;
  edit: (operation: (doc: SettlementDocument) => SettlementDocument) => void;
  undo: () => void;
  redo: () => void;
  restore: (doc: SettlementDocument) => void;
}
export const useStudio = create<StudioState>(set => ({
  present: createDocument(), past: [], future: [], tool: 'pan',
  setTool: tool => set({ tool }), edit: operation => set(s => commit(s, operation(s.present))),
  undo: () => set(s => undo(s)), redo: () => set(s => redo(s)),
  restore: present => set({ present, past: [], future: [] }),
}));
