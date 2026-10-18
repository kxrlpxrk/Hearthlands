import type { Building, Cell, Road, SettlementDocument } from '../model/document';
import { districtCells, districtTypes, key, type District, type DistrictType } from '../model/districts';
import { terrainQuery, legacyTerrain, sameTerrain } from '../model/terrain';
import { footprint } from '../model/buildings';
import { closestSegment, infrastructureWarnings, infrastructureWidth, isBridge, isDefense, sampledPath } from '../model/infrastructure';
import { roadContext, roadGeometry } from '../geometry/roadGeometry';
import { developDistrict, defaultDevelopment, type DevelopmentSettings } from './development';
import { seededRandom } from './random';
import { neighbors } from './navigation';
import { validateDocument } from '../model/validation';
export interface ExpansionSettings { stage:'village'|'trading'|'fortified'|'custom'; target:number; density:DevelopmentSettings['density']; layout:DevelopmentSettings['layout']; seed:number; priorities:DistrictType[]; districts:boolean; roads:boolean; width:number; height:number }
export const defaultExpansion:ExpansionSettings={stage:'village',target:50,density:'balanced',layout:'contextual',seed:1847,priorities:[],districts:true,roads:true,width:96,height:96};
export interface ExpansionProposal {version:1;source:string;id:string;settings:ExpansionSettings;document:SettlementDocument;buildings:Building[];roads:Road[];districts:District[];requested:number;placed:number;blocked:Record<string,number>;messages:string[]}
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(36);};
/** East/south extension only. Old arrays, overrides and coordinates are never rewritten.
 * Boundary effective terrain is continued, with seeded vegetation breaks inland. Elevation
 * remains at the nearest old edge height, avoiding an artificial cliff at the join. */
