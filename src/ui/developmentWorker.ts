import { useStudio } from './store';
import type { DevelopmentProposal } from '../generator/development';
let worker:Worker|null=null;
export function cancelDevelopment(){const s=useStudio.getState();if(s.development.applying)return;worker?.terminate();worker=null;s.setDevelopment({preview:null,base:null,busy:false,error:''});}
export function previewDevelopment(){
 const s=useStudio.getState(),dev=s.development,base=s.present;
 if(dev.districtId!==s.districtEditor.selectedId)throw new Error('Select this district again before developing it.');
 if(s.terrainEditor.pending||s.districtEditor.pending||s.districtEditor.detection||s.districtEditor.draft.length||s.infrastructure.draft.length)throw new Error('Finish or cancel other map drafts before development.');
 cancelDevelopment();s.setTool('pan');s.setDevelopment({busy:true,base,error:''});
 try{const task=new Worker(new URL('../generator/development.worker.ts',import.meta.url),{type:'module'});worker=task;
 task.onmessage=(event:MessageEvent<{proposal?:DevelopmentProposal;error?:string}>)=>{if(worker!==task)return;task.terminate();worker=null;const now=useStudio.getState();if(now.present!==base||!now.development.busy){now.setDevelopment({busy:false,base:null,error:'Project changed during generation. Generate a fresh preview.'});return;}now.setDevelopment({busy:false,preview:event.data.proposal??null,error:event.data.error??''});};
 task.onerror=()=>{if(worker!==task)return;task.terminate();worker=null;useStudio.getState().setDevelopment({busy:false,error:'Development worker failed. Project unchanged.'});};
 task.postMessage({doc:base,districtId:dev.districtId,settings:dev.settings});
 }catch(e){s.setDevelopment({busy:false,error:String(e)});}
}
