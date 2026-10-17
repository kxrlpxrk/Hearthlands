import Dexie, { type Table } from 'dexie';
import { migrateDocument, type SettlementDocument } from '../model/document';
export interface ProjectRecord { id: string; name: string; updatedAt: number; revision: number }
export interface Snapshot { id: string; projectId: string; name: string; createdAt: number; document: SettlementDocument }
export type SnapshotSummary = Omit<Snapshot, 'document'> & { buildingCount: number };
interface Preference { key: string; value: string }
export class ProjectDatabase extends Dexie {
  documents!: Table<SettlementDocument, string>;
  projects!: Table<ProjectRecord, string>;
  snapshots!: Table<Snapshot, string>;
  preferences!: Table<Preference, string>;
  constructor(name = 'hearthlands') {
    super(name);
    this.version(1).stores({ documents: 'id' });
    this.version(2).stores({ documents: 'id', projects: 'id, updatedAt', snapshots: 'id, projectId, createdAt', preferences: 'key' }).upgrade(async tx => {
      const documents = await tx.table('documents').toArray();
      for (const doc of documents) await tx.table('projects').put({ id: doc.id, name: doc.name || 'Recovered settlement', revision: 0, updatedAt: Date.now() });
      if (documents.length) await tx.table('preferences').put({ key: 'activeProject', value: documents.find(d => d.id === 'hearthlands-local')?.id ?? documents[0].id });
    });
  }
}
export class SaveConflictError extends Error {
  constructor() { super('Project changed in another tab. Export your current edits before reloading; they were not overwritten.'); }
}
export class ProjectRepository {
  constructor(readonly db: ProjectDatabase) {}
  list() { return this.db.projects.orderBy('updatedAt').reverse().toArray(); }
  async load(id: string) {
    return this.db.transaction('r', this.db.projects, this.db.documents, async () => {
      const meta = await this.db.projects.get(id), doc = await this.db.documents.get(id);
      if (!meta || !doc) throw new Error('Project no longer exists. Your current edits remain in memory.');
      return { meta, document: migrateDocument(doc) };
    });
  }
  async create(document: SettlementDocument) {
    const copy = { ...structuredClone(document), id: crypto.randomUUID() };
    const meta: ProjectRecord = { id: copy.id, name: copy.name, revision: 0, updatedAt: Date.now() };
    await this.db.transaction('rw', this.db.projects, this.db.documents, async () => { await this.db.projects.add(meta); await this.db.documents.add(copy); });
    return { meta, document: copy };
  }
  async save(document: SettlementDocument, expectedRevision: number, projectId = document.id): Promise<number> {
    if(document.id!==projectId)throw new Error('Project identity changed during save; no document was overwritten.');
    return this.db.transaction('rw', this.db.projects, this.db.documents, async () => {
      const meta = await this.db.projects.get(document.id);
      if (!meta) throw new Error('Project was deleted. Export your edits to keep them.');
      if (meta.revision !== expectedRevision) throw new SaveConflictError();
      const revision = meta.revision + 1;
      await this.db.documents.put(structuredClone(document));
      await this.db.projects.put({ ...meta, name: document.name, updatedAt: Date.now(), revision });
      return revision;
    });
  }
  async remove(id: string) {
    await this.db.transaction('rw', this.db.projects, this.db.documents, this.db.snapshots, this.db.preferences, async () => {
      if ((await this.db.preferences.get('activeProject'))?.value === id) throw new Error('Open another project before deleting the active one.');
      await this.db.snapshots.where('projectId').equals(id).delete(); await this.db.documents.delete(id); await this.db.projects.delete(id);
    });
  }
  async activeId() { return (await this.db.preferences.get('activeProject'))?.value; }
  async setActive(id: string) {
    await this.db.transaction('rw', this.db.preferences, this.db.projects, async () => {
      if (!await this.db.projects.get(id)) throw new Error('Cannot open a deleted project.');
      await this.db.preferences.put({ key: 'activeProject', value: id });
    });
  }
  snapshotsFor(projectId: string) { return this.db.snapshots.where('projectId').equals(projectId).reverse().sortBy('createdAt'); }
  async snapshotSummaries(projectId: string): Promise<SnapshotSummary[]> {
    const summaries: SnapshotSummary[] = [];
    await this.db.snapshots.where('projectId').equals(projectId).each(snapshot => {
      const { document, ...meta } = snapshot; summaries.push({ ...meta, buildingCount: document.buildings.length });
    });
    return summaries.sort((a,b) => b.createdAt-a.createdAt || b.id.localeCompare(a.id));
  }
  async snapshot(projectId: string, name: string) {
    return this.db.transaction('rw', this.db.documents, this.db.projects, this.db.snapshots, async () => {
      const { document } = await this.load(projectId);
      const snapshot: Snapshot = { id: crypto.randomUUID(), projectId, name: name.trim() || 'Restore point', createdAt: Date.now(), document: structuredClone(document) };
      await this.db.snapshots.add(snapshot); return snapshot;
    });
  }
  async restore(projectId: string, snapshotId: string, expectedRevision: number) {
    return this.db.transaction('rw', this.db.documents, this.db.projects, this.db.snapshots, async () => {
      const snapshot = await this.db.snapshots.get(snapshotId);
      if (!snapshot || snapshot.projectId !== projectId) throw new Error('Restore point does not belong to this project.');
      const current = await this.load(projectId);
      if (current.meta.revision !== expectedRevision) throw new SaveConflictError();
      await this.db.snapshots.add({ id: crypto.randomUUID(), projectId, name: 'Automatic backup before restore', createdAt: Date.now(), document: structuredClone(current.document) });
      const document = { ...migrateDocument(structuredClone(snapshot.document)), id: projectId };
      const revision = await this.save(document, expectedRevision);
      return { document, revision };
    });
  }
}
export const repository = new ProjectRepository(new ProjectDatabase());
// Retain document helpers; writers must carry the revision they originally loaded.
export function saveDocument(doc: SettlementDocument, expectedRevision: number) { return repository.save(doc, expectedRevision); }
export async function loadDocument() { const id = await repository.activeId(); return id ? (await repository.load(id)).document : undefined; }