export function enlargeMap(doc:SettlementDocument,width:number,height:number,seed:number):SettlementDocument{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<doc.grid.width||height<doc.grid.height||width>192||height>192)throw new Error('Enlarge east/south only, up to 192 × 192 tiles. Never shrink or translate the map.');
 if(width===doc.grid.width&&height===doc.grid.height)return doc;
 const q=terrainQuery(doc),terrain=[...doc.terrain],cells=[...doc.landscape.cells],random=seededRandom(seed);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(x<doc.grid.width&&y<doc.grid.height)continue;const edge=q.at({x:Math.min(x,doc.grid.width-1),y:Math.min(y,doc.grid.height-1)}),distance=Math.max(x-doc.grid.width+1,y-doc.grid.height+1),variation=random();
 const t={...edge,x,y};if(distance>3&&t.water<.5&&t.vegetation>=.6&&variation<.2)t.vegetation=.3;
 const kind=t.water>=.5?'water':t.vegetation>=.6?'forest':t.rocks>=.6?'stone':'grass';terrain.push({x,y,kind});const legacy=legacyTerrain({x,y},kind);if(!sameTerrain(t,legacy))cells.push(t);
 }
 return {...doc,grid:{...doc.grid,width,height},terrain,landscape:{...doc.landscape,cells}};
}
function normalize(doc:SettlementDocument,input:ExpansionSettings):ExpansionSettings{
 const s={...input,priorities:[...new Set(input.priorities)]};
 if(!['village','trading','fortified','custom'].includes(s.stage)||!['organic','planned','contextual'].includes(s.layout)||!['sparse','balanced','dense'].includes(s.density)||!Number.isSafeInteger(s.seed)||!Number.isInteger(s.target)||s.target<doc.buildings.length||s.target>100||s.priorities.some(t=>!Object.keys(districtTypes).includes(t))||typeof s.districts!=='boolean'||typeof s.roads!=='boolean')throw new Error('Use a target from the current count to 100, a safe integer seed and valid expansion settings.');
 return s;
}
/** Pure, bounded incremental growth. Worker owns execution; progress never mutates documents. */
export function expandSettlement(source:SettlementDocument,input:ExpansionSettings,progress:(message:string)=>void=()=>{}):ExpansionProposal{
 const settings=normalize(source,input),signature=JSON.stringify(source),id=`expansion-${hash(signature+JSON.stringify(settings))}`,random=seededRandom(settings.seed);
 let work=enlargeMap(source,settings.width,settings.height,settings.seed);
 const proposal:ExpansionProposal={version:1,source:signature,id,settings,document:work,buildings:[],roads:[],districts:[],requested:settings.target-source.buildings.length,placed:0,blocked:{},messages:[]};
 const usedIds=new Set([...source.buildings,...source.roads,...source.districts].map(o=>o.id));let serial=0;
 const newId=(kind:string)=>{let candidate;do{candidate=`${id}-${kind}-${serial++}`;}while(usedIds.has(candidate));usedIds.add(candidate);return candidate;};
 const remaining=()=>settings.target-work.buildings.length;
 function fill(district:District,count:number){
  progress(`Planning ${district.name} · ${work.buildings.length} / ${settings.target} buildings`);
  const draft=developDistrict(work,district.id,{...defaultDevelopment,target:Math.min(10,count),density:settings.density,layout:settings.layout,seed:(settings.seed^serial),roads:settings.roads,preferred:[],replaceIds:[]});
  for(const [reason,count] of Object.entries(draft.blocked))proposal.blocked[reason]=(proposal.blocked[reason]??0)+count;
  const provenance={version:1 as const,source:'settlement-expansion' as const,districtId:district.id,seed:settings.seed,proposalId:id};
  const buildings=draft.buildings.map(b=>({...b,id:newId('building'),provenance})),roads=draft.roads.map(r=>({...r,id:newId('access'),provenance}));
  work={...work,buildings:[...work.buildings,...buildings],roads:[...work.roads,...roads]};proposal.buildings.push(...buildings);proposal.roads.push(...roads);return buildings.length;
 }
 // Filling does not change a district's identity, geometry, metadata or lock state.
 let infillBudget=settings.districts?Math.min(5,Math.floor(proposal.requested/4)):proposal.requested;
 for(const d of source.districts){if(remaining()<=0||infillBudget<=0)break;if(d.locked)continue;if(settings.priorities.length&&!settings.priorities.includes(d.type??'custom'))continue;do{const fitted=fill(d,Math.min(remaining(),infillBudget,settings.districts?2:10));infillBudget-=fitted;if(!fitted||settings.districts)break;}while(remaining()>0&&infillBudget>0);}
 const types:DistrictType[]=settings.priorities.length?settings.priorities:settings.stage==='trading'?['market','residential','industrial','farming','civic']:settings.stage==='fortified'?['military','residential','farming','industrial']:['residential','farming','market','industrial'];
 const tiles=terrainQuery(work),claims=new Set(work.districts.flatMap(d=>districtCells(d,work).map(key))),locked=new Set(work.districts.filter(d=>d.locked).flatMap(d=>districtCells(d,work).map(key)));
 const reserved=new Set((work.planning?.openSpaces??[]).filter(s=>s.kind==='gathering'||s.kind==='working'||s.kind==='yard'||s.kind==='field').flatMap(s=>s.cells.map(key)));
 const centre=work.planning?.centre??{x:source.buildings.reduce((n,b)=>n+b.x,0)/Math.max(1,source.buildings.length),y:source.buildings.reduce((n,b)=>n+b.y,0)/Math.max(1,source.buildings.length)};
 const tried=new Set<string>();let attempts=0;
 while(settings.districts&&remaining()>0&&attempts++<16){
  const occupied=new Set<string>(),blocked=new Set<string>(),targets=new Map<string,Cell>();
  for(const b of work.buildings){const f=footprint(b);for(let y=Math.floor(b.y);y<Math.ceil(b.y+f.height);y++)for(let x=Math.floor(b.x);x<Math.ceil(b.x+f.width);x++)occupied.add(`${x},${y}`);}
  for(const k of occupied)blocked.add(k);for(const k of locked)blocked.add(k);
  const context=roadContext(work),gates=new Set<string>();
  for(const r of work.roads){const g=roadGeometry(work,r,context);if(isDefense(r)){const radius=infrastructureWidth(r)/2+.1;for(const p of [...g.samples,...sampledPath(r.points).map(p=>({x:p.x+.5,y:p.y+.5}))])for(let y=Math.floor(p.y-radius);y<=Math.floor(p.y+radius);y++)for(let x=Math.floor(p.x-radius);x<=Math.floor(p.x+radius);x++)(r.surface==='gate'?gates:blocked).add(`${x},${y}`);}else for(const p of g.samples){const c={x:Math.floor(p.x),y:Math.floor(p.y)},hit=closestSegment(r,c);if(tiles.walkable(c)&&hit.distance<=.55&&(!isBridge(r)||r.points.some(e=>Math.hypot(e.x-hit.point.x,e.y-hit.point.y)<.1)))targets.set(key(c),hit.point);}}
  for(const k of gates)if(!occupied.has(k)&&!locked.has(k))blocked.delete(k);
  // One global flood per district: only reachable land is eligible. It never crosses
  // water or defenses; existing bridges may be attachment targets at their banks.
  const parents=new Map<string,Cell|null>(),length=new Map<string,number>(),queue:Cell[]=[];
  for(const [k] of targets){if(blocked.has(k))continue;const [x,y]=k.split(',').map(Number);parents.set(k,null);length.set(k,0);queue.push({x,y});}
  for(let i=0;i<queue.length;i++){const p=queue[i];for(const n of neighbors(p)){const k=key(n);if(!parents.has(k)&&!blocked.has(k)&&tiles.step(p,n)){parents.set(k,p);length.set(k,length.get(key(p))!+1);queue.push(n);}}}
  const nextType=types[proposal.districts.length%types.length];
  const affinity=(p:Cell)=>{if(nextType!=='harbour'&&nextType!=='industrial')return 0;let nearest=12;for(let dy=-8;dy<=8;dy+=2)for(let dx=-8;dx<=8;dx+=2){const c={x:p.x+dx,y:p.y+dy};if(nextType==='harbour'?tiles.water(c):tiles.woodland(c))nearest=Math.min(nearest,Math.hypot(dx,dy));}return nearest*(nextType==='harbour'?6:1);};
  const candidates=queue.filter(p=>!claims.has(key(p))&&!reserved.has(key(p))&&!tried.has(key(p))&&tiles.buildable(p)&&p.x>5&&p.y>5&&p.x<work.grid.width-6&&p.y<work.grid.height-6).map(p=>({p,score:affinity(p)+length.get(key(p))!*1.5+Math.hypot(p.x-centre.x,p.y-centre.y)*.12+random()*12})).sort((a,b)=>a.score-b.score||a.p.y-b.p.y||a.p.x-b.p.x);
  const anchor=candidates.find(({p})=>{let free=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const c={x:p.x+dx,y:p.y+dy},k=key(c);if(tiles.buildable(c)&&!claims.has(k)&&!occupied.has(k)&&!reserved.has(k))free++;}return free>=45;})?.p;
  if(!anchor){proposal.messages.push('No further reachable, unclaimed neighbourhood has enough clear land. Check locked claims, woodland, elevation, water and defenses; manually connect a road, clear land or add a gate/bridge where needed.');break;}
  const cells:Cell[]=[],seen=new Set([key(anchor)]),patch=[anchor],radius=settings.density==='sparse'?16:13;
  for(let i=0;i<patch.length;i++){const p=patch[i],k=key(p);if(claims.has(k)||reserved.has(k)||!tiles.walkable(p)||Math.hypot(p.x-anchor.x,p.y-anchor.y)>radius+(settings.layout==='planned'?0:Math.sin(p.x*.31+p.y*.23+settings.seed)*2))continue;cells.push(p);for(const n of neighbors(p)){const k=key(n);if(!seen.has(k)&&tiles.inside(n)){seen.add(k);patch.push(n);}}}
  for(const p of cells)tried.add(key(p));
  if(cells.length<50)continue;
  const type=types[proposal.districts.length%types.length],direction=Math.abs(anchor.x-centre.x)>Math.abs(anchor.y-centre.y)?anchor.x>centre.x?'East':'West':anchor.y>centre.y?'South':'North',names:Record<DistrictType,string>={residential:'homesteads',harbour:'waterfront',farming:'farmsteads',market:'market',industrial:'workshops',civic:'meeting ground',military:'defensive quarter',custom:'quarter'},district:District={editVersion:1,id:newId('district'),name:`${direction} ${names[type]} ${proposal.districts.length+1}`,type,color:districtTypes[type].color,layerId:source.layers[0].id,cells,locked:false,visible:true};
  const path:Cell[]=[];let p:Cell|null=anchor;while(p){path.push(p);p=parents.get(key(p))??null;}const endpoint=path[path.length-1],target=targets.get(key(endpoint));if(target&&Math.hypot(target.x-endpoint.x,target.y-endpoint.y)>.001)path.push(target);
  let route:Road|undefined;
  if(path.length>1){if(!settings.roads)continue;const points=path.filter((p,i,a)=>!i||i===a.length-1||(p.x-a[i-1].x)*(a[i+1].y-p.y)!==(p.y-a[i-1].y)*(a[i+1].x-p.x));route={id:newId('route'),layerId:district.layerId,points,width:.3,kind:proposal.districts.length?'secondary':'primary',style:settings.layout,editVersion:1,surface:settings.stage==='trading'?'gravel':'dirt',provenance:{version:1,source:'settlement-expansion',districtId:district.id,seed:settings.seed,proposalId:id}};if(infrastructureWarnings(work,route).length)continue;
   // Use straight geometry if corner smoothing would cross a protected district or defense.
   const validVisual=(r:Road)=>roadGeometry(work,r).samples.every(p=>{for(let y=Math.floor(p.y-.15);y<=Math.floor(p.y+.15);y++)for(let x=Math.floor(p.x-.15);x<=Math.floor(p.x+.15);x++)if(blocked.has(`${x},${y}`))return false;return true;});
   if(!validVisual(route)){route.style='planned';if(!validVisual(route))continue;}
  }
  const before=work;work={...work,districts:[...work.districts,district],roads:route?[...work.roads,route]:work.roads};
  const fitted=fill(district,remaining());
  if(!fitted){work=before;continue;}
  if(route)proposal.roads.push(route);proposal.districts.push(district);for(const c of cells)claims.add(key(c));
 }
 proposal.placed=proposal.buildings.length;proposal.document=work;
 if(remaining()>0)proposal.messages.push(`Fits ${proposal.placed} of ${proposal.requested} additional buildings. Protected district claims, terrain/resources, clearance or access limit capacity. Accept this smaller valid proposal, try denser spacing / another priority, clear land manually, add a gate or bridge, or enlarge east/south. No existing objects were changed.`);
 if(settings.districts)proposal.messages.push('Growth favours new neighbourhoods: existing districts receive at most five infill buildings in total. Existing gathering grounds stay open. Capacity describes this protected growth plan, not maximum map packing.');
 if(!settings.districts)proposal.messages.push('New districts disabled: only available space in existing unlocked districts was considered.');
 if(!settings.roads)proposal.messages.push('New roads disabled: only entrances already touching the road network are eligible.');
 if(work.grid.width===192&&work.grid.height===192)proposal.messages.push('Maximum map size reached (192 × 192). Further enlargement is unavailable.');
 return proposal;
}
/** Validate the complete deterministic proposal again before the recovery transaction. */
export function applyExpansion(doc:SettlementDocument,p:ExpansionProposal,confirmEnlargement=false):SettlementDocument{
 if(p.source!==JSON.stringify(doc))throw new Error('Project changed after preview. Generate a fresh expansion.');
 if((p.settings.width!==doc.grid.width||p.settings.height!==doc.grid.height)&&!confirmEnlargement)throw new Error('Explicitly confirm east/south map enlargement.');
 if(!p.placed)throw new Error('No additional buildings fit. Original project unchanged.');
 const expected=expandSettlement(doc,p.settings);
 if(JSON.stringify(expected)!==JSON.stringify(p))throw new Error('Expansion proposal failed deterministic validation.');
 validateDocument(p.document);return p.document;
}
