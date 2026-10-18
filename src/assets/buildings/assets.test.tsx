import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogue} from '../../model/catalogue';
import {buildingAssets,assetsForKind,validateAssetRegistry,priorityKinds} from './registry';
import {architectureThemes} from './types';
import {AssetThumbnail} from '../../ui/BuildingAppearance';
import {artworkPaths} from '../../rendering/buildingArtwork';
describe('bundled building asset registry',()=>{
 it('validates the versioned local catalogue and unique stable IDs',()=>{expect(validateAssetRegistry()).toEqual([]);expect(buildingAssets).toHaveLength(81);expect(new Set(buildingAssets.map(a=>a.id)).size).toBe(buildingAssets.length);expect(validateAssetRegistry([buildingAssets[0],buildingAssets[0]]).join(' ')).toContain('duplicate');});
 it('covers every functional kind and architecture theme with automatic eligible artwork',()=>{for(const kind of catalogue)for(const theme of Object.keys(architectureThemes)){const assets=assetsForKind(kind.kind).filter(a=>a.theme===theme&&a.automatic);expect(assets.length).toBeGreaterThan(0);for(const a of assets){expect(a.artwork.paths.length).toBeGreaterThan(0);expect(a.footprint.nominal).toEqual([kind.width,kind.height]);expect(a.canonicalOrientation).toBe(0);expect(a.artwork.format).toBe('vector');}}});
 it('has two different structural silhouettes per priority type in every theme, beyond recolouring',()=>{for(const kind of priorityKinds)for(const theme of Object.keys(architectureThemes)){const assets=assetsForKind(kind).filter(a=>a.theme===theme);expect(assets.length).toBeGreaterThanOrEqual(2);const silhouettes=assets.map(a=>artworkPaths(a,true).filter(p=>p.level==='mass').map(p=>p.data).join('|'));expect(new Set(silhouettes).size).toBe(assets.length);}});
 it('uses exactly the shared artwork for accessible visual thumbnails and strips micro-detail at low zoom',()=>{for(const asset of buildingAssets){const html=renderToStaticMarkup(<AssetThumbnail asset={asset}/>);expect(html).toContain('role="img"');for(const p of artworkPaths(asset))expect(html).toContain(p.data);expect(html).not.toContain('http://');expect(artworkPaths(asset,true).every(p=>p.level!=='detail')).toBe(true);}});
});
