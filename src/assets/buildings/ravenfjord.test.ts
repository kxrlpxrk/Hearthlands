import {describe,it,expect} from 'vitest';
import {assetById,buildingAssets,starterPack,demoImageAssets,customImageAssets,validateAssetRegistry} from './registry';
import {bundledImageSource,bundledImageInfo} from './images';
import {createDocument} from '../../model/document';
import {placeBuilding} from '../../model/operations';
import {setBuildingAppearance,selectAutomaticAsset,resolveBuildingAsset} from '../../model/appearance';
import {updateBuilding} from '../../model/buildings';
import {commit,undo,redo} from '../../commands/history';
import {parseDocument,serializeDocument} from '../../exports/json';
import {mapSvg} from '../../exports/png';
const supplied=[
 ['01','Ravenfjord Timber Longhouse','f54d972d5ce2755fdfd853c2d9d6bf8f5c56b12df4a6e9b8c28ec67e7b9a6e38'],
 ['02','Ravenfjord Painted Timber Hall','5b55ab029201177bdaeec94b5d49352aaa01046eddb37031530228646c8383ea'],
 ['03','Ravenfjord Mossy Timber Hall','069c0035b2c05def10b9c6b86fccefce1febe3ef6def042d09c58ec531308c62'],
] as const;
describe.each(supplied)('supplied Ravenfjord %s — %s',(number,name,sha)=>{
 const id=`hearthlands.viking.longhouse.${number}`;
 it('installs the exact supplied RGBA PNG once, with the requested manual-only metadata',async()=>{
  const asset=assetById.get(id)!;expect(validateAssetRegistry()).toEqual([]);expect(customImageAssets.map(a=>a.id)).toEqual(supplied.map(([n])=>`hearthlands.viking.longhouse.${n}`));expect(starterPack.assets).toHaveLength(81);expect(demoImageAssets).toHaveLength(2);expect(buildingAssets).toHaveLength(86);
  expect(asset).toMatchObject({id,name,kind:'longhouse',theme:'viking',automatic:false,canonicalOrientation:0,footprint:{nominal:[4,2]},artwork:{format:'bundled-image',pixelWidth:1024,pixelHeight:512,mime:'image/png'}});
  if(asset.artwork.format!=='bundled-image')throw Error('Expected bundled PNG');
  expect(asset.artwork.fallback.format).toBe('vector');const source=bundledImageSource(asset.artwork.source)!;expect(bundledImageInfo(asset.artwork.source)).toMatchObject({width:1024,height:512});
  const bytes=Uint8Array.from(atob(source.split(',')[1]),c=>c.charCodeAt(0));expect(bytes[25]).toBe(6);
  const digest=await crypto.subtle.digest('SHA-256',bytes);expect(Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')).toBe(sha);
 });
 it('preserves automatic pools, geometry, locks, history and JSON IDs',()=>{
  const base=placeBuilding(createDocument(),{x:10,y:10},'longhouse','ravenfjord-hall'),b=base.buildings[0];
  for(let i=0;i<50;i++)for(const theme of ['viking','rural','coastal'] as const){const hall={...b,id:`stable-${i}`};expect(selectAutomaticAsset(base.seed,theme,hall).id).toBe(selectAutomaticAsset(base.seed,theme,hall,starterPack.assets).id);}
  const chosen=setBuildingAppearance(base,b.id,id);expect(chosen.buildings[0]).toEqual({...b,appearance:{version:1,mode:'manual',assetId:id}});for(const key of ['terrain','roads','districts','grid','landscape'] as const)expect(chosen[key]).toBe(base[key]);
  const h=commit({present:base,past:[],future:[]},chosen);expect(undo(h).present).toBe(base);expect(redo(undo(h)).present).toBe(chosen);
  const moved=updateBuilding(chosen,b.id,{x:14,y:18,width:8,height:2,rotation:90});expect(resolveBuildingAsset(moved,moved.buildings[0]).id).toBe(id);expect(parseDocument(serializeDocument(moved))).toEqual(moved);expect(serializeDocument(moved)).not.toContain('base64');
  const locked=updateBuilding(moved,b.id,{locked:true});expect(setBuildingAppearance(locked,b.id,null)).toBe(locked);expect(setBuildingAppearance(chosen,b.id,null).buildings[0].appearance).toBeUndefined();
 });
 it('embeds the supplied pixels in Illustrated exports and leaves Planning exactly unchanged',()=>{
  const base=placeBuilding(createDocument(),{x:10,y:10},'longhouse','hall'),chosen=setBuildingAppearance(base,'hall',id),asset=assetById.get(id)!;if(asset.artwork.format!=='bundled-image')throw Error('Expected PNG');
  for(const resolution of [1024,2048,4096]){const svg=mapSvg(updateBuilding(chosen,'hall',{rotation:90}),{resolution,style:'illustrated',grid:false,labels:false});expect(svg).toContain(`data-raster="${id}"`);expect(svg).toContain(bundledImageSource(asset.artwork.source));expect(svg).toContain('rotate(90)');}
  const options={resolution:1024,style:'planning' as const,grid:false,labels:false};expect(mapSvg(chosen,options)).toBe(mapSvg(base,options));
 });
});
