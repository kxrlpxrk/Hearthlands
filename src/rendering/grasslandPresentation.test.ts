import {describe,it,expect} from 'vitest';
import reference from '../../docs/screenshots/phase6c1b1/reference.json';
import {createDocument} from '../model/document';
import {parseDocument,serializeDocument} from '../exports/json';
import {terrainQuery} from '../model/terrain';
import {grasslandAlpha,grasslandPatches,grasslandClearance} from './grasslandGeometry';
import {grasslandTextureOpacity,grasslandSourceMix,grasslandOpaquePoints,grasslandOpaquePath} from './grasslandPresentation';
import {grasslandGround,grasslandGroundField} from './grasslandGround';
import {grasslandSvg} from './grasslandSvg';
import {terrainScene} from './scene';
import type {GrasslandSnapshot} from './grasslandImages';
import {grasslandAssets} from '../assets/grassland/registry';
const frozen=[
  {
    "x": 55.0297304270789,
    "y": 6.073575334041379,
    "assetId": "hearthlands.terrain.grassland.scrub.01",
    "radius": 1.6164466094067262,
    "angle": 5.20594308275699,
    "variant": 0
  },
  {
    "x": 57.093288059695624,
    "y": 21.842006681719795,
    "assetId": "hearthlands.terrain.grassland.flower.02",
    "radius": 2.8402103181462737,
    "angle": 0.6694474475961485,
    "variant": 1
  },
  {
    "x": 66.65210351592395,
    "y": 20.639285143930465,
    "assetId": "hearthlands.terrain.grassland.flower.01",
    "radius": 3.524305125512183,
    "angle": 2.921158997311781,
    "variant": 0
  },
  {
    "x": 60.45548701216467,
    "y": 38.05336521624122,
    "assetId": "hearthlands.terrain.grassland.base.01",
    "radius": 3.591452154074796,
    "angle": 1.8408879282799349,
    "variant": 1
  },
  {
    "x": 81.07882349239662,
    "y": 56.70812331221532,
    "assetId": "hearthlands.terrain.grassland.base.01",
    "radius": 3.111725885956548,
    "angle": 4.9217202368317565,
    "variant": 1
  },
  {
    "x": 90.17926476418506,
    "y": 56.71604696637951,
    "assetId": "hearthlands.terrain.grassland.base.01",
    "radius": 3.7329987818840893,
    "angle": 1.1041078123278825,
    "variant": 1
  },
  {
    "x": 77.54265716986265,
    "y": 68.46010745153762,
    "assetId": "hearthlands.terrain.grassland.base.01",
    "radius": 2.279178960202262,
    "angle": 0.9611285951381529,
    "variant": 2
  }
];
const doc=()=>parseDocument(JSON.stringify(reference)),all=grasslandAssets.map(a=>a.id);
function flat(size=96){const d=createDocument();d.seed=1847;d.grid={...d.grid,width:size,height:size};return d;}
describe('6C.2.1 grassland geometry and density presentation',()=>{
 it('preserves every Ravenfjord 6C.2 position, habitat ID, radius, rotation and variant exactly',()=>{
  const d=doc(),before=serializeDocument(d);expect(grasslandPatches(d,'restrained')).toEqual(frozen);expect(grasslandPatches({...parseDocument(before),id:'copy'},'restrained')).toEqual(frozen);expect(serializeDocument(d)).toBe(before);
 });
 it('shows no miniature texture at Fit and introduces the same artwork continuously through medium zoom',()=>{
  for(const zoom of [.11,.14])expect(grasslandTextureOpacity(32*zoom)).toBe(0);
  for(const zoom of [.4,.5,.8,1,1.5])expect(grasslandTextureOpacity(32*zoom)).toBe(1);
  expect(grasslandTextureOpacity(5.5)).toBe(0);expect(grasslandTextureOpacity(12)).toBe(1);
  let previous=0;for(let p=0;p<=64;p+=.01){const opacity=grasslandTextureOpacity(p);expect(opacity).toBeGreaterThanOrEqual(previous);expect(opacity-previous).toBeLessThan(.0024);previous=opacity;}
  expect(grasslandTextureOpacity(Infinity)).toBe(1);
 });
 it('smoothly adds original-source detail without changing silhouette or opacity',()=>{
  expect(grasslandSourceMix(384)).toBe(0);expect(grasslandSourceMix(640)).toBe(1);let before=0;
  for(let pixels=0;pixels<1000;pixels++){const mix=grasslandSourceMix(pixels);expect(mix).toBeGreaterThanOrEqual(before);expect(mix-before).toBeLessThan(.0061);before=mix;}
  for(let v=0;v<3;v++){const points=grasslandOpaquePoints(v);expect(grasslandOpaquePath(v)).toMatch(/^M.*Z$/);
   for(let i=0;i<points.length;i++)for(let j=0;j<=10;j++){const a=points[i],b=points[(i+1)%points.length],x=a.x+(b.x-a.x)*j/10,y=a.y+(b.y-a.y)*j/10;expect(grasslandAlpha(x,y,v)).toBe(1);}
  }
 });
 it('retains more opaque detail and substantially narrows the former fuzzy border without hard image rectangles',()=>{
  let oldSoft=0,newSoft=0,oldOpaque=0,newOpaque=0;
  for(let v=0;v<3;v++)for(let y=-1;y<=1;y+=.02)for(let x=-1;x<=1;x+=.02){const angle=Math.atan2(y,x),phase=v*2.17,r=.76+.10*Math.sin(3*angle+phase)+.065*Math.sin(5*angle-phase)+.035*Math.cos(7*angle+phase),t=Math.max(0,Math.min(1,(1-Math.hypot(x,y)/r)/.43)),old=t*t*(3-2*t),next=grasslandAlpha(x,y,v);
   if(old>0&&old<1)oldSoft++;if(next>0&&next<1)newSoft++;if(old===1)oldOpaque++;if(next===1)newOpaque++;if(Math.hypot(x,y)>=1)expect(next).toBe(0);
  }
  expect(newSoft).toBeLessThan(oldSoft*.5);expect(newOpaque).toBeGreaterThan(oldOpaque*1.8);
 });
 it('creates broad connected colour fields instead of blurred stamps, deterministically and without document changes',()=>{
  const d=doc(),before=serializeDocument(d),a=grasslandGround(d,'restrained');expect(a.length).toBeGreaterThan(0);expect(a.length).toBeLessThanOrEqual(6);expect(grasslandGround(d,'restrained')).toBe(a);expect(grasslandGround(parseDocument(before),'restrained')).toEqual(a);expect(grasslandGround({...d,seed:1848},'restrained')).not.toEqual(a);expect(a.every(p=>!!p.chunks?.length&&p.opacity!<.06)).toBe(true);expect(serializeDocument(d)).toBe(before);
  expect(grasslandGround(d,'off')).toEqual([]);
 });
 it('certifies every coloured tile square clear of forests, water, road widths, entrances, locked structures and fields',()=>{
  const d=doc(),field=grasslandGroundField(d),available=grasslandClearance(d),q=terrainQuery(d);let checked=0;
  for(let j=0;j<=field.rows;j++)for(let i=0;i<=field.columns;i++)if(field.values[j*(field.columns+1)+i]>0){
   const x=Math.min(d.grid.width,i*field.step),y=Math.min(d.grid.height,j*field.step);
   for(const dy of [-1,1])for(const dx of [-1,1]){const c={x:x+dx,y:y+dy};expect(available(c)).toBeGreaterThan(1.6);
    for(let v=-1;v<=1;v+=.5)for(let u=-1;u<=1;u+=.5){const p={x:c.x+u,y:c.y+v};expect(q.inside(p)).toBe(true);const t=q.at(p);expect(t.water).toBe(0);expect(t.vegetation).toBeLessThan(.2);expect(t.ground).toBe('grass');}
   }checked++;
  }expect(checked).toBeGreaterThan(20);
 });
 it('keeps original terrain and forests exact when disabled, and only appends independent grassland data when enabled',()=>{
  const d=doc(),o={style:'illustrated' as const,detail:true,contours:true},before=terrainScene(d,o),on=terrainScene(d,{...o,grassland:'restrained',grasslandAssets:all});expect(on.filter(p=>!p.grassland)).toEqual(before);
  const m=on.find(p=>p.grassland)!;for(const reduced of [true,false])expect(terrainScene(d,{...o,reduced,grassland:'restrained',grasslandAssets:all}).find(p=>p.grassland)?.grasslandGround).toBe(m.grasslandGround);
  expect(terrainScene(d,{...o,grassland:'off',grasslandAssets:all})).toBe(before);expect(terrainScene(d,{...o,style:'planning',grassland:'restrained',grasslandAssets:all})).toBe(terrainScene(d,{...o,style:'planning'}));
 });
 it.each([96,128,192])('bounds %s²/100-building colour geometry and shares its chunks across camera changes',size=>{
  const d=flat(size);d.buildings=Array.from({length:100},(_,i)=>({id:`home-${i}`,name:'Home',kind:'cottage' as const,layerId:'settlement',x:10+i%10*5,y:10+Math.floor(i/10)*5,width:2,height:2,rotation:0,locked:true}));
  const before=serializeDocument(d),t=performance.now(),paths=grasslandGround(d,'restrained'),built=performance.now();for(let i=0;i<50;i++)expect(grasslandGround(d,'restrained')).toBe(paths);
  console.log(`Grassland ground ${size}²: ${(built-t).toFixed(1)}ms build; ${(performance.now()-built).toFixed(1)}ms /50 cache hits; ${paths.length} bands`);expect(paths.length).toBeLessThanOrEqual(6);expect(paths.reduce((n,p)=>n+p.data.length,0)).toBeLessThan(size*size*90);expect(serializeDocument(d)).toBe(before);
 });
 it('exports density chosen from output resolution, with no camera input, remote sources or zoom-dependent geometry',()=>{
  const d=doc(),paths=terrainScene(d,{style:'illustrated',detail:true,contours:true,grassland:'restrained',grasslandAssets:all}),images:GrasslandSnapshot={status:'ready',ready:all,failed:[],images:new Map(all.map(id=>[id,Array.from({length:3},()=>({image:{} as HTMLCanvasElement,source:'data:image/png;base64,AAAA',original:{} as HTMLImageElement,originalSource:'data:image/webp;base64,AAAA'}))]))};
  for(const density of [3.5,4.48,1024/192]){const s=grasslandSvg(paths,images,density);expect(s.content).toContain('data-grassland-ground');expect(s.content).not.toContain('data-grassland-asset=');expect(s.defs).toBe('');}
  for(const resolution of [1024,2048,4096]){const density=resolution/d.grid.width,s=grasslandSvg(paths,images,density);expect(s.content).toContain(`opacity="${grasslandTextureOpacity(density)}"`);expect((s.content.match(/data-grassland-asset=/g)??[]).length).toBe(frozen.length);expect(s.defs).not.toContain('href="http');for(const p of frozen)expect(s.content).toContain(`translate(${p.x} ${p.y}) rotate(${p.angle*180/Math.PI})`);}
  const close=grasslandSvg(paths,images,128);expect(close.content).toContain('data-grassland-source-detail');expect(close.defs).toContain('data:image/webp');expect(close.defs).toContain('<clipPath');
 });
});
