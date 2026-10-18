import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { actionDestination } from './ActionDock';
import { DistrictActions } from './DistrictPanel';
import { useStudio } from './store';
import { createDocument } from '../model/document';
// Read the live store during server-rendered component assertions, rather than its boot snapshot.
vi.mock('./store',async importOriginal=>{
 const original=await importOriginal<typeof import('./store')>(),real=original.useStudio;
 const live=Object.assign((selector?:(state:ReturnType<typeof real.getState>)=>unknown)=>selector?selector(real.getState()):real.getState(),real);
 return {...original,useStudio:live};
});
afterEach(()=>useStudio.getState().restore(createDocument()));
describe('shared action placement',()=>{
 it('routes mobile and landscape actions inside either open sheet, otherwise to the map',()=>{expect(actionDestination(true,'library')).toBe('library');expect(actionDestination(true,'properties')).toBe('properties');expect(actionDestination(true,null)).toBe('map');for(const panel of ['library','properties',null] as const)expect(actionDestination(false,panel)).toBe('map');});
 it('hides passive district selection without hiding active edit or camera controls',()=>{const s=useStudio.getState();s.setTool('districts');s.setDistrictEditor({mode:'select',camera:false,pending:null,detection:null,draft:[]});expect(renderToStaticMarkup(<DistrictActions/>)).toBe('');s.setDistrictEditor({mode:'polygon',draft:[{x:1,y:1},{x:4,y:1},{x:4,y:4}]});const editing=renderToStaticMarkup(<DistrictActions/>);expect(editing).toContain('Preview district boundary');expect(editing).toContain('Cancel district edit');s.setDistrictEditor({mode:'select',draft:[],camera:true});expect(renderToStaticMarkup(<DistrictActions/>)).toContain('Cancel district edit');});
 it('keeps confirmation and cancellation available for operation previews',()=>{const s=useStudio.getState();s.setDistrictEditor({mode:'select',camera:false,pending:{id:'preview',name:'Draft',layerId:'settlement',color:'#abcdef',cells:[{x:1,y:1}]}});const html=renderToStaticMarkup(<DistrictActions/>);expect(html).toContain('Confirm district edit');expect(html).toContain('Cancel district edit');expect(s.present.districts).toEqual([]);});
});
