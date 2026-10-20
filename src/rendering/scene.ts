import type {SettlementDocument} from '../model/document';
import {terrainGeometry,type TerrainView,type TerrainPath} from './terrainGeometry';
import {sceneLayers} from './styles';
/** Bounded presentation cache, shared by editor and exports. Camera position is not an input.
 * Interaction colours/previews are deliberately outside this scene and never cached here. */
const cache:{terrain:SettlementDocument['terrain'];landscape:SettlementDocument['landscape'];planning:SettlementDocument['planning'];buildings:SettlementDocument['buildings'];roads:SettlementDocument['roads'];width:number;height:number;seed:number;key:string;paths:TerrainPath[]}[]=[];
export function terrainScene(doc:SettlementDocument,options:TerrainView):TerrainPath[]{
 const key=JSON.stringify({contours:options.contours,detail:options.detail,style:options.style??'planning',reduced:options.reduced??false});
 const index=cache.findIndex(c=>c.terrain===doc.terrain&&c.landscape===doc.landscape&&c.planning===doc.planning&&(options.style!=='illustrated'||c.buildings===doc.buildings&&c.roads===doc.roads)&&c.width===doc.grid.width&&c.height===doc.grid.height&&c.seed===doc.seed&&c.key===key);
 if(index>=0){const [entry]=cache.splice(index,1);cache.push(entry);return entry.paths;}
 const paths=terrainGeometry(doc,options).sort((a,b)=>sceneLayers.indexOf(a.layer??'base')-sceneLayers.indexOf(b.layer??'base'));
 cache.push({terrain:doc.terrain,landscape:doc.landscape,planning:doc.planning,buildings:doc.buildings,roads:doc.roads,width:doc.grid.width,height:doc.grid.height,seed:doc.seed,key,paths});if(cache.length>4)cache.shift();return paths;
}
