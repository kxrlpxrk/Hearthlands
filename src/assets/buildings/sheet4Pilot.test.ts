import {describe,it,expect} from 'vitest';
import {sheet4PilotAssets,starterPack,buildingAssets,validateAssetRegistry,assetById} from './registry';
import {bundledImageInfo} from './images';
import {createDocument} from '../../model/document';
import {placeBuilding} from '../../model/operations';
import {setBuildingAppearance,selectAutomaticAsset,resolveBuildingAsset} from '../../model/appearance';
import {updateBuilding,footprint} from '../../model/buildings';
import {commit,undo,redo} from '../../commands/history';
import {parseDocument,serializeDocument} from '../../exports/json';
import {mapSvg} from '../../exports/png';
import {rasterGeometry,artworkHasShadow} from '../../rendering/rasterGeometry';
const supplied=[
 {kind:'cottage',name:'Viking Cottage – Sheet 4',size:[768,768],nominal:[2,2],bounds:{x:34,y:133,width:699,height:502},sha:'3f7a751f3f685e5de79bbd998ee54d2500986c44fdc03a02c3c697363c9b7cfd'},
 {kind:'tavern',name:'Viking Tavern – Sheet 4',size:[1024,768],nominal:[3,2],bounds:{x:46,y:121,width:932,height:526},sha:'7eb76ae1773e74b20ad0a6fcc51b85868f190f23e9ede2878df33ca7a16c348c'},
 {kind:'farm',name:'Viking Farmstead – Sheet 4',size:[1024,768],nominal:[4,3],bounds:{x:46,y:123,width:932,height:522},sha:'93a6d47899f04458237247b5f0a60926aeb3b52d87211374c30e032d6d2b8003'},
] as const;
describe.each(supplied)('Sheet 4 $kind pilot',({kind,name,size,nominal,bounds,sha})=>{
 const id=`hearthlands.sheet4.${kind}.01`;
 it('installs only the three approved, byte-identical RGBA assets with accurate dimensions and alpha bounds',async()=>{
  expect(sheet4PilotAssets.map(a=>a.id)).toEqual(supplied.map(a=>`hearthlands.sheet4.${a.kind}.01`));expect(buildingAssets).toHaveLength(89);expect(validateAssetRegistry()).toEqual([]);
  const asset=assetById.get(id)!;expect(asset).toMatchObject({id,kind,name,theme:'viking',automatic:false,canonicalOrientation:0,footprint:{nominal},artwork:{format:'bundled-image',pixelWidth:size[0],pixelHeight:size[1],visibleBounds:bounds}});
  if(asset.artwork.format!=='bundled-image')throw Error('Expected PNG');
  expect(asset.artwork.fallback).toBe(assetById.get(`starter.viking.${kind}.1`)!.artwork);
  const installed=bundledImageInfo(asset.artwork.source)!;expect(installed).toMatchObject({width:size[0],height:size[1]});const bytes=Uint8Array.from(atob(installed.source.split(',')[1]),c=>c.charCodeAt(0));expect(bytes[25]).toBe(6);
  const digest=await crypto.subtle.digest('SHA-256',bytes);expect(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')).toBe(sha);
 });
 it('keeps old automatic choices and all settlement geometry, with lock-safe overrides, reset, history and JSON',()=>{
  const base=placeBuilding(createDocument(),{x:12,y:14},kind,'pilot'),b=base.buildings[0];
  for(let seed=0;seed<25;seed++)for(const theme of ['viking','rural','coastal'] as const)expect(selectAutomaticAsset(seed,theme,b).id).toBe(selectAutomaticAsset(seed,theme,b,starterPack.assets).id);
  const chosen=setBuildingAppearance(base,b.id,id);expect(chosen).toEqual({...base,buildings:[{...b,appearance:{version:1,mode:'manual',assetId:id}}]});
  const h=commit({present:base,past:[],future:[]},chosen);expect(undo(h).present).toBe(base);expect(redo(undo(h)).present).toBe(chosen);
  const moved=updateBuilding(chosen,b.id,{x:18,y:22,width:6,height:3,rotation:270});expect(resolveBuildingAsset(moved,moved.buildings[0]).id).toBe(id);expect(parseDocument(serializeDocument(moved))).toEqual(moved);expect(serializeDocument(moved)).not.toContain('base64');
  const locked=updateBuilding(moved,b.id,{locked:true});expect(setBuildingAppearance(locked,b.id,null)).toBe(locked);expect(setBuildingAppearance(chosen,b.id,null).buildings[0].appearance).toBeUndefined();
 });
 it('fits original proportions, embeds actual pixels at every export size/rotation, and leaves Planning unchanged',()=>{
  const asset=assetById.get(id)!,base=placeBuilding(createDocument(),{x:12,y:14},kind,'pilot'),chosen=setBuildingAppearance(base,'pilot',id);
  if(asset.artwork.format!=='bundled-image')throw Error('Expected PNG');
  expect(artworkHasShadow(asset)).toBe(false);
  for(const rotation of [0,90,180,270])for(const resolution of [1024,2048,4096]){
   const doc=updateBuilding(chosen,'pilot',{rotation,width:nominal[0],height:nominal[1]}),b=doc.buildings[0],r=rasterGeometry(b,asset),f=footprint(b);
   expect(r.width/r.height).toBeCloseTo(bounds.width/bounds.height,12);expect(r.x+r.width/2).toBeCloseTo(b.width/2);expect(r.y+r.height/2).toBeCloseTo(b.height/2);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(b.width);expect(r.y+r.height).toBeLessThanOrEqual(b.height);
   const svg=mapSvg(doc,{resolution,style:'illustrated',grid:false,labels:false});expect(svg).toContain(`data-raster="${id}"`);expect(svg).toContain(bundledImageInfo(asset.artwork.source)!.source);expect(svg).toContain(`rotate(${rotation})`);expect(svg).toContain(`translate(${b.x+f.width/2} ${b.y+f.height/2})`);expect(svg).toContain(`viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"`);expect(svg).not.toContain('data-building-shadow');
  }
  const options={resolution:1024,style:'planning' as const,grid:false,labels:false};expect(mapSvg(chosen,options)).toBe(mapSvg(base,options));
 });
});
