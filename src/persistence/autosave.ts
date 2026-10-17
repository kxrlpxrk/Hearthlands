import type { SettlementDocument } from '../model/document';
export interface SaveState { phase: 'saving' | 'saved' | 'error'; message: string }
/** One serialized writer per project session, with latest-edit coalescing and CAS revisions. */
export class Autosave {
  private pending?: SettlementDocument;
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  constructor(public revision: number, private write: (doc: SettlementDocument, revision: number) => Promise<number>, private announce: (state: SaveState) => void, private delay = 650) {}
  get dirty() { return !!this.pending || !!this.running; }
  schedule(doc: SettlementDocument) {
    if (this.disposed) return;
    this.pending = doc;
    this.announce({ phase: 'saving', message: 'Saving…' });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.pending) return this.flush(); return; }
    if (!this.pending || this.disposed) return;
    const work = async () => {
      while (this.pending && !this.disposed) {
        const doc = this.pending; this.pending = undefined;
        try { this.revision = await this.write(doc, this.revision); }
        catch (error) {
          this.pending ??= doc;
          this.announce({ phase: 'error', message: `Save error: ${error instanceof Error ? error.message : 'Storage write failed.'} Use Export to keep a file copy, then retry Save.` });
          throw error;
        }
      }
      this.announce({ phase: 'saved', message: 'Saved on this device' });
    };
    this.running = work();
    try { await this.running; } finally { this.running = undefined; }
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
