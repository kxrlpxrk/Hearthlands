import Dexie, { type EntityTable } from 'dexie';
import type { SettlementDocument } from '../model/document';
const db = new Dexie('hearthlands') as Dexie & { documents: EntityTable<SettlementDocument, 'id'> };
db.version(1).stores({ documents: 'id' });
export const saveDocument = (doc: SettlementDocument) => db.documents.put(doc);
export const loadDocument = () => db.documents.get('hearthlands-local');
