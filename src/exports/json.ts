import type { SettlementDocument } from '../model/document';
export function exportDocument(doc: SettlementDocument) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${doc.name || 'settlement'}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
