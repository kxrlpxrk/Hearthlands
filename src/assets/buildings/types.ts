import type {BuildingKind} from '../../model/catalogue';
export const architectureThemes={viking:'Traditional Viking',rural:'Medieval Rural',coastal:'Coastal Trading'} as const;
export type ArchitectureTheme=keyof typeof architectureThemes;
export interface ArtworkPath {data:string;fill:string;stroke?:string;width?:number;level:'mass'|'structure'|'detail'}
export interface VectorArtwork {format:'vector';viewBox:readonly [number,number,number,number];paths:readonly ArtworkPath[]}
/** Alpha-content rectangle in original PNG pixel coordinates; no document geometry. */
export interface ImageBounds {x:number;y:number;width:number;height:number}
/** Normalised unrotated footprint coordinates, distinct from source PNG pixels. */
export interface PresentationBounds {x:number;y:number;width:number;height:number}
/** Installed artwork metadata only, never project state. Bounds and offsets are
 * fractions of the unrotated logical footprint. Bounds must stay inside [0,1]. */
export interface RasterPresentation {
 version:1;scale?:number;offset?:{x:number;y:number};bounds?:PresentationBounds;
 /** Legacy manifest field, validated for compatibility but never used for raster LOD. */
 overview?:VectorArtwork;
}
/** Only approved, statically imported PNGs are resolved. Never a runtime URL or upload. */
export interface BundledImageArtwork {format:'bundled-image';source:string;mime:'image/png';pixelWidth:number;pixelHeight:number;visibleBounds?:ImageBounds;presentation?:RasterPresentation;fallback:VectorArtwork}
export type ArtworkDefinition=VectorArtwork|BundledImageArtwork;
export interface BuildingAsset<A extends ArtworkDefinition=ArtworkDefinition> {
 id:string;kind:BuildingKind;name:string;theme:ArchitectureTheme;variation:string;
 artwork:A;thumbnail:{view:'artwork';background:string};
 footprint:{nominal:readonly [number,number];aspectRange:readonly [number,number];fit:'adapt-or-contain'};
 canonicalOrientation:0;automatic:boolean;
}
export interface BuildingAssetPackManifest<A extends ArtworkDefinition=ArtworkDefinition> {version:1;id:string;name:string;assets:readonly BuildingAsset<A>[]}
export type FutureImageAssetManifest=BuildingAsset<BundledImageArtwork>;
