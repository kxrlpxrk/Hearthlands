import { applyDevelopment, type DevelopmentProposal } from '../generator/development';
import { createDocument, type SettlementDocument } from '../model/document';
import { useStudio } from '../ui/store';
import { Autosave, type SaveState } from './autosave';
import { repository } from './database';
/** Project transitions flush the current writer before installing a new document/session. */
class ProjectSession {
  private saver?: Autosave;
  private projectId?: string;
  private unsubscribe?: () => void;
  private suppress = false;
  private transitioning = false;
  private initializing?: Promise<void>;
  private state: SaveState = {phase:'saving',message:'Opening local projects…'};
  private announce(state: SaveState) { this.state=state;this.listener(state); }
  private listener: (state: SaveState) => void = () => {};
  connect(listener: (state: SaveState) => void) { this.listener = listener; listener(this.state); return () => { if(this.listener===listener)this.listener = () => {}; }; }
  get dirty() { return this.saver?.dirty ?? false; }
  private install(document: SettlementDocument, revision: number) {
    this.saver?.dispose(); this.unsubscribe?.(); this.suppress = true;
    useStudio.getState().restore(document); this.suppress = false;
    this.projectId = document.id;
    this.saver = new Autosave(revision, (doc, rev) => repository.save(doc, rev, document.id), state => this.announce(state));
    this.unsubscribe = useStudio.subscribe((state, previous) => { if (!this.suppress && state.present.id === document.id && state.present !== previous.present) this.saver!.schedule(state.present); });
    this.announce({ phase: 'saved', message: 'Saved on this device' });
  }
  initialize() {
    if (this.saver) return Promise.resolve();
    return this.initializing ??= this.boot().finally(() => { this.initializing = undefined; });
  }
  private async boot() {
    const id = await repository.activeId(), all = await repository.list();
    const record = id && all.some(p => p.id === id) ? await repository.load(id) : all.length ? await repository.load(all[0].id) : await repository.create(createDocument());
    await repository.setActive(record.document.id); this.install(record.document, record.meta.revision);
  }
  async flush() {
    if (!this.saver) {
      // Storage recovery creates a separate project; it never overwrites an unread legacy save.
      const record = await repository.create(useStudio.getState().present);
      await repository.setActive(record.document.id); this.install(record.document, record.meta.revision); return;
    }
    if(useStudio.getState().present.id!==this.projectId)throw new Error('Project session changed. Open the project through Projects before saving.');
    await this.saver.flush();
  }
  private async transition<T>(action: () => Promise<T>): Promise<T> {
    if(useStudio.getState().development.preview||useStudio.getState().development.busy||useStudio.getState().development.applying)throw new Error('Accept or cancel the development preview before changing projects or restore points.');
    const districts=useStudio.getState().districtEditor;
    if(districts.pending||districts.detection||districts.draft.length)throw new Error('Confirm or cancel the district preview before changing projects or restore points. District previews are not saved.');
    if(useStudio.getState().terrainEditor.pending)throw new Error('Apply or cancel the terrain preview before switching projects, renaming, generating or restoring. The preview is not saved.');
    if (this.transitioning) throw new Error('A project operation is already in progress.');
    this.transitioning = true;
    try { await this.flush(); return await action(); } finally { this.transitioning = false; }
  }
  open(id: string) { return this.transition(async () => { const record = await repository.load(id); await repository.setActive(id); this.install(record.document, record.meta.revision); }); }
  create(doc: SettlementDocument = createDocument()) { return this.transition(async () => { const record = await repository.create(doc); await repository.setActive(record.document.id); this.install(record.document, record.meta.revision); }); }
  duplicate(id: string) { return this.transition(async () => { const record = await repository.load(id); return repository.create({ ...record.document, name: `${record.document.name} copy` }); }); }
  rename(id: string, name: string) { return this.transition(async () => {
    if (useStudio.getState().present.id === id) { useStudio.getState().edit(d => ({ ...d, name })); await this.flush(); }
    else { const record = await repository.load(id); await repository.save({ ...record.document, name }, record.meta.revision); }
  }); }
  remove(id: string) { return this.transition(async () => {
    if (useStudio.getState().present.id === id) {
      const other = (await repository.list()).find(p => p.id !== id);
      const record = other ? await repository.load(other.id) : await repository.create(createDocument());
      await repository.setActive(record.document.id); this.install(record.document, record.meta.revision);
    }
    await repository.remove(id);
  }); }
  snapshot(name: string) { return this.transition(() => repository.snapshot(useStudio.getState().present.id, name)); }
  restore(snapshotId: string) { return this.transition(async () => {
    const id = useStudio.getState().present.id;
    const restored = await repository.restore(id, snapshotId, this.saver!.revision);
    this.install(restored.document, restored.revision);
  }); }
  async develop(proposal:DevelopmentProposal,confirmed=false){
    const state=useStudio.getState(),base=state.present;
    if(this.transitioning||state.development.applying)throw new Error('A project operation is already in progress.');
    if(state.terrainEditor.pending||state.districtEditor.pending||state.districtEditor.detection||state.districtEditor.draft.length)throw new Error('Finish or cancel other map previews first.');
    const next=applyDevelopment(base,proposal,confirmed);
    this.transitioning=true;state.setDevelopment({applying:true,error:''});
    try{
      await this.flush();
      if(useStudio.getState().present!==base)throw new Error('Project changed before backup. Generate another preview.');
      const district=base.districts.find(d=>d.id===proposal.districtId)!;
      await repository.snapshot(base.id,`Automatic backup before district development · ${district.name}`);
      if(useStudio.getState().present!==base)throw new Error('Project changed during backup. No development applied.');
      useStudio.getState().acceptDevelopment(base,next);
      await this.flush();
    }finally{this.transitioning=false;useStudio.getState().setDevelopment({applying:false});}
  }
  replace(doc: SettlementDocument) { return this.transition(async () => {
    const id = useStudio.getState().present.id;
    await repository.snapshot(id, 'Automatic backup before generated replacement');
    useStudio.getState().edit(() => ({ ...doc, id })); await this.flush();
  }); }
}
export const projectSession = new ProjectSession();
