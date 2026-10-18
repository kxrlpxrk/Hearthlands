import type {BuildingKind} from '../../model/catalogue';
export const architectureThemes={viking:'Traditional Viking',rural:'Medieval Rural',coastal:'Coastal Trading'} as const;
export type ArchitectureTheme=keyof typeof architectureThemes;
export interface ArtworkPath {data:string;fill:string;stroke?:string;width?:number;level:'mass'|'structure'|'detail'}
export interface VectorArtwork {format:'vector';viewBox:readonly [number,number,number,number];paths:readonly ArtworkPath[]}
/** Future build-time packs may embed cleaned, transparent images. Runtime uploads are
 * intentionally not supported; current artwork is exclusively bundled vector geometry. */
export interface BundledImageArtwork {format:'bundled-image';source:string;mime:'image/png'|'image/svg+xml';pixelWidth:number;pixelHeight:number;fallback:VectorArtwork}
export type ArtworkDefinition=VectorArtwork|BundledImageArtwork;
export interface BuildingAsset<A extends ArtworkDefinition=VectorArtwork> {
 id:string;kind:BuildingKind;name:string;theme:ArchitectureTheme;variation:string;
 artwork:A;thumbnail:{view:'artwork';background:string};
 footprint:{nominal:readonly [number,number];aspectRange:readonly [number,number];fit:'adapt-or-contain'};
 canonicalOrientation:0;automatic:boolean;
}
export interface BuildingAssetPackManifest<A extends ArtworkDefinition=VectorArtwork> {version:1;id:string;name:string;assets:readonly BuildingAsset<A>[]}
export type FutureImageAssetManifest=BuildingAsset<BundledImageArtwork>;
