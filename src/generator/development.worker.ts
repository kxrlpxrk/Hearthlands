import { developDistrict, type DevelopmentSettings } from './development';
import type { SettlementDocument } from '../model/document';
self.onmessage=(event:MessageEvent<{doc:SettlementDocument;districtId:string;settings:DevelopmentSettings}>)=>{
 try{self.postMessage({proposal:developDistrict(event.data.doc,event.data.districtId,event.data.settings)});}catch(e){self.postMessage({error:e instanceof Error?e.message:'District development failed.'});}
};
