import { terrainQuery } from '../model/terrain';
import type { Cell, SettlementDocument, SettlementPlan } from '../model/document';
import { cellKey, roadRoot, settlementLand } from './navigation';
import { connect } from './routing';
import { landscape, noise } from './noise';
import type { GenerationSettings } from './settings';
import { GenerationError } from './settings';
export function planSettlement(doc: SettlementDocument, s: GenerationSettings): SettlementPlan {
  const land = settlementLand(doc), tiles = terrainQuery(doc), scale = Math.min(s.width, s.height) / 96;
  const open = (target: Cell, radius = 2): Cell => {
    let best: Cell | undefined, score = Infinity;
    for (const k of land) {
      const [x, y] = k.split(',').map(Number); let valid = true;
      for (let yy = y - radius; yy <= y + radius && valid; yy++) for (let xx = x - radius; xx <= x + radius; xx++) if (!land.has(`${xx},${yy}`)) { valid = false; break; }
      if (!valid) continue;
      const d = Math.hypot(x - target.x, y - target.y) + noise(s.seed + 21, x / 9, y / 9) * 2;
      if (d < score) { best = { x, y }; score = d; }
    }
    if (!best) throw new GenerationError('No open ground for a gathering place and building clusters. Try a larger map or another seed.');
    return best;
  };
  let waterfront: Cell | undefined, waterScore = Infinity;
  for (const k of land) {
    const [x, y] = k.split(',').map(Number);
    if (![[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy]) => tiles.water({x:x+dx,y:y+dy}))) continue;
    const d = Math.abs(y - s.height * .5) + Math.abs(x - s.width * .69) * .2;
    if (d < waterScore) { waterfront = { x, y }; waterScore = d; }
  }
  const centreTarget = s.preset === 'viking' && waterfront ? { x: waterfront.x - Math.max(8, 11 * scale), y: waterfront.y } : { x: s.width * .42, y: s.height * .49 };
  const centre = open(centreTarget);
  const clusterCount = Math.min(s.width,s.height) < 52 || s.count < 28 ? 2 : s.count < 35 ? 3 : 4;
  const spread = Math.max(7, Math.min(s.width,s.height) * .16);
  const clusters: SettlementPlan['clusters'] = [{ id: 'hearth', role: 'civic', centre, radius: Math.max(5, spread * .6) }];
  clusters.push({ id: 'upper-homesteads', role: 'residential', centre: open({x:centre.x-spread*.7,y:centre.y-spread}), radius: spread*.65 });
  let workshopTarget: Cell = roadRoot(doc,land), workshopScore = Infinity;
  for (const k of land) {
    const [x,y] = k.split(',').map(Number);
    if (![[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dy]) => tiles.woodland({x:x+dx,y:y+dy}))) continue;
    const d = Math.hypot(x-centre.x,y-centre.y) + Math.abs(y-centre.y)*.5;
    if (d < workshopScore) { workshopTarget={x,y}; workshopScore=d; }
  }
  const workshop = open(workshopTarget,1), farming = open({x:centre.x-spread*.9,y:centre.y+spread*1.2});
  if (clusterCount >= 3) clusters.push({id:'lower-homesteads',role:s.preset==='medieval'?'farming':'residential',centre:farming,radius:spread*.7});
  if (clusterCount >= 4) clusters.push({id:'working-quarter',role:s.preset==='viking'&&waterfront?'waterfront':'workshop',centre:s.preset==='viking'&&waterfront?open({x:waterfront.x-3,y:waterfront.y+spread*.5},1):workshop,radius:spread*.6});
  const openSpaces: SettlementPlan['openSpaces'] = [];
  const reserve = (kind: SettlementPlan['openSpaces'][number]['kind'], origin: Cell, radius: number) => {
    const cells: Cell[] = [];
    for (let y=Math.floor(origin.y-radius-1);y<=origin.y+radius+1;y++) for(let x=Math.floor(origin.x-radius-1);x<=origin.x+radius+1;x++) {
      const boundary = radius + (landscape(s.seed+63,x,y)-.5)*radius*.8;
      if (land.has(`${x},${y}`) && Math.hypot(x-origin.x,y-origin.y) <= boundary) cells.push({x,y});
    }
    if (cells.length) openSpaces.push({kind,cells});
  };
  reserve('gathering',centre,Math.max(1.5,Math.min(3.5,3*scale)));
  if (waterfront) reserve('working',open({x:waterfront.x-3,y:waterfront.y},1),Math.max(1.2,2.5*scale));
  reserve('expansion',open({x:centre.x+spread*.25,y:centre.y+spread*.8},1),Math.max(1.5,3.5*scale));
  if (s.preset==='medieval') reserve('field',farming,Math.max(2,4.5*scale));
  for(const c of clusters.filter(c=>c.role==='residential')) reserve('yard',c.centre,Math.max(1.2,1.8*scale));
  const network=new Map([[cellKey(centre),centre]]),primaryRoutes:Cell[][]=[];
  const destinations=[...clusters.slice(1).map(c=>c.centre),workshop];
  if(waterfront)destinations.push(open({x:waterfront.x-2,y:waterfront.y},1));
  for(const target of destinations){const points=connect(target,network,land,new Set(),s.layout);if(points.length>1){primaryRoutes.push(points);for(const c of points)network.set(cellKey(c),c);}}
  return {version:1,layout:s.layout,centre,clusters,waterfront,workshop,farming,openSpaces,primaryRoutes};
}
