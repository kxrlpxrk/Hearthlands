import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {sheet4PilotAssets,customImageAssets,demoImageAssets,validateAssetRegistry} from '../assets/buildings/registry';
import type {BuildingAsset,BundledImageArtwork} from '../assets/buildings/types';
import {rasterGeometry,rasterOverviewGeometry,rasterOverview} from './rasterGeometry';
import {artworkSvg} from './buildingArtwork';
import {AssetThumbnail} from '../ui/BuildingAppearance';
import {placeBuilding} from '../model/operations';
import {createDocument} from '../model/document';
import {setBuildingAppearance} from '../model/appearance';
import {updateBuilding,footprint} from '../model/buildings';
import {parseDocument,serializeDocument} from '../exports/json';
import {mapSvg} from '../exports/png';
// SSR cannot decode a PNG; provide a ready image only to exercise thumbnail SVG.
vi.mock('./bundledImages',()=>({useBundledImage:()=>({width:1024,height:768}),imageFailed:()=>false}));
const scaled=(asset:BuildingAsset,presentation:unknown):BuildingAsset=>({...asset,artwork:{...asset.artwork,presentation} as BundledImageArtwork});
describe('safe installed artwork presentation',()=>{
 it.each(sheet4PilotAssets)('$kind uses its chosen multiplier, alpha bounds and original proportions without changing document data',asset=>{
  const art=asset.artwork as BundledImageArtwork,[width,height]=asset.footprint.nominal,size={width,height},legacy=rasterGeometry(size,scaled(asset,undefined)),r=rasterGeometry(size,asset);
  expect(art.presentation?.scale).toBe(({cottage:1.06,tavern:1.04,farm:1.03} as Record<string,number>)[asset.kind]);expect(r.width/legacy.width).toBeCloseTo(art.presentation!.scale!,12);expect(r.width/r.height).toBeCloseTo(r.crop.width/r.crop.height,12);expect(r.crop).toBe(art.visibleBounds);
  const base=placeBuilding(createDocument(),{x:10,y:10},asset.kind,'test'),doc=setBuildingAppearance(base,'test',asset.id),before=serializeDocument(doc);
  for(const rotation of [0,90,180,270])for(const [w,h] of [[width,height],[8,3],[1,1],[1,40],[40,1],[192,192]]){
   const changed=updateBuilding(doc,'test',{rotation,width:w,height:h}),b=changed.buildings[0],f=footprint(b),g=rasterGeometry(b,asset),angle=rotation*Math.PI/180;
   expect(g.width/g.height).toBeCloseTo(g.crop.width/g.crop.height,12);
   for(const [x,y] of [[g.x,g.y],[g.x+g.width,g.y],[g.x,g.y+g.height],[g.x+g.width,g.y+g.height]]){
    const dx=x-w/2,dy=y-h/2,rx=f.width/2+dx*Math.cos(angle)-dy*Math.sin(angle),ry=f.height/2+dx*Math.sin(angle)+dy*Math.cos(angle);
    expect(rx).toBeGreaterThanOrEqual(-1e-10);expect(ry).toBeGreaterThanOrEqual(-1e-10);expect(rx).toBeLessThanOrEqual(f.width+1e-10);expect(ry).toBeLessThanOrEqual(f.height+1e-10);
   }
  }
  expect(serializeDocument(doc)).toBe(before);expect(before).not.toContain('presentation');expect(before).not.toContain('overview');expect(parseDocument(before)).toEqual(doc);
 });
 it('contains aggressive scales and offsets within the declared safe rectangle without cropping source pixels',()=>{
  const a=sheet4PilotAssets[0],size={width:2,height:2},r=rasterGeometry(size,scaled(a,{version:1,scale:3,offset:{x:1,y:-1},bounds:{x:.1,y:.2,width:.7,height:.6}}));
  expect(r.x).toBeGreaterThanOrEqual(.2-1e-12);expect(r.y).toBeGreaterThanOrEqual(.4-1e-12);expect(r.x+r.width).toBeLessThanOrEqual(1.6+1e-12);expect(r.y+r.height).toBeLessThanOrEqual(1.6+1e-12);expect(r.crop).toEqual((a.artwork as BundledImageArtwork).visibleBounds);expect(r.width/r.height).toBeCloseTo(r.crop.width/r.crop.height,12);
 });
 it.each([...customImageAssets,...demoImageAssets])('$id retains its exact Phase 6B.6 fit and full/reduced artwork',asset=>{
  const art=asset.artwork as BundledImageArtwork;expect(art.presentation).toBeUndefined();for(const size of [{width:4,height:2},{width:8,height:3},{width:1,height:20}]){const c=art.visibleBounds!,scale=Math.min(Math.max(.1,size.width-.12)/c.width,Math.max(.1,size.height-.12)/c.height),w=c.width*scale,h=c.height*scale;expect(rasterGeometry(size,asset)).toEqual({x:(size.width-w)/2,y:(size.height-h)/2,width:w,height:h,crop:c,scale});expect(rasterOverviewGeometry(size,asset)).toBeUndefined();expect(artworkSvg(asset,true)).toContain('data-raster=');expect(artworkSvg(asset,true)).not.toContain('data-raster-overview');}
 });
 it('rejects unsafe scale, offset, bounds, versions and overview markup',()=>{
  const a=sheet4PilotAssets[0];for(const p of [null,{version:2},{version:1,scale:NaN},{version:1,scale:0},{version:1,scale:4},{version:1,offset:null},{version:1,offset:{x:Infinity,y:0}},{version:1,offset:{x:2,y:0}},{version:1,bounds:null},{version:1,bounds:{x:-.1,y:0,width:1,height:1}},{version:1,bounds:{x:0,y:0,width:1.1,height:1}},{version:1,bounds:{x:0,y:0,width:0,height:1}}])expect(validateAssetRegistry([scaled(a,p)])).toContain(`Invalid raster presentation: ${a.id}`);
  for(const overview of [null,{format:'vector',viewBox:[0,0,1,0],paths:[]},{format:'vector',viewBox:[0,0,10,10],paths:[{data:'M0 0<script>',fill:'#ffffff',level:'mass'}]}])expect(validateAssetRegistry([scaled(a,{version:1,overview})]).length).toBeGreaterThan(0);
  expect(validateAssetRegistry([scaled(a,{version:1})])).toEqual([]);
 });
 it('uses a bounded LOD flag at 11/44/83/100/150 percent and supports explicit reduced detail',()=>{
  expect([.11,.44,.83,1,1.5].map(zoom=>rasterOverview(false,32*zoom))).toEqual([true,true,false,false,false]);expect(rasterOverview(false,16)).toBe(false);expect(rasterOverview(true,48)).toBe(true);
 });
 it.each(sheet4PilotAssets)('$kind shares safe bounds between thumbnail, PNG pixels and readable reduced-detail export',asset=>{
  const [width,height]=asset.footprint.nominal,size={width,height},r=rasterGeometry(size,asset),o=rasterOverviewGeometry(size,asset)!;
  const thumb=renderToStaticMarkup(<AssetThumbnail asset={asset}/>);for(const attribute of [`x="${r.x}"`,`y="${r.y}"`,`width="${r.width}"`,`height="${r.height}"`,`viewBox="${r.crop.x} ${r.crop.y} ${r.crop.width} ${r.crop.height}"`]){expect(thumb).toContain(attribute);expect(artworkSvg(asset,false)).toContain(attribute);}
  expect(o.scale).toBeGreaterThan(0);const reduced=artworkSvg(asset,true);expect(reduced).toContain(`data-raster-overview="${asset.id}"`);expect(reduced).toContain('overflow="hidden"');for(const p of o.vector.paths)expect(reduced).toContain(p.data);expect(artworkSvg(asset,true,'#000000')).toBe('');
  const base=placeBuilding(createDocument(),{x:10,y:10},asset.kind,'test'),doc=setBuildingAppearance(base,'test',asset.id);for(const resolution of [1024,2048,4096]){expect(mapSvg(doc,{style:'illustrated',resolution,grid:false,labels:false,reduced:false})).toContain(`data-raster="${asset.id}"`);expect(mapSvg(doc,{style:'illustrated',resolution,grid:false,labels:false,reduced:true})).toContain(`data-raster-overview="${asset.id}"`);}
  for(const reduced of [true,false]){const options={resolution:1024,style:'planning' as const,grid:true,labels:true,reduced};expect(mapSvg(doc,options)).toBe(mapSvg(base,options));}
 });
});
