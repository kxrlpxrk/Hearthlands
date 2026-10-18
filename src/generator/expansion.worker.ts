import { expandSettlement } from './expansion';
self.onmessage=event=>{try{const proposal=expandSettlement(event.data.doc,event.data.settings,progress=>self.postMessage({progress}));self.postMessage({proposal});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
