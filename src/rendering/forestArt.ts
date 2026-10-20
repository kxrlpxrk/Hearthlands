/** Presentation only. Placement and resource/navigation data never depend on artwork. */
export type ForestSpecies='beech'|'birch'|'oak'|'pine';
export type ForestRole=ForestSpecies|'mixed-cluster'|'forest-edge';
export interface ForestArtDefinition {
 id:string; role:ForestRole;
 /** World-space envelope; a future PNG's alpha bounds must stay inside this circle. */
 nominalDiameter:number; anchor:{x:number;y:number};
 source:{kind:'procedural';shape:'broadleaf'|'conifer'}|{kind:'bundled-png';path:string;pixelWidth:number;pixelHeight:number};
}
/** No image loader/assets are installed in this phase. This is the extension boundary. */
export const forestArt:readonly ForestArtDefinition[]=[
 {id:'canopy.beech',role:'beech',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'broadleaf'}},
 {id:'canopy.birch',role:'birch',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'broadleaf'}},
 {id:'canopy.oak',role:'oak',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'broadleaf'}},
 {id:'canopy.pine',role:'pine',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'conifer'}},
 {id:'canopy.mixed',role:'mixed-cluster',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'broadleaf'}},
 {id:'canopy.edge',role:'forest-edge',nominalDiameter:2,anchor:{x:.5,y:.5},source:{kind:'procedural',shape:'broadleaf'}},
];
export const forestPalette=[
 {base:'#3e5942',light:'#73835a',ink:'#2e4939'},
 {base:'#496348',light:'#889265',ink:'#344d3c'},
 {base:'#566e4b',light:'#93996a',ink:'#3a533b'},
 {base:'#385a49',light:'#698875',ink:'#2c493e'},
] as const;

export function resolveForestArt(species:ForestSpecies):ForestArtDefinition {
 return forestArt.find(a=>a.role===species)!;
}
