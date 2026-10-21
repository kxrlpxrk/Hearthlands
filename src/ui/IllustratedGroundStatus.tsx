import {useStudio} from './store';
import {illustratedGroundPlan} from '../rendering/illustratedGround';
import {useGroundSurface} from '../rendering/illustratedGroundSurface';
export function IllustratedGroundStatus(){
 const doc=useStudio(s=>s.present),state=useGroundSurface(illustratedGroundPlan(doc));
 return <p role="status" className="field-note">{state.error??(state.surface?'Continuous illustrated ground ready. Regional composition stays fixed while zooming.':'Preparing continuous ground; original terrain remains visible. You can keep exploring.')}</p>;
}
