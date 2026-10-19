import {afterEach,describe,it,expect,vi} from 'vitest';
import {customImageAssets,demoImageAssets,validateAssetRegistry,assetById} from '../assets/buildings/registry';
import type {BuildingAsset,BundledImageArtwork} from '../assets/buildings/types';
import {rasterGeometry,rasterSourceCrop,artworkHasShadow} from './rasterGeometry';
import {artworkSvg} from './buildingArtwork';
import {footprintDebugEnabled} from './footprintDebug';
import {createDocument} from '../model/document';
import {placeBuilding} from '../model/operations';
import {setBuildingAppearance} from '../model/appearance';
import {updateBuilding,footprint} from '../model/buildings';
import {mapSvg} from '../exports/png';
import {serializeDocument} from '../exports/json';
afterEach(()=>vi.unstubAllGlobals());
afterEach(()=>vi.unstubAllEnvs());
describe('alpha bounds and proportional raster fitting',()=>{
 it.each([...customImageAssets,...demoImageAssets])('$id contains declared visible pixels, uniformly and centrally, at normal and extreme footprints',asset=>{
  for(const size of [{width:4,height:2},{width:6,height:3},{width:7,height:2},{width:2,height:7},{width:40,height:1},{width:1,height:1}]){
   const r=rasterGeometry(size,asset);expect(r.width/r.height).toBeCloseTo(r.crop.width/r.crop.height,12);expect(r.width/r.crop.width).toBeCloseTo(r.height/r.crop.height,12);
   expect(r.x+r.width/2).toBeCloseTo(size.width/2);expect(r.y+r.height/2).toBeCloseTo(size.height/2);expect(r.x).toBeGreaterThanOrEqual(.059999);expect(r.y).toBeGreaterThanOrEqual(.059999);expect(r.x+r.width).toBeLessThanOrEqual(size.width-.059999);expect(r.y+r.height).toBeLessThanOrEqual(size.height-.059999);
  }
  const full=rasterGeometry({width:4,height:2},asset).crop,small=rasterSourceCrop(asset,{width:256,height:128});expect(small).toEqual({x:full.x/4,y:full.y/4,width:full.width/4,height:full.height/4});
 });
 it('defaults missing bounds to the full source and rejects invalid optional manifest rectangles',()=>{
  const asset=customImageAssets[0],art=asset.artwork as BundledImageArtwork,{visibleBounds:_bounds,...legacy}=art;
  expect(rasterGeometry({width:4,height:2},{...asset,artwork:legacy}).crop).toEqual({x:0,y:0,width:1024,height:512});
  for(const bounds of [null,{x:-1,y:0,width:10,height:10},{x:0,y:0,width:0,height:10},{x:0,y:0,width:1025,height:512},{x:10,y:1,width:1024,height:512},{x:.5,y:0,width:10,height:10}])expect(validateAssetRegistry([{...asset,artwork:{...art,visibleBounds:bounds}} as unknown as BuildingAsset])).toContain(`Invalid image bounds: ${asset.id}`);
 });
 it.each(customImageAssets)('$id has no separate shadow and exports the same alpha crop with all rotations, without changing data',asset=>{
  const original=placeBuilding(createDocument(),{x:10,y:11},'longhouse','hall'),chosen=setBuildingAppearance(original,'hall',asset.id),before=serializeDocument(chosen);
  expect(artworkHasShadow(asset)).toBe(false);expect(artworkSvg(asset,false,'#000000')).toBe('');
  for(const rotation of [0,90,180,270])for(const size of [{width:4,height:2},{width:8,height:3}]){
   const doc=updateBuilding(chosen,'hall',{rotation,...size}),b=doc.buildings[0],f=footprint(b),r=rasterGeometry(b,asset),svg=mapSvg(doc,{style:'illustrated',resolution:2048,grid:false,labels:false,reduced:false});
   expect(svg).toContain(`rotate(${rotation})`);expect(svg).toContain(`translate(${b.x+f.width/2} ${b.y+f.height/2})`);expect(svg).toContain(`viewBox="${r.crop.x} ${r.crop.y} ${r.crop.width} ${r.crop.height}"`);expect(svg).toContain(`width="${r.width}" height="${r.height}"`);expect(svg).not.toContain('data-building-shadow');expect(svg).not.toContain('preserveAspectRatio="none"');
   expect(doc.terrain).toBe(original.terrain);expect(doc.roads).toBe(original.roads);expect(doc.districts).toBe(original.districts);
  }
  expect(serializeDocument(chosen)).toBe(before);const options={style:'planning' as const,resolution:1024,grid:false,labels:false};expect(mapSvg(chosen,options)).toBe(mapSvg(original,options));
 });
 it('retains vector shadows while excluding debug overlays from normal and production views',()=>{
  expect(artworkHasShadow(assetById.get('starter.viking.longhouse.2')!)).toBe(true);
  vi.stubGlobal('window',{location:{search:''}});vi.stubEnv('DEV',true);expect(footprintDebugEnabled()).toBe(false);
  vi.stubGlobal('window',{location:{search:'?footprintDebug=1'}});expect(footprintDebugEnabled()).toBe(true);vi.stubEnv('DEV',false);expect(footprintDebugEnabled()).toBe(false);
 });
});
