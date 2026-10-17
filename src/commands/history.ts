import type { SettlementDocument } from '../model/document';
export interface History { present: SettlementDocument; past: SettlementDocument[]; future: SettlementDocument[] }
export function commit(history: History, next: SettlementDocument): History {
  if (next === history.present || JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return { present: next, past: [...history.past.slice(-99), history.present], future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { present: h.past[h.past.length - 1], past: h.past.slice(0, -1), future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { present: h.future[0], past: [...h.past, h.present], future: h.future.slice(1) };
}
