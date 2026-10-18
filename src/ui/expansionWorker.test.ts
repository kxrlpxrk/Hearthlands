import {afterEach,describe,it,expect,vi} from 'vitest';
import {useStudio} from './store';
import {createDocument} from '../model/document';
import {cancelExpansion,previewExpansion} from './expansionWorker';
class FakeWorker {static last:FakeWorker;onmessage?: (event:{data:unknown})=>void;onerror?:()=>void;terminated=false;postMessage=vi.fn();constructor(){FakeWorker.last=this;}terminate(){this.terminated=true;} }
afterEach(()=>{cancelExpansion();vi.unstubAllGlobals();vi.useRealTimers();useStudio.getState().restore(createDocument());});
describe('bounded expansion workers',()=>{
 it('reports progress, never changes the source, and ignores results after cancellation',()=>{vi.stubGlobal('Worker',FakeWorker);const base=useStudio.getState().present;previewExpansion();const worker=FakeWorker.last;worker.onmessage?.({data:{progress:'Surveying roads'}});expect(useStudio.getState().expansion.progress).toBe('Surveying roads');cancelExpansion();expect(worker.terminated).toBe(true);worker.onmessage?.({data:{proposal:{id:'late'}}});expect(useStudio.getState().expansion.preview).toBeNull();expect(useStudio.getState().present).toBe(base);});
 it('rejects a stale source and terminates runaway work after sixty seconds',()=>{vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker);previewExpansion();useStudio.getState().edit(d=>({...d,name:'Edited'}));FakeWorker.last.onmessage?.({data:{progress:'Old progress'}});expect(useStudio.getState().expansion.error).toContain('changed');previewExpansion();vi.advanceTimersByTime(60000);expect(FakeWorker.last.terminated).toBe(true);expect(useStudio.getState().expansion.busy).toBe(false);expect(useStudio.getState().expansion.error).toContain('60-second');});
 it('blocks concurrent district development previews and preserves approval state while applying',()=>{vi.stubGlobal('Worker',FakeWorker);useStudio.getState().setDevelopment({busy:true});expect(()=>previewExpansion()).toThrow('other map drafts');useStudio.getState().setDevelopment({busy:false});previewExpansion();useStudio.getState().setExpansion({applying:true});cancelExpansion();expect(FakeWorker.last.terminated).toBe(false);useStudio.getState().setExpansion({applying:false});});
});
