import type {BuildingKind} from '../../model/catalogue';
export const architectureThemes={viking:'Traditional Viking',rural:'Medieval Rural',coastal:'Coastal Trading'} as const;
export type ArchitectureTheme=keyof typeof architectureThemes;
export interface ArtworkPath {data:string;fill:string;stroke?:string;width?:number;level:'mass'|'structure'|'detail'}
export interface VectorArtwork {format:'vector';viewBox:readonly [number,number,number,number];paths:readonly ArtworkPath[]}
/** Alpha-content rectangle in original PNG pixel coordinates; no document geometry. */
export interface ImageBounds {x:number;y:number;width:number;height:number}
/** Only approved, statically imported PNGs are resolved. Never a runtime URL or upload. */
export interface BundledImageArtwork {format:'bundled-image';source:string;mime:'image/png';pixelWidth:number;pixelHeight:number;visibleBounds?:ImageBounds;fallback:VectorArtwork}
export type ArtworkDefinition=VectorArtwork|BundledImageArtwork;
export interface BuildingAsset<A extends ArtworkDefinition=ArtworkDefinition> {
 id:string;kind:BuildingKind;name:string;theme:ArchitectureTheme;variation:string;
 artwork:A;thumbnail:{view:'artwork';background:string};
 footprint:{nominal:readonly [number,number];aspectRange:readonly [number,number];fit:'adapt-or-contain'};
 canonicalOrientation:0;automatic:boolean;
}
export interface BuildingAssetPackManifest<A extends ArtworkDefinition=ArtworkDefinition> {version:1;id:string;name:string;assets:readonly BuildingAsset<A>[]}
export type FutureImageAssetManifest=BuildingAsset<BundledImageArtwork>;
