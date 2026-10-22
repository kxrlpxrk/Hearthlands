import {describe,it,expect} from 'vitest';
import reference from '../../docs/screenshots/phase6c1b1/reference.json';
import {parseDocument,serializeDocument} from '../exports/json';
import {mapSvg} from '../exports/png';
import {terrainScene} from './scene';
import {waterSvg} from './waterGeometry';
import {waterSurfaceParts,terrainCacheRatio} from './terrainComposition';
import {fitScale,minimumScale,zoomCamera,pinchCamera,touchPinch} from './camera';
const viewport={width:390,height:326};
describe('6C.4.1 continuous water zoom',()=>{
 it.each([96,192])('starts pinching from %s² Fit without a jump to the former 12% floor',size=>{
  const fit=fitScale(viewport,{width:size*32,height:size*32}),min=minimumScale(fit),v={x:50,y:20,scale:fit},old={x:190,y:160,distance:50},next={...old,distance:51},a=pinchCamera(v,old,next,min);
  expect(fit).toBeLessThan(.12);expect(a.scale).toBeCloseTo(fit*1.02,12);expect(a.scale).toBeLessThan(.12);expect((old.x-a.x)/a.scale).toBeCloseTo((old.x-v.x)/v.scale,10);
 });
 it('does not jump if Safari toolbar/viewport changes put the current view outside new bounds',()=>{
  const anchor={x:100,y:100};expect(zoomCamera({x:0,y:0,scale:.03},1.02,anchor,.05).scale).toBeCloseTo(.0306,12);expect(zoomCamera({x:0,y:0,scale:4},.99,anchor,.02).scale).toBeCloseTo(3.96,12);
 });
 it('preserves the world anchor and exact scale during smooth forward/reverse and threshold oscillations',()=>{
  let v={x:-200,y:50,scale:.06};const original={...v},anchor={x:190,y:160},min=.02,scales=[.06,.09,.095,.19,.185,.215,.22,.31,.315,.4,.8,1,1.5];
  for(const target of [...scales,...[...scales].reverse()]){const start=v.scale;for(let step=1;step<=10;step++){const scale=start*Math.pow(target/start,step/10),old={...anchor,distance:50},next={...anchor,distance:50*scale/v.scale};v=pinchCamera(v,old,next,min);expect(v.scale).toBeCloseTo(scale,12);expect((anchor.x-v.x)/v.scale).toBeCloseTo((anchor.x-original.x)/original.scale,9);expect((anchor.y-v.y)/v.scale).toBeCloseTo((anchor.y-original.y)/original.scale,9);}}
  expect(v.scale).toBeCloseTo(original.scale,12);
 });
 it('handles moving finger centres, coincident fingers, cancellation/restart samples and bounds safely',()=>{
  const v={x:10,y:20,scale:.3},old={x:100,y:100,distance:40},next={x:110,y:120,distance:80},a=pinchCamera(v,old,next,.02);expect((next.x-a.x)/a.scale).toBe((old.x-v.x)/v.scale);expect((next.y-a.y)/a.scale).toBe((old.y-v.y)/v.scale);
  expect(touchPinch([{clientX:10,clientY:20},{clientX:30,clientY:20}],{left:5,top:5})).toEqual({x:15,y:15,distance:20});expect(touchPinch([],{left:0,top:0})).toBeNull();expect(touchPinch([{clientX:1,clientY:1},{clientX:1,clientY:1}],{left:0,top:0})).toBeNull();expect(pinchCamera(v,{...old,distance:0},next,.02)).toBe(v);expect(zoomCamera(v,NaN,old,.02)).toBe(v);expect(zoomCamera(v,100,old,.02).scale).toBe(3);expect(zoomCamera(v,.00001,old,.02).scale).toBe(.02);
 });
 it('isolates the unchanged water mask/paints/highlights from every terrain overview ratio',()=>{
  const d=parseDocument(JSON.stringify(reference)),bytes=serializeDocument(d),base=terrainScene(d,{style:'illustrated',detail:true,contours:true}),water=base.find(p=>p.water)!.water!,svg=waterSvg(water),zooms=[.053,.09,.09375,.094,.18,.1875,.188,.218,.219,.31,.3125,.313,.4,.8,1,1.5];
  for(const groundDetail of ['flat','subtle','rich'] as const)for(const reduced of [false,true])for(const zoom of [...zooms,...[...zooms].reverse()]){
   const paths=terrainScene(d,{style:'illustrated',detail:true,contours:true,groundDetail,reduced}),parts=waterSurfaceParts(paths);expect(parts.water.length).toBe(1);expect(parts.water[0].water).toBe(water);expect(waterSvg(parts.water[0].water!)).toBe(svg);expect(parts.before.every(p=>!p.water)).toBe(true);expect(parts.after.every(p=>p.layer==='relief'&&!p.water)).toBe(true);expect(terrainCacheRatio(zoom<.3125?12:0,192,192)).toBeLessThanOrEqual(2048/192);
  }
  for(const resolution of [1024,2048,4096])expect(mapSvg(d,{resolution,style:'illustrated',grid:false,labels:false})).toContain(svg);expect(serializeDocument(d)).toBe(bytes);
 });
 it('keeps Planning composition intact and bounds existing bitmap memory',()=>{
  const d=parseDocument(JSON.stringify(reference)),paths=terrainScene(d,{style:'planning',detail:true,contours:true});expect(waterSurfaceParts(paths).water).toEqual([]);expect(paths.some(p=>p.layer==='water'&&p.data)).toBe(true);for(const n of [4,8,12])for(const size of [96,150,192])expect(size*terrainCacheRatio(n,size,size)).toBeLessThanOrEqual(2048);expect(terrainCacheRatio(0,192,192)).toBe(0);
 });
});
