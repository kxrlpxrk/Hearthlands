import {afterEach,describe,expect,it,vi} from 'vitest';
import reference from '../../docs/screenshots/phase6c1b1/reference.json';
import {createDocument} from '../model/document';
import {legacyTerrain,terrainQuery} from '../model/terrain';
import {parseDocument,serializeDocument} from '../exports/json';
import {grasslandAssets} from '../assets/grassland/registry';
import {illustratedGroundPlan,groundAt,groundMaterialIds,groundSurfaceSize,groundGrain,groundDetailRegions} from './illustratedGround';
import {sampleMaterial,prepareGroundSurface,peekGroundSurface,groundSurfaceSvg} from './illustratedGroundSurface';
import {grasslandImages, type GrasslandSnapshot} from './grasslandImages';
import {grasslandClearance} from './grasslandGeometry';
import {terrainScene} from './scene';
import {mapSvg} from '../exports/png';
import {defaultVisualPreferences,readVisualPreferences,useVisualPreferences} from '../ui/visualPreferences';
import {useStudio} from '../ui/store';
const doc=()=>parseDocument(JSON.stringify(reference));
const all=grasslandAssets.map(a=>a.id),options={style:'illustrated' as const,detail:true,contours:true,grassland:'restrained' as const,grasslandAssets:all};
function field(){const d=createDocument();d.grid={...d.grid,width:96,height:96};d.seed=1847;for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(x<4)d.terrain.push({x,y,kind:'water'});else if(x>82)d.terrain.push({x,y,kind:'forest'});else if(x>48&&x<72)d.landscape.cells.push({...legacyTerrain({x,y}),elevation:3,rocks:.3});return d;}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();useVisualPreferences.setState({...defaultVisualPreferences,error:''});});
describe('6C.3 continuous illustrated countryside',()=>{
 it('is opt-in for old installations and persists without changing the document, IDs or history',()=>{
  expect(defaultVisualPreferences.ground63).toBe(false);expect(readVisualPreferences({getItem:()=>JSON.stringify({...defaultVisualPreferences,ground63:undefined})}).ground63).toBe(false);
  expect(readVisualPreferences({getItem:()=>JSON.stringify({...defaultVisualPreferences,ground63:'yes'})}).ground63).toBe(false);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const before=useStudio.getState(),bytes=serializeDocument(before.present);useVisualPreferences.getState().change({ground63:true});expect(readVisualPreferences(globalThis.localStorage).ground63).toBe(true);expect(useStudio.getState().present).toBe(before.present);expect(useStudio.getState().past).toBe(before.past);expect(serializeDocument(before.present)).toBe(bytes);
 });
 it('returns the exact 6C.2.1 scene with Off and leaves Planning and every forest path unchanged',()=>{
  const d=doc(),before=terrainScene(d,options),on=terrainScene(d,{...options,ground63:true});expect(terrainScene(d,{...options,ground63:false})).toBe(before);
  expect(on.filter(p=>!p.ground63)).toEqual(before.filter(p=>!p.grassland));expect(on.some(p=>p.grassland)).toBe(false);
  expect(terrainScene(d,{...options,style:'planning',ground63:true})).toBe(terrainScene(d,{...options,style:'planning'}));
  expect(mapSvg(d,{resolution:1024,grid:false,labels:false,style:'planning',ground63:true})).toBe(mapSvg(d,{resolution:1024,grid:false,labels:false,style:'planning'}));
 });
 it('reproduces region fields and strokes after JSON round trip, duplication and camera/detail changes',()=>{
  const d=doc(),bytes=serializeDocument(d),p=illustratedGroundPlan(d);expect(illustratedGroundPlan(d)).toBe(p);expect(illustratedGroundPlan({...d,id:'copy',name:'Copy'})).toBe(p);const restored=illustratedGroundPlan(parseDocument(bytes));expect(restored.values.every((v,i)=>v===p.values[i])).toBe(true);expect(restored.detail).toEqual(p.detail);expect(serializeDocument(d)).toBe(bytes);
  expect(illustratedGroundPlan({...d,seed:1848}).values).not.toEqual(p.values);
  for(const reduced of [false,true])expect(terrainScene(d,{...options,ground63:true,reduced}).find(p=>p.ground63)?.ground63).toEqual(p);
 });
 it('keeps every interpolated positive sample clear of water, forest, fields, buildings and infrastructure',()=>{
  const d=doc(),p=illustratedGroundPlan(d),q=terrainQuery(d),clear=grasslandClearance(d);let coloured=0;
  for(let y=.13;y<96;y+=.37)for(let x=.17;x<96;x+=.37){const sample=groundAt(p,x,y);if(sample[0]>.001){coloured++;expect(clear({x,y})).toBeGreaterThan(.3);const t=q.at({x,y});expect(t.water).toBe(0);expect(t.vegetation).toBeLessThan(.2);expect(t.ground).toBe('grass');}}
  expect(coloured).toBeGreaterThan(3000);
 });
 it('uses all six stable material IDs and restricts damp and rocky regions to suitable land',()=>{
  expect(Object.values(groundMaterialIds).sort()).toEqual([...all].sort());const d=field(),p=illustratedGroundPlan(d);const seen=new Array(6).fill(0);
  for(let y=1;y<95;y++)for(let x=1;x<95;x++){const v=groundAt(p,x,y);if(!v[0])continue;seen[0]++;for(let m=1;m<6;m++)if(v[m+4]>.01)seen[m]++;if(v[9]>.01)expect(x).toBeLessThan(10);if(v[8]>.01)expect(x).toBeGreaterThan(47);}
  expect(seen.every(v=>v>0)).toBe(true);
 });
 it('offers connected country coverage, multiscale colour variation and quieter village regions',()=>{
  const d=doc(),p=illustratedGroundPlan(d);let eligible=0,coloured=0;const clear=grasslandClearance(d),colours=new Set<number>();
  for(let y=1;y<95;y++)for(let x=1;x<95;x++){const c=clear({x,y}),v=groundAt(p,x,y);if(c>2){eligible++;if(v[0]>.99)coloured++;colours.add(Math.round(v[1]));}}
  expect(coloured/eligible).toBeGreaterThan(.95);expect(colours.size).toBeGreaterThan(12);expect(groundAt(p,60,38)[4]).toBeGreaterThan(groundAt(p,58,30)[4]);expect(p.detail.every(p=>p.data.includes('q'))).toBe(true);
 });
 it('interpolates colour premultiplied so protected edges cannot introduce a black matte',()=>{
  const p=illustratedGroundPlan(field());let tested=0;for(let y=.13;y<95;y+=.73)for(let x=.17;x<95;x+=.73){const v=groundAt(p,x,y);if(v[0]>0&&v[0]<1){tested++;expect(v[1]).toBeGreaterThan(115);expect(v[2]).toBeGreaterThan(135);expect(v[3]).toBeGreaterThan(70);}}expect(tested).toBeGreaterThan(20);
 });
 it('blends source edges continuously without changing a constant source palette',()=>{
  const pixels=new Uint8ClampedArray(8*8*4);for(let i=0;i<pixels.length;i+=4)pixels.set([85,180,65,255],i);const out=new Float32Array(3);
  for(let x=-20;x<=20;x+=.03){expect(sampleMaterial({width:8,data:pixels},x,4,.4,.7,out)).toBeGreaterThan(0);expect(Array.from(out)).toEqual([85,180,65]);}
  expect(groundGrain(1847,1,2)).toBe(groundGrain(1847,1,2));expect(groundGrain(1848,1,2)).not.toBe(groundGrain(1847,1,2));
 });
 it('keeps fine grass geometry in the shared world plan rather than rebuilding it while zooming',()=>{const p=illustratedGroundPlan(doc());expect(p.detail.length).toBe(3);expect(p.detail.every(d=>d.chunks.length>0&&d.chunks.map(c=>c.data).join('').length===d.data.length)).toBe(true);expect(illustratedGroundPlan(doc()).detail).toEqual(p.detail);});
 it.each([96,128,192])('bounds %s² surface memory and retains camera-independent cache hits',size=>{
  const d=createDocument();d.grid={...d.grid,width:size,height:size};const t=performance.now(),p=illustratedGroundPlan(d),s=groundSurfaceSize(p);expect(illustratedGroundPlan({...d})).toBe(p);expect(s.width).toBeLessThanOrEqual(3072);expect(s.width*s.height*4).toBeLessThanOrEqual(36*1024*1024);expect(p.values.length*4).toBeLessThan(7.2*1024*1024);
  for(const res of [1024,2048,4096]){const e=groundSurfaceSize(p,res/size,true);expect(e.width).toBeLessThanOrEqual(res);expect(e.width).toBeLessThanOrEqual(4096);}
  console.log(`Ground 6C.3 ${size}² plan ${(performance.now()-t).toFixed(1)}ms; ${(s.width*s.height*4/1024/1024).toFixed(1)}MiB image`);
 });
 it('shares bounded prepared surfaces and embeds the actual surface in output-density SVG',async()=>{
  const d=createDocument();d.grid={...d.grid,width:16,height:16};const p=illustratedGroundPlan(d),empty:GrasslandSnapshot={status:'ready',ready:[],failed:all,images:new Map()};vi.spyOn(grasslandImages,'prepare').mockResolvedValue(empty);
  vi.stubGlobal('document',{createElement:()=>{const canvas={width:0,height:0,getContext:()=>({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:vi.fn()}),toDataURL:()=> 'data:image/png;base64,AAAA'};return canvas;}});
  const a=prepareGroundSurface(p,24);expect(prepareGroundSurface(p,24)).toBe(a);const s=await a;expect(s.canvas.width).toBe(256);expect(s.bytes).toBe(256*256*4);expect(peekGroundSurface(p,24)).toBe(s);
  await prepareGroundSurface(p,32,true);const svg=groundSurfaceSvg(p,32);expect(svg).toContain('data-illustrated-ground="6C.3"');expect(svg).toContain(s.source);expect(svg).not.toContain('<path');expect(svg).not.toContain('http');expect(groundSurfaceSvg(p,32,true)).toBe(svg);
  expect(groundSurfaceSvg(p,8)).toContain('data-ground-fallback');
 });
 it('bounds idle close-view regions and never changes the source plan when requesting sharper views',()=>{
  const p=illustratedGroundPlan(doc()),view={x:40,y:20,width:30,height:35};expect(groundDetailRegions(p,view,12)).toEqual([]);const regions=groundDetailRegions(p,view,48);expect(regions.length).toBeLessThanOrEqual(9);expect(regions.every(r=>r.x>=0&&r.y>=0&&r.x+r.width<=p.width&&r.y+r.height<=p.height)).toBe(true);expect(groundDetailRegions(p,view,96)).toEqual(regions);expect(groundDetailRegions(p,{x:-100,y:-100,width:10,height:10},48)).toEqual([]);
 });
 it('reports allocation failures without changing project state',async()=>{
  const d=createDocument();d.seed=3;d.grid={...d.grid,width:16,height:16};const bytes=serializeDocument(d);vi.spyOn(grasslandImages,'prepare').mockResolvedValue({status:'ready',ready:[],failed:all,images:new Map()});vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>null})});
  await expect(prepareGroundSurface(illustratedGroundPlan(d))).rejects.toThrow('cache unavailable');expect(serializeDocument(d)).toBe(bytes);
 });
});
