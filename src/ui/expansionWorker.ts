import { useStudio } from './store';
import type { ExpansionProposal } from '../generator/expansion';
let worker:Worker|null=null,timer:ReturnType<typeof setTimeout>|undefined;
export function cancelExpansion(){const s=useStudio.getState();if(s.expansion.applying)return;worker?.terminate();worker=null;clearTimeout(timer);s.setExpansion({preview:null,base:null,busy:false,error:'',progress:'Cancelled. Original settlement unchanged.'});}
export function previewExpansion(){
 const s=useStudio.getState(),base=s.present,settings=s.expansion.settings;
 if(s.expansion.applying)throw new Error('Expansion acceptance is already in progress.');
 if(s.development.preview||s.development.busy||s.development.applying||s.terrainEditor.pending||s.districtEditor.pending||s.districtEditor.detection||s.districtEditor.draft.length||s.infrastructure.draft.length)throw new Error('Finish or cancel other map drafts first.');
 cancelExpansion();s.setTool('pan');s.setExpansion({busy:true,base,error:'',progress:'Surveying protected land and existing roads…'});
 try{const task=new Worker(new URL('../generator/expansion.worker.ts',import.meta.url),{type:'module'});worker=task;
 timer=setTimeout(()=>{if(worker===task){cancelExpansion();useStudio.getState().setExpansion({error:'Expansion exceeded the 60-second limit. Try a smaller target. Original project unchanged.'});}},60000);
 task.onmessage=(event:MessageEvent<{proposal?:ExpansionProposal;error?:string;progress?:string}>)=>{if(worker!==task)return;const now=useStudio.getState();if(now.present!==base||!now.expansion.busy){cancelExpansion();now.setExpansion({error:'Project changed during planning. Generate a fresh preview.'});return;}if(event.data.progress){now.setExpansion({progress:event.data.progress});return;}task.terminate();worker=null;clearTimeout(timer);now.setExpansion({busy:false,preview:event.data.proposal??null,error:event.data.error??'',progress:'Expansion preview ready'});};
 task.onerror=()=>{if(worker!==task)return;cancelExpansion();useStudio.getState().setExpansion({error:'Expansion worker failed. Original settlement unchanged.'});};task.postMessage({doc:base,settings});
 }catch(error){cancelExpansion();s.setExpansion({error:String(error)});}
}
