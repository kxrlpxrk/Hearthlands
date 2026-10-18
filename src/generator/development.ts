import type { Provenance } from '../model/provenance';
import type { Building, BuildingKind, Cell, Road, RoadStyle, SettlementDocument } from '../model/document';
import { buildingDefinition, catalogue } from '../model/catalogue';
import { districtCells, districtMembership, footprintShare, key, type DistrictType } from '../model/districts';
import { footprint } from '../model/buildings';
import { terrainQuery } from '../model/terrain';
import { closestSegment, infrastructureWarnings, infrastructureWidth, isBridge, isDefense, sampledPath } from '../model/infrastructure';
import { roadContext, roadGeometry } from '../geometry/roadGeometry';
import { entrance, neighbors } from './navigation';
import { seededRandom } from './random';
export type DevelopmentMode='fill'|'replace'|'connections';
export interface DevelopmentSettings { mode:DevelopmentMode; target:number; preferred:BuildingKind[]; density:'sparse'|'balanced'|'dense'; layout:RoadStyle; seed:number; roads:boolean; replaceIds:string[] }
export const defaultDevelopment:DevelopmentSettings={mode:'fill',target:5,preferred:[],density:'balanced',layout:'contextual',seed:1847,roads:true,replaceIds:[]};
export const districtBuildings:Record<DistrictType,BuildingKind[]>={residential:['cottage','longhouse','stables'],harbour:['fishinghut','warehouse','shipyard','harbour','storehouse','tavern'],farming:['farm','stables','mill','cottage','storehouse'],market:['market','storehouse','warehouse','tavern'],industrial:['blacksmith','sawmill','storehouse','warehouse','mill'],civic:['townhall','longhouse','market','tavern'],military:['barracks','watchtower','stables','storehouse'],custom:catalogue.map(b=>b.kind).filter(k=>k!=='bridge'&&k!=='palisade')};
export interface DevelopmentProposal {version:1;source:string;districtId:string;settings:DevelopmentSettings;id:string;buildings:Building[];roads:Road[];removeIds:string[];requested:number;placed:number;before:number;after:number;blocked:Record<string,number>;messages:string[]}
const hash=(value:string)=>{let n=2166136261;for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return(n>>>0).toString(36);};
export function developmentScope(doc:SettlementDocument,id:string){const d=doc.districts.find(d=>d.id===id);if(!d)throw new Error('Choose an existing district.');if(d.locked)throw new Error('Unlock the district before developing it. Object locks remain protected.');const other=new Set(doc.districts.filter(d=>d.id!==id).flatMap(d=>districtCells(d,doc).map(key)));return new Set(districtCells(d,doc).map(key).filter(k=>!other.has(k)));}
export function replaceableBuildings(doc:SettlementDocument,id:string){const scope=developmentScope(doc,id);return (districtMembership(doc).get(id)??[]).filter(b=>!b.locked&&footprintShare(b,scope)>=footprint(b).width*footprint(b).height-1e-8);}
function cellsOf(b:Building,margin=0){const f=footprint(b),cells:Cell[]=[];for(let y=Math.floor(b.y-margin);y<Math.ceil(b.y+f.height+margin);y++)for(let x=Math.floor(b.x-margin);x<Math.ceil(b.x+f.width+margin);x++)cells.push({x,y});return cells;}
/** Pure bounded district development. Pre-existing objects are protected irrespective of IDs/provenance. */
export function developDistrict(doc:SettlementDocument,districtId:string,input:DevelopmentSettings):DevelopmentProposal {
  const settings:DevelopmentSettings={...input,preferred:[...new Set(input.preferred)].sort(),replaceIds:[...new Set(input.replaceIds)].sort()};
  if(!['fill','replace','connections'].includes(settings.mode)||!['sparse','balanced','dense'].includes(settings.density)||!['organic','planned','contextual'].includes(settings.layout)||!Number.isSafeInteger(settings.seed)||!Number.isInteger(settings.target)||settings.target<1||settings.target>60||typeof settings.roads!=='boolean')throw new Error('Use a safe integer seed, 1–60 buildings and valid development settings.');
  const scope=developmentScope(doc,districtId),district=doc.districts.find(d=>d.id===districtId)!,type=district.type??'custom';
  if(settings.preferred.some(k=>!districtBuildings[type].includes(k)))throw new Error('Preferred building types must be compatible with this district.');
  const eligible=new Set(replaceableBuildings(doc,districtId).map(b=>b.id));
  if(settings.mode==='replace'&&(!settings.replaceIds.length||settings.replaceIds.length>60||settings.replaceIds.some(id=>!eligible.has(id))))throw new Error('Explicitly select 1–60 unlocked buildings whose entire footprints belong to this district.');
  if(settings.mode!=='replace'&&settings.replaceIds.length)throw new Error('Replacement selection is only permitted in replacement mode.');
  const source=JSON.stringify(doc),id=`development-${settings.seed}-${hash(source+districtId+JSON.stringify(settings))}`,random=seededRandom(settings.seed),blocked:Record<string,number>={};
  const reject=(reason:string)=>{blocked[reason]=(blocked[reason]??0)+1;};
  const proposal:DevelopmentProposal={version:1,source,districtId,settings,id,buildings:[],roads:[],removeIds:[],requested:settings.mode==='replace'?settings.replaceIds.length:settings.mode==='connections'?0:settings.target,placed:0,before:doc.buildings.length,after:doc.buildings.length,blocked,messages:[]};
  const points=[...scope].map(k=>{const [x,y]=k.split(',').map(Number);return{x,y};}).sort((a,b)=>a.y-b.y||a.x-b.x),tiles=terrainQuery(doc);
  const buildable=new Set(points.filter(p=>tiles.buildable(p)).map(key));
  const reserved=new Set((doc.planning?.openSpaces??[]).filter(s=>s.kind==='gathering'||s.kind==='working').flatMap(s=>s.cells.map(key)));
  const infra=new Set<string>(),walls=new Set<string>(),gates=new Set<string>(),targets=new Map<string,Cell>(),context=roadContext(doc);
  // Reserve both logical paths and full-width visual geometry once; smoothing never makes old navigation expendable.
  for(const r of doc.roads){const geometry=roadGeometry(doc,r,context),radius=infrastructureWidth(r)/2+.05;for(const p of [...geometry.samples,...sampledPath(r.points).map(p=>({x:p.x+.5,y:p.y+.5}))])for(let y=Math.floor(p.y-radius);y<=Math.floor(p.y+radius);y++)for(let x=Math.floor(p.x-radius);x<=Math.floor(p.x+radius);x++){const k=`${x},${y}`;if(!scope.has(k))continue;infra.add(k);if(isDefense(r)){if(r.surface==='gate')gates.add(k);else walls.add(k);}}
    if(!isDefense(r))for(const p of geometry.samples){const c={x:Math.floor(p.x),y:Math.floor(p.y)},k=key(c);if(!scope.has(k)||!tiles.walkable(c)||targets.has(k))continue;const hit=closestSegment(r,c);if(hit.distance<=.55&&scope.has(key({x:hit.point.x+.5,y:hit.point.y+.5}))&&(!isBridge(r)||r.points.some(e=>Math.hypot(e.x-hit.point.x,e.y-hit.point.y)<.1)))targets.set(k,hit.point);}
  }
  for(const k of gates)walls.delete(k);
  const resource=(b:Building,kind:'water'|'forest')=>{const queue=cellsOf(b).map(p=>({...p,distance:0})),seen=new Set(queue.map(key));for(let i=0;i<queue.length;i++){const p=queue[i];if(p.distance>=3)continue;for(const n of neighbors(p)){const k=key(n);if(seen.has(k)||!tiles.inside(n))continue;seen.add(k);if(kind==='water'?tiles.water(n):tiles.woodland(n))return true;if(tiles.step(p,n))queue.push({...n,distance:p.distance+1});}}return false;};
  const usedIds=new Set([...doc.buildings,...doc.roads].map(o=>o.id));let serial=0;const newId=(suffix:string)=>{let candidate:string;do{candidate=`${id}-${suffix}-${serial++}`;}while(usedIds.has(candidate));usedIds.add(candidate);return candidate;};
  const provenance=(replaces?:string):Provenance=>({version:1,source:'district-development',districtId,seed:settings.seed,proposalId:id,...(replaces?{replaces}:{})});
  const current=(removed?:string):SettlementDocument=>({...doc,buildings:[...doc.buildings.filter(b=>!proposal.removeIds.includes(b.id)&&b.id!==removed),...proposal.buildings],roads:[...doc.roads,...proposal.roads]});
  const occupancy=(buildings:Building[],margin=0)=>new Set(buildings.flatMap(b=>cellsOf(b,margin).map(key)));
  function navigation(work:SettlementDocument){const occupied=occupancy(work.buildings),parents=new Map<string,Cell|null>(),lengths=new Map<string,number>(),queue:Cell[]=[];for(const [k] of targets){const [x,y]=k.split(',').map(Number),p={x,y};if(scope.has(k)&&tiles.walkable(p)&&!occupied.has(k)&&!walls.has(k)){parents.set(k,null);lengths.set(k,1);queue.push(p);}}
    for(let i=0;i<queue.length;i++){const p=queue[i];for(const q of neighbors(p)){const k=key(q);if(scope.has(k)&&!parents.has(k)&&!occupied.has(k)&&!walls.has(k)&&tiles.step(p,q)){parents.set(k,p);lengths.set(k,lengths.get(key(p))!+1);queue.push(q);}}}return {parents,lengths};}
  function access(work:SettlementDocument,b:Building,network:ReturnType<typeof navigation>):Road|null|undefined {
    const parents=network.parents;
    const start=entrance(b),startKey=key(start);if(!scope.has(startKey)||!parents.has(startKey)){reject('No district-contained access to an existing road (water, slope, defense or boundary blocks access)');return undefined;}
    const path:Cell[]=[];let p:Cell|null=start;const own=occupancy([b]);while(p){if(own.has(key(p))){reject('Proposed footprint blocks its own entrance path');return undefined;}path.push(p);p=parents.get(key(p))??null;}
    const end=path[path.length-1],target=targets.get(key(end));if(target&&Math.hypot(end.x-target.x,end.y-target.y)>.001)path.push(target);
    if(path.length===1)return null;
    if(!settings.roads){reject('New access roads are disabled; entrance must already touch a road');return undefined;}
    const compact=path.filter((p,i,a)=>i===0||i===a.length-1||Math.abs((p.x-a[i-1].x)*(a[i+1].y-p.y)-(p.y-a[i-1].y)*(a[i+1].x-p.x))>1e-8);
    const road:Road={id:'draft',points:compact,layerId:district.layerId,editVersion:1,surface:'dirt',width:.2,kind:'access',style:settings.layout,provenance:provenance()};
    const scene={...work,buildings:work.buildings.some(o=>o.id===b.id)?work.buildings:[...work.buildings,b]};
    if(infrastructureWarnings(scene,road).length){reject('Access path has invalid terrain or intersects a footprint');return undefined;}
    const validVisual=(r:Road)=>roadGeometry(scene,r).samples.every(p=>{for(let y=Math.floor(p.y-.1);y<=Math.floor(p.y+.1);y++)for(let x=Math.floor(p.x-.1);x<=Math.floor(p.x+.1);x++)if(!scope.has(`${x},${y}`)||walls.has(`${x},${y}`))return false;return true;});
    if(!validVisual(road)){road.style='planned';if(!validVisual(road)){reject('Full-width path would leave the district or cross a defense');return undefined;}}
    return road;
  }
  const addRoad=(r:Road|null)=>{if(!r)return;for(const p of [...roadGeometry(current(),r).samples,...sampledPath(r.points).map(p=>({x:p.x+.5,y:p.y+.5}))])for(let y=Math.floor(p.y-.15);y<=Math.floor(p.y+.15);y++)for(let x=Math.floor(p.x-.15);x<=Math.floor(p.x+.15);x++)infra.add(`${x},${y}`);r.id=newId('path');proposal.roads.push(r);for(const p of r.points){const c={x:Math.round(p.x),y:Math.round(p.y)};targets.set(key(c),p);}for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)*3);for(let j=0;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n},c={x:Math.round(p.x),y:Math.round(p.y)};targets.set(key(c),p);infra.add(key(c));}}};
  if(settings.mode==='connections'){
    for(const b of districtMembership(doc).get(districtId)??[]){if(!scope.has(key(entrance(b)))){reject('Building entrance lies outside the selected district');continue;}const work=current(),r=access(work,b,navigation(work));if(r)addRoad(r);}proposal.requested=proposal.roads.length;proposal.placed=proposal.roads.length;
  }else {
    const gap=settings.density==='sparse'?2:settings.density==='dense'?.5:1,choices=settings.preferred.length?settings.preferred:districtBuildings[type];
    for(let index=0;index<proposal.requested;index++){
      const replaced=settings.mode==='replace'?settings.replaceIds[index]:undefined,work=current(replaced),spaced=occupancy(work.buildings,gap),parents=navigation(work),entries=new Set(work.buildings.map(b=>key(entrance(b))));
      const first=Math.floor(random()*choices.length),alternatives=[...choices.slice(first),...choices.slice(0,first)];let best:Building|undefined,bestRoad:Road|null=null,bestScore=Infinity;
      const rotationStart=Math.floor(random()*4),jitter=new Map(points.map(p=>[key(p),random()]));
      for(const kind of alternatives){const definition=buildingDefinition(kind);
      for(const p of points)for(let turn=0;turn<(settings.layout==='planned'?1:4);turn++){
        const b:Building={id:`${id}-candidate`,kind,name:definition.name,layerId:district.layerId,x:p.x,y:p.y,width:definition.width,height:definition.height,rotation:settings.layout==='planned'?0:((rotationStart+turn)%4)*90,locked:false,provenance:provenance(replaced)};
        const cells=cellsOf(b);if(cells.some(c=>!scope.has(key(c)))){reject('Footprint crosses a district or map boundary');continue;}
        if(cells.some(c=>!buildable.has(key(c)))||Math.max(...cells.map(c=>tiles.at(c).elevation))-Math.min(...cells.map(c=>tiles.at(c).elevation))>1){reject('Edited water, vegetation, rock or elevation prevents building');continue;}
        if(cells.some(c=>spaced.has(key(c))||infra.has(key(c))||reserved.has(key(c))||entries.has(key(c)))){reject('Protected building clearance, infrastructure, entrance or gathering space');continue;}
        if((['harbour','fishinghut','shipyard'].includes(kind)&&!resource(b,'water'))||(kind==='sawmill'&&!resource(b,'forest'))){reject('Required accessible water or woodland is too far away');continue;}
        const entry=entrance(b),distance=parents.lengths.get(key(entry))??Infinity;
        const centre=doc.planning?.centre??{x:p.x,y:p.y},score=distance*(settings.layout==='organic'?.55:.8)+(jitter.get(key(p))??0)*(settings.layout==='planned'?0:settings.layout==='organic'?9:7)+(settings.layout==='planned'?(p.x%5+p.y%5)*.5:0)+(type==='civic'?Math.hypot(p.x-centre.x,p.y-centre.y)*.3:0)+(type==='farming'&&tiles.at(p).ground==='soil'?-2:0)+(type==='military'?-tiles.at(p).elevation*.3-(neighbors(p).some(n=>!scope.has(key(n)))?1:0):0);
        if(score>=bestScore)continue;const road=access(work,b,parents);if(road===undefined)continue;best=b;bestRoad=road;bestScore=score;
      }
      if(best)break;}
      if(!best){proposal.messages.push(`${choices.map(k=>buildingDefinition(k).name).join(' / ')}: no safe footprint with valid district-contained road access. ${replaced?'The approved original is retained.':''}`);if(settings.mode==='fill')break;continue;}
      best.id=newId('building');proposal.buildings.push(best);if(replaced)proposal.removeIds.push(replaced);addRoad(bestRoad);
    }
    proposal.placed=proposal.buildings.length;
  }
  if(!targets.size)proposal.messages.push('No usable road or bridge bank inside this district. Draw a connection inside its boundary first.');
  if(proposal.placed<proposal.requested)proposal.messages.unshift(`Capacity: ${proposal.placed} of ${proposal.requested} fit. You may accept this smaller proposal; no constraints were relaxed.`);
  if(!proposal.buildings.length&&!proposal.roads.length)proposal.messages.push('No changes proposed. Existing objects remain untouched.');
  proposal.after=proposal.before-proposal.removeIds.length+proposal.buildings.length;return proposal;
}
/** Recompute the exact approved proposal against the unchanged source before committing. */
export function applyDevelopment(doc:SettlementDocument,proposal:DevelopmentProposal,replacementsConfirmed=false):SettlementDocument {
  if(JSON.stringify(doc)!==proposal.source)throw new Error('The project changed after preview. Cancel and generate a fresh proposal.');
  if(proposal.removeIds.length&&!replacementsConfirmed)throw new Error('Explicit replacement confirmation is required.');
  const verified=developDistrict(doc,proposal.districtId,proposal.settings);
  if(JSON.stringify(verified)!==JSON.stringify(proposal))throw new Error('Proposal changed or is invalid. Generate a fresh preview.');
  if(!proposal.buildings.length&&!proposal.roads.length)throw new Error('This proposal contains no changes.');
  return {...doc,buildings:[...doc.buildings.filter(b=>!proposal.removeIds.includes(b.id)),...proposal.buildings],roads:[...doc.roads,...proposal.roads]};
}
