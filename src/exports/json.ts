import type { SettlementDocument } from '../model/document';
import { validateDocument } from '../model/validation';
import { downloadBlob, fileName } from './download';
export const MAX_JSON_BYTES = 20 * 1024 * 1024;
export function serializeDocument(doc: SettlementDocument) { return JSON.stringify(validateDocument(doc),null,2); }
export function parseDocument(json: string): SettlementDocument {
  if (new TextEncoder().encode(json).byteLength > MAX_JSON_BYTES) throw new Error('Project JSON exceeds the 20 MB import limit.');
  let value: unknown; try { value=JSON.parse(json); } catch { throw new Error('This file is not valid JSON. No project was changed.'); }
  return validateDocument(value);
}
export async function importFile(file: File) {
  if (file.size > MAX_JSON_BYTES) throw new Error('Project JSON exceeds the 20 MB import limit.');
  return parseDocument(await file.text());
}
export function exportDocument(doc: SettlementDocument) { downloadBlob(new Blob([serializeDocument(doc)],{type:'application/json'}),fileName(doc.name,'json')); }
