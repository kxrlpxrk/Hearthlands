import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildingAssets,customImageAssets,sheet4PilotAssets} from '../assets/buildings/registry';
import type {BuildingAsset,BundledImageArtwork} from '../assets/buildings/types';
import {rasterDetail,rasterPixelBucket,projectedRasterPixels,type RasterDetail} from './rasterDetail';
import {rasterGeometry,rasterSourceCrop} from './rasterGeometry';
import {artworkSvg} from './buildingArtwork';
beforeEach(()=>vi.resetModules());
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const rasters=buildingAssets.filter(a=>a.artwork.format==='bundled-image');
describe('same-artwork detail selection',()=>{
 it('uses oversampled physical pixel thresholds and hysteresis without oscillating or retaining blurry tiny sources',()=>{
  expect([10,48,49,192,193,1000].map(p=>rasterDetail(p))).toEqual(['distant','distant','medium','medium','high','high']);
  let detail:RasterDetail='distant';for(const p of [45,49,53,55,48,56]){detail=rasterDetail(p,detail);expect(detail).toBe('distant');}expect(rasterDetail(57,detail)).toBe('medium');
  for(const p of [41,50,160,193,220,224])expect(rasterDetail(p,'medium')).toBe('medium');expect(rasterDetail(39,'medium')).toBe('distant');expect(rasterDetail(225,'medium')).toBe('high');
  expect(rasterDetail(160,'high')).toBe('high');expect(rasterDetail(159,'high')).toBe('medium');expect(rasterDetail(20,'high')).toBe('distant');expect(rasterDetail(500,'distant')).toBe('high');
 });
 it('quantises pinch inputs while accounting for source padding, safe scale, retina pixels and resizing',()=>{
  expect(rasterPixelBucket(32)).toBe(32);expect(rasterPixelBucket(32.1)).toBe(32);expect(rasterPixelBucket(34)).not.toBe(32);
  for(const a of rasters){const [width,height]=a.footprint.nominal,art=a.artwork as BundledImageArtwork,r=rasterGeometry({width,height},a);for(const zoom of [.11,.2,.4,.6,.8,1,1.5])for(const dpr of [1,2,3]){const projected=projectedRasterPixels({width,height},a,32*zoom*dpr);expect(projected).toBeCloseTo(Math.max(art.pixelWidth,art.pixelHeight)*r.scale*32*zoom*dpr,12);const bucket=rasterPixelBucket(32*zoom*dpr);expect(Math.abs(bucket/(32*zoom*dpr)-1)).toBeLessThan(.045);}
   expect(projectedRasterPixels({width:width*2,height:height*2},a,32)).toBeGreaterThan(projectedRasterPixels({width,height},a,32));
  }
 });
 it('preserves the native alpha crop and geometry at every cached resolution, including unchanged longhouses',()=>{
  for(const a of rasters){const art=a.artwork as BundledImageArtwork,[width,height]=a.footprint.nominal,before=rasterGeometry({width,height},a);for(const edge of [64,256,Math.max(art.pixelWidth,art.pixelHeight)]){const ratio=edge/Math.max(art.pixelWidth,art.pixelHeight),source={width:Math.round(art.pixelWidth*ratio),height:Math.round(art.pixelHeight*ratio)},c=rasterSourceCrop(a,source);expect(c.x/source.width).toBeCloseTo(before.crop.x/art.pixelWidth,12);expect(c.y/source.height).toBeCloseTo(before.crop.y/art.pixelHeight,12);expect(c.width/source.width).toBeCloseTo(before.crop.width/art.pixelWidth,12);expect(c.height/source.height).toBeCloseTo(before.crop.height/art.pixelHeight,12);expect(rasterGeometry({width,height},a)).toEqual(before);}}
 });
 it('ignores legacy vector overview metadata for all PNG exports, including explicit reduced detail',()=>{
  for(const a of [...customImageAssets,...sheet4PilotAssets]){const art=a.artwork as BundledImageArtwork,legacy={...a,artwork:{...art,presentation:{...art.presentation,version:1 as const,overview:{format:'vector' as const,viewBox:[0,0,10,10] as const,paths:[{data:'M0 0H10V10Z',fill:'#ff0000',level:'mass' as const}]}}}};expect(artworkSvg(legacy,true)).toBe(artworkSvg(legacy,false));expect(artworkSvg(legacy,true)).toContain('data:image/png;base64,');expect(artworkSvg(legacy,true)).not.toContain('#ff0000');}
 });
});
describe('bounded image pyramid',()=>{
 async function hook(){const m=await import('./bundledImages');return{...m,read:(asset:BuildingAsset,level:RasterDetail)=>{let value:ReturnType<typeof m.useBundledImage>;function Probe(){value=m.useBundledImage(asset,level);return null;}renderToStaticMarkup(createElement(Probe));return value!;}};}
 it('decodes once per source, builds the distant surface from medium, and reuses all surfaces across 100 buildings and zooms',async()=>{
  const images:object[]=[],surfaces:{width:number;height:number;getContext:()=>unknown}[]=[],draws:{from:object;to:object;smoothing:boolean;quality:string}[]=[];
  let dimensions={width:1024,height:512};class ReadyImage{width=dimensions.width;height=dimensions.height;naturalWidth=this.width;naturalHeight=this.height;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(){images.push(this);}set src(_value:string){queueMicrotask(()=>this.onload?.());}}
  vi.stubGlobal('Image',ReadyImage);vi.stubGlobal('document',{createElement:()=>{const canvas={width:0,height:0,getContext:()=>context},context={imageSmoothingEnabled:false,imageSmoothingQuality:'',drawImage:(from:object)=>draws.push({from,to:canvas,smoothing:context.imageSmoothingEnabled,quality:context.imageSmoothingQuality})};surfaces.push(canvas);return canvas;}});
  const api=await hook();for(const asset of rasters){const art=asset.artwork as BundledImageArtwork;dimensions={width:art.pixelWidth,height:art.pixelHeight};await api.prepareBundledImages(Array(100).fill(asset));const original=api.read(asset,'high')!,medium=api.read(asset,'medium')!,distant=api.read(asset,'distant')!;expect(Math.max(medium.width,medium.height)).toBe(256);expect(Math.max(distant.width,distant.height)).toBe(64);expect(draws.at(-2)?.from).toBe(original);expect(draws.at(-1)?.from).toBe(medium);for(let i=0;i<100;i++){expect(api.read(asset,'high')).toBe(original);expect(api.read(asset,'medium')).toBe(medium);expect(api.read(asset,'distant')).toBe(distant);}}
  expect(images).toHaveLength(8);expect(surfaces).toHaveLength(16);expect(draws).toHaveLength(16);expect(draws.every(d=>d.smoothing&&d.quality==='high')).toBe(true);
  const distantBytes=surfaces.filter(s=>Math.max(s.width,s.height)===64).reduce((n,s)=>n+s.width*s.height*4,0);expect(distantBytes).toBe(81920);
 });
 it('keeps the original image usable if canvas allocation fails and does not retry allocation during camera changes',async()=>{
  let decodes=0,allocations=0;class ReadyImage{width=1024;height=512;naturalWidth=1024;naturalHeight=512;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(_value:string){decodes++;queueMicrotask(()=>this.onload?.());}}
  vi.stubGlobal('Image',ReadyImage);vi.stubGlobal('document',{createElement:()=>{allocations++;return{width:0,height:0,getContext:()=>null};}});const api=await hook(),asset=customImageAssets[0];await api.prepareBundledImages([asset]);for(let i=0;i<100;i++){expect(api.read(asset,'medium')).toBe(api.read(asset,'high'));expect(api.read(asset,'distant')).toBe(api.read(asset,'high'));}expect(decodes).toBe(1);expect(allocations).toBe(2);expect(api.imageFailed(asset)).toBe(false);
 });
 it('times out stalled decodes once and retains safe failure behavior for missing installed files',async()=>{
  vi.useFakeTimers();let decodes=0;class StalledImage{onload=null;onerror=null;set src(_value:string){decodes++;}}
  vi.stubGlobal('Image',StalledImage);const api=await hook(),asset=customImageAssets[0],done=api.prepareBundledImages([asset,asset]);await vi.advanceTimersByTimeAsync(5000);await done;await api.prepareBundledImages([asset]);expect(api.imageFailed(asset)).toBe(true);expect(api.read(asset,'high')).toBeUndefined();expect(decodes).toBe(1);
  expect(api.imageFailed({...asset,artwork:{...asset.artwork,source:'buildings/missing.png'}} as BuildingAsset)).toBe(true);
 });
});
