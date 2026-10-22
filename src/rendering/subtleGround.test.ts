import {afterEach,describe,expect,it,vi} from 'vitest';
import reference from '../../docs/screenshots/phase6c1b1/reference.json';
import {parseDocument,serializeDocument} from '../exports/json';
import {mapSvg} from '../exports/png';
import {createDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {footprint} from '../model/buildings';
import {terrainScene} from './scene';
import {subtleGround} from './subtleGround';
import {grasslandClearance} from './grasslandGeometry';
import {groundMode,groundUsesImages,subtleOpacity} from './groundDetail';
import {readVisualPreferences,defaultVisualPreferences,useVisualPreferences} from '../ui/visualPreferences';
import {useStudio} from '../ui/store';
const doc=()=>parseDocument(JSON.stringify(reference));
const base={style:'illustrated' as const,contours:true,detail:true};
afterEach(()=>{vi.unstubAllGlobals();useVisualPreferences.setState({...defaultVisualPreferences,error:''});});
describe('6C.3.1 flat, subtle and rich ground',()=>{
 it('preserves existing Rich, Flat and older meadow settings without silently opting users in',()=>{
  for(const o of [{ground63:true,grassland:'off'},{ground63:false,grassland:'off'},{ground63:false,grassland:'accents'}]){
   const p=readVisualPreferences({getItem:()=>JSON.stringify({...defaultVisualPreferences,...o})});expect(p.groundDetail).toBeUndefined();expect(groundMode(p)).toBe(o.ground63?'rich':'legacy');expect(p.grassland).toBe(o.grassland);
  }
  for(const mode of ['flat','subtle','rich'] as const){const p=readVisualPreferences({getItem:()=>JSON.stringify({...defaultVisualPreferences,groundDetail:mode})});expect(groundMode(p)).toBe(mode);}
  expect(groundMode({groundDetail:'flat',ground63:true})).toBe('flat');expect(groundUsesImages({groundDetail:'subtle',ground63:true,grassland:'accents'})).toBe(false);
 });
 it('persists mode changes without editing projects or undo history',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});const before=useStudio.getState(),bytes=serializeDocument(before.present);
  useVisualPreferences.getState().change({groundDetail:'subtle',ground63:false});expect(readVisualPreferences(globalThis.localStorage).groundDetail).toBe('subtle');expect(useStudio.getState().present).toBe(before.present);expect(useStudio.getState().past).toBe(before.past);expect(serializeDocument(before.present)).toBe(bytes);
 });
 it('keeps Flat identical to original terrain, Rich identical to 6C.3, and all forests and Planning unchanged',()=>{
  const d=doc(),flat=terrainScene(d,{...base,groundDetail:'flat'}),old=terrainScene(d,base),rich=terrainScene(d,{...base,groundDetail:'rich'}),subtle=terrainScene(d,{...base,groundDetail:'subtle'});
  expect(flat).toEqual(old);expect(rich).toEqual(terrainScene(d,{...base,ground63:true}));expect(subtle.filter(p=>!p.subtle)).toEqual(flat);expect(subtle.some(p=>p.grassland||p.ground63)).toBe(false);
  for(const groundDetail of ['flat','subtle','rich'] as const)expect(terrainScene(d,{...base,style:'planning',groundDetail})).toBe(terrainScene(d,{...base,style:'planning'}));
 });
 it('repeats accents after reload/JSON/duplication without modifying terrain, objects or seed',()=>{
  const d=doc(),bytes=serializeDocument(d),a=subtleGround(d);expect(subtleGround(d)).toBe(a);expect(subtleGround({...d,id:'duplicate',name:'Copy'})).toBe(a);expect(subtleGround(parseDocument(bytes))).toEqual(a);expect(subtleGround({...d,seed:d.seed+1})).not.toEqual(a);expect(serializeDocument(d)).toBe(bytes);
  console.log(`Ravenfjord subtle: ${a.accents.length} small accents in ${a.paths.length} batches; kinds ${[...new Set(a.accents.map(a=>a.kind))].join(',')}; fringe focus`,a.accents.find(a=>a.x>40&&a.x<70));
  expect(a.accents.length).toBeGreaterThan(10);expect(a.paths.length).toBeLessThanOrEqual(4);
 });
 it('protects complete accent envelopes, locked structures, entrances, roads, water, forests and cultivated land',()=>{
  const d=doc(),a=subtleGround(d),clear=grasslandClearance(d),q=terrainQuery(d);
  for(const p of a.accents){expect(p.radius).toBeLessThan(clear(p));for(let angle=0;angle<Math.PI*2;angle+=.2){const point={x:p.x+Math.cos(angle)*p.radius,y:p.y+Math.sin(angle)*p.radius},t=q.at(point);expect(t.water).toBe(0);expect(t.vegetation).toBeLessThan(.2);expect(t.ground).toBe('grass');}
   for(const b of d.buildings){const f=footprint(b),distance=Math.hypot(Math.max(b.x-p.x,0,p.x-b.x-f.width),Math.max(b.y-p.y,0,p.y-b.y-f.height));expect(distance).toBeGreaterThanOrEqual(5);}
  }
 });
 it('has very low coverage, no stamp circles, and minimum spacing without placement rows',()=>{
  const d=doc(),a=subtleGround(d).accents;expect(a.length*Math.PI*.55*.55/(96*96)).toBeLessThan(.035);
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)expect(Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y)).toBeGreaterThanOrEqual(2.4);
  expect(new Set(a.map(a=>a.x%1)).size).toBe(a.length);expect(a.every(a=>a.radius<.6&&!a.data.includes('image'))).toBe(true);
 });
 it('uses smooth density-only opacity and identical shared SVG geometry at all PNG resolutions',()=>{
  const d=doc(),a=subtleGround(d);expect(subtleOpacity(32*.11)).toBe(0);expect(subtleOpacity(32*.4)).toBe(1);let last=0;for(let p=0;p<64;p+=.01){const v=subtleOpacity(p);expect(v).toBeGreaterThanOrEqual(last);expect(v-last).toBeLessThan(.002);last=v;}
  for(const resolution of [1024,2048,4096]){const svg=mapSvg(d,{resolution,style:'illustrated',groundDetail:'subtle',grid:false,labels:false});expect(svg).toContain('data-subtle-ground');expect(svg).not.toContain('data-illustrated-ground="6C.3"');expect(svg).not.toContain('data-grassland-asset=');for(const p of a.paths)expect(svg).toContain(p.data);}
  const flat=mapSvg(d,{resolution:1024,style:'illustrated',groundDetail:'flat',grid:false,labels:false});expect(flat).not.toContain('data-subtle-ground');
 });
 it.each([96,128,192])('bounds %s²/100-building geometry and reuses it during camera changes',size=>{
  const d=createDocument();d.grid={...d.grid,width:size,height:size};d.buildings=Array.from({length:100},(_,i)=>({id:`home-${i}`,kind:'cottage' as const,name:'Home',x:12+i%10*5,y:12+Math.floor(i/10)*5,width:2,height:2,rotation:0,locked:true,layerId:'settlement'}));
  const t=performance.now(),a=subtleGround(d);for(let i=0;i<50;i++)expect(subtleGround(d)).toBe(a);expect(a.paths.length).toBeLessThanOrEqual(4);expect(a.accents.length).toBeLessThan(size*size*.04);console.log(`Subtle ${size}² /100: ${(performance.now()-t).toFixed(1)}ms +50 cache hits, ${a.accents.length} accents /${a.paths.length} batches`);
 });
});
