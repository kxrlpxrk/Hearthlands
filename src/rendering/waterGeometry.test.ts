import {describe,it,expect} from 'vitest';
import reference from '../../docs/screenshots/phase6c1b1/reference.json';
import {createDocument} from '../model/document';
import {terrainQuery} from '../model/terrain';
import {parseDocument,serializeDocument} from '../exports/json';
import {mapSvg} from '../exports/png';
import {illustratedWater,waterBase,waterSvg} from './waterGeometry';
import {terrainScene} from './scene';
import {terrainGeometry} from './terrainGeometry';
function map(size=24,wet=(x:number,y:number)=>x>12){const d=createDocument();d.grid={...d.grid,width:size,height:size};d.terrain=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(wet(x,y))d.terrain.push({x,y,kind:'water'});return d;}
const area=(a:readonly {x:number;y:number}[])=>a.reduce((s,p,i)=>{const q=a[(i+1)%a.length];return s+p.x*q.y-q.x*p.y;},0)/2;
describe('6C.4 shared illustrated water',()=>{
 it('preserves the previous release Planning geometry exactly with every detail setting',()=>{
  const d=parseDocument(JSON.stringify(reference)),hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);};
  // Baselines measured from the committed 6C.3.1 renderer before the water change.
  for(const [detail,reduced,expected]of [[false,false,'f0e498b4'],[false,true,'f0e498b4'],[true,false,'67da37c'],[true,true,'b09247f2']] as const)expect(hash(JSON.stringify(terrainGeometry(d,{style:'planning',detail,reduced,contours:true})))).toBe(expected);
 });
 it('handles dry maps, ponds, rivers, sea edges and islands without lost contours',()=>{
  const scenes=[map(24,()=>false),map(24,()=>true),map(24,(x,y)=>Math.hypot(x-12,y-12)<3),map(24,(x,y)=>Math.abs(x-12-Math.sin(y/4)*3)<2),map(),map(24,(x,y)=>Math.hypot(x-12,y-12)>4)];
  for(const d of scenes){const s=illustratedWater(d);expect(s.fallback).toBe(false);expect(s.mask).not.toMatch(/NaN|Infinity/);for(const loop of s.loops)for(const p of loop){expect(p.x).toBeGreaterThanOrEqual(0);expect(p.y).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(24);expect(p.y).toBeLessThanOrEqual(24);}}
  expect(illustratedWater(scenes[0]).mask).toBe('');expect(illustratedWater(scenes[1]).shore).toBe('');expect(illustratedWater(scenes[2]).loops.length).toBe(1);expect(illustratedWater(scenes[5]).loops.some(l=>area(l)<0)).toBe(true);
 });
 it('preserves tiny and fractionally brushed water and damp banks deterministically',()=>{
  const d=map(24,()=>false);d.landscape={...d.landscape,cells:[{x:6,y:6,elevation:0,ground:'grass',water:1,vegetation:0,rocks:0},{x:7,y:6,elevation:0,ground:'grass',water:.6,vegetation:.3,rocks:0},{x:8,y:6,elevation:0,ground:'grass',water:.25,vegetation:.2,rocks:0}]};const a=illustratedWater(d);expect(a.mask).not.toBe('');expect(a.fallback).toBe(false);expect(illustratedWater(parseDocument(serializeDocument(d)))).toEqual(a);expect(a.mask).toContain('Q');
 });
 it('keeps complete topology in varied masks, checkerboards and narrow diagonal channels',()=>{
  for(let seed=0;seed<12;seed++){const d=map(24,(x,y)=>seed===0?(x+y)%2===0:Math.sin(x*(seed+1)+y*9)>.1);d.seed=seed;const s=illustratedWater(d);expect(s.fallback,`seed ${seed}`).toBe(false);expect(s.mask).not.toMatch(/NaN|Infinity/);expect(s.loops.length).toBeGreaterThan(0);}
 });
 it('reuses immutable geometry across camera/reduced-detail states, reload and project duplication',()=>{
  const d=parseDocument(JSON.stringify(reference)),before=serializeDocument(d),a=illustratedWater(d);expect(a.fallback).toBe(false);expect(illustratedWater(d)).toBe(a);expect(illustratedWater({...d,id:'duplicate'})).toBe(a);expect(illustratedWater(parseDocument(before))).toEqual(a);expect(illustratedWater({...d,seed:d.seed+1}).paints).not.toEqual(a.paints);
  for(const reduced of [false,true])for(const groundDetail of ['flat','subtle','rich'] as const){const paths=terrainScene(d,{style:'illustrated',detail:true,contours:true,reduced,groundDetail});expect(paths.find(p=>p.water)?.water).toEqual(a);expect(paths.filter(p=>p.water).length).toBe(1);}expect(serializeDocument(d)).toBe(before);
 });
 it('keeps highlights in water and away from bridges, structures and banks',()=>{
  const d=map(40,()=>true);d.buildings=[{id:'dock',kind:'harbour',name:'Dock',x:10,y:10,width:4,height:2,rotation:0,locked:true,layerId:'settlement'}];d.roads=[{id:'bridge',points:[{x:0,y:20},{x:40,y:20}],surface:'wooden-bridge',layerId:'settlement',editVersion:1,width:1,locked:true}];const s=illustratedWater(d),q=terrainQuery(d);expect(s.highlights.length).toBeGreaterThan(0);for(const p of s.highlights){expect(q.water(p)).toBe(true);expect(Math.abs(p.y-20)).toBeGreaterThan(2);expect(p.x<9.2||p.x>14.8||p.y<9.2||p.y>12.8).toBe(true);}expect(illustratedWater(d,false).highlights).toEqual([]);expect(illustratedWater(d,false).mask).toBe(s.mask);
 });
 it('exports exact shared water paths at all resolutions beneath roads and buildings, without touching Planning',()=>{
  const d=parseDocument(JSON.stringify(reference)),before=serializeDocument(d),s=illustratedWater(d),water=waterSvg(s);for(const resolution of [1024,2048,4096]){const svg=mapSvg(d,{resolution,style:'illustrated',groundDetail:'subtle',grid:false,labels:false});expect(svg).toContain(water);expect(svg).toContain(waterBase);expect(svg.indexOf('data-illustrated-water')).toBeLessThan(svg.indexOf('data-building='));for(const p of s.paints)expect(svg).toContain(p.data);}
  const planning=mapSvg(d,{resolution:1024,style:'planning',grid:false,labels:false});expect(planning).not.toContain('data-illustrated-water');expect(planning).not.toContain('illustrated-water-mask');expect(serializeDocument(d)).toBe(before);
 });
 it.each([96,128,150,192])('bounds %s² water composition and cached pan cost',size=>{
  const d=map(size,(x,y)=>x>size*.65||Math.abs(x-size*.4-Math.sin(y/8)*3)<3);const t=performance.now(),s=illustratedWater(d),cold=performance.now()-t;for(let i=0;i<50;i++)expect(illustratedWater(d)).toBe(s);expect(s.fallback).toBe(false);expect(s.highlights.length).toBeLessThanOrEqual(Math.ceil(size*size*.014));expect(s.paints.length).toBeLessThanOrEqual(5);console.log(`Water ${size}²: ${cold.toFixed(1)}ms cold, ${s.loops.length} loops, ${s.highlights.length} highlights, ${s.mask.length} mask chars; one draw node`);
 });
});
