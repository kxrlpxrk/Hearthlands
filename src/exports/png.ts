import {waterSvg} from '../rendering/waterGeometry';
import {groundUsesImages,groundMode,subtleOpacity,type GroundDetail} from '../rendering/groundDetail';
import {illustratedGroundPlan} from '../rendering/illustratedGround';
import {prepareGroundSurface,groundSurfaceSvg} from '../rendering/illustratedGroundSurface';
import {grasslandSvg} from '../rendering/grasslandSvg';
import {grasslandImages} from '../rendering/grasslandImages';
import type {GrasslandMode} from '../assets/grassland/registry';
import {forestImagesForPack} from '../rendering/forestImages';
import {forestAssetsById,allForestAssets,forestPackAssets,type ForestPack} from '../assets/forests/catalogue';
import type {ForestSprite} from '../rendering/forestPilot';
import {artworkHasShadow} from '../rendering/rasterGeometry';
import {prepareBundledImages} from '../rendering/bundledImages';
import {resolveBuildingAsset} from '../model/appearance';
import {assetTransform,artworkSvg} from '../rendering/buildingArtwork';
import {isBridge,isDefense} from '../model/infrastructure';
import { defaultDistrictView } from '../model/districts';
import { districtGeometry, visibleDistricts } from '../rendering/districtGeometry';
import { terrainScene } from '../rendering/scene';
import { buildingPresentation, reducedDetail, styleBackground, type VisualStyle } from '../rendering/styles';
import { infrastructureStrokes } from '../rendering/infrastructureGeometry';
import type { SettlementDocument } from '../model/document';
import { footprint } from '../model/buildings';
import { buildingDefinition } from '../model/catalogue';
import { symbolPaths } from '../rendering/symbols';
import { roadContext, roadGeometry } from '../rendering/roadGeometry';
export interface ImageOptions {groundDetail?:GroundDetail;ground63?:boolean;grassland?:GrasslandMode; forestPilot?:boolean; forestPack?:ForestPack; style?:VisualStyle; reduced?:boolean; resolution: number; grid: boolean; labels: boolean; contours?:boolean; detail?:boolean; districts?:boolean; districtNames?:boolean }
export function imageDimensions(doc: SettlementDocument, resolution: number) {
  if (!Number.isInteger(resolution) || resolution < 256 || resolution > 4096) throw new Error('Choose a PNG resolution from 256 to 4096 pixels.');
  const scale=resolution/Math.max(doc.grid.width,doc.grid.height),width=Math.round(doc.grid.width*scale),height=Math.round(doc.grid.height*scale);
  if(width*height>16_777_216)throw new Error('Image is too large. Choose a smaller resolution.');
  return {width,height};
}
const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Complete world-space scene shared by all viewport-independent PNG sizes. No remote assets. */
export function mapSvg(doc: SettlementDocument, options: ImageOptions): string {
  const size=imageDimensions(doc,options.resolution),style=options.style??'planning';
  if(!['planning','illustrated'].includes(style))throw new Error('Choose Planning or Illustrated PNG style.');
  const reduced=options.reduced??reducedDetail(style,options.resolution/Math.max(doc.grid.width,doc.grid.height));
  const pilot=style==='illustrated'&&options.forestPilot===true,pack=options.forestPack==='canopies'?'canopies':'pilot',images=forestImagesForPack(pack).snapshot();
  const meadow=grasslandImages.snapshot(),grassland=style==='illustrated'?options.grassland:'off';
  const paths=terrainScene(doc,{groundDetail:options.groundDetail,ground63:options.ground63,style,reduced,forestPilot:pilot,forestPack:pack,forestAssets:pilot?images.ready:[],grassland,grasslandAssets:meadow.ready,contours:options.contours??doc.landscape.contours,detail:options.detail??doc.landscape.detail});
  const used=new Set(paths.flatMap(p=>p.sprites?.map(s=>s.assetId)??[]));
  const definitions=[...used].map(id=>{const a=forestAssetsById.get(id)!,source=images.images.get(id)!.source;return `<image id="forest-pilot-source-${allForestAssets.indexOf(a)}" width="${a.pixelWidth}" height="${a.pixelHeight}" href="${source}"/>`;}).join('');
  const spriteSvg=(s:ForestSprite)=>{const a=forestAssetsById.get(s.assetId)!,b=a.alpha;return `<g data-forest-asset="${a.id}" transform="translate(${s.x} ${s.y}) rotate(${s.angle*180/Math.PI})"><svg x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" preserveAspectRatio="xMidYMid meet"><use href="#forest-pilot-source-${allForestAssets.indexOf(a)}"/></svg></g>`;};
  const fallback=pilot&&images.ready.length<forestPackAssets[pack].length?'<desc data-forest-fallback="true">Some pilot images are unavailable. Their original procedural crowns are retained.</desc>':'';
  const meadowScene=grasslandSvg(paths,meadow,options.resolution/Math.max(doc.grid.width,doc.grid.height));
  const meadowFallback=grassland&&grassland!=='off'&&meadow.failed.length?'<desc data-grassland-fallback="true">Unavailable meadow artwork retains the original quiet terrain.</desc>':'';
  const terrain=(meadowScene.defs?`<defs>${meadowScene.defs}</defs>`:'')+meadowFallback+(definitions?`<defs>${definitions}</defs>`:'')+fallback+paths.map(t=>t.water?waterSvg(t.water):t.subtle?`<g data-subtle-ground="true" opacity="${subtleOpacity(options.resolution/Math.max(doc.grid.width,doc.grid.height))}">${t.subtle.paths.map(p=>`<path d="${p.data}" fill="${p.fill??'none'}" stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" opacity="${p.opacity}"/>`).join('')}</g>`:t.ground63?groundSurfaceSvg(t.ground63,options.resolution/Math.max(doc.grid.width,doc.grid.height),true):t.grassland?meadowScene.content:t.sprites?t.sprites.map(spriteSvg).join(''):`<path data-terrain="true" data-layer="${t.layer}" d="${t.data}" fill="${t.fill??'none'}" ${t.stroke?`stroke="${t.stroke}" stroke-width="${t.width}"`:''} opacity="${t.opacity??1}"/>`).join('');
  const visible=(id:string)=>doc.layers.find(l=>l.id===id)?.visible;
  const context=roadContext(doc),roads=doc.roads.filter(r=>visible(r.layerId)).sort((a,b)=>Number(isBridge(a)||isDefense(a))-Number(isBridge(b)||isDefense(b))).map(r=>{const g=roadGeometry(doc,r,context);return `<g data-road="${escapeText(r.id)}" data-layer="${isBridge(r)||isDefense(r)?'infrastructure':'roads'}">${infrastructureStrokes(r,g,style,reduced).map(s=>`<path d="${s.data}" stroke="${s.color}" stroke-width="${s.width}" ${s.dash?`stroke-dasharray="${s.dash.join(' ')}"`:''} fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`;}).join('');
  const grid=options.grid?`<path data-grid="true" stroke="#a5b78e" opacity=".2" stroke-width=".035" d="${Array.from({length:doc.grid.width+1},(_,x)=>`M${x} 0V${doc.grid.height}`).join('')}${Array.from({length:doc.grid.height+1},(_,y)=>`M0 ${y}H${doc.grid.width}`).join('')}"/>`:'';
  const buildings=doc.buildings.filter(b=>visible(b.layerId)).map(b=>{
    const f=footprint(b),w=b.width,h=b.height,a=buildingPresentation(b,style,reduced);
    if(style==='illustrated'){
      const asset=resolveBuildingAsset(doc,b),t=assetTransform(b,asset),placement=asset.artwork.format==='bundled-image'?'':` translate(${t.x} ${t.y}) scale(${t.scaleX} ${t.scaleY})`;
      return `<g data-building="${escapeText(b.id)}" data-category="${a.category}" data-asset="${asset.id}">${a.shadow&&artworkHasShadow(asset)?`<g data-building-shadow="true" transform="translate(${b.x+f.width/2+.12} ${b.y+f.height/2+.16}) rotate(${b.rotation}) translate(${-w/2} ${-h/2}) translate(${t.x} ${t.y}) scale(${t.scaleX} ${t.scaleY})" opacity=".25">${artworkSvg(asset,true,a.shadowColor)}</g>`:''}<g transform="translate(${b.x+f.width/2} ${b.y+f.height/2}) rotate(${b.rotation}) translate(${-w/2} ${-h/2})${placement}">${artworkSvg(asset,reduced,undefined,b)}</g><rect x="${b.x+Math.floor(f.width/2)}" y="${b.y+f.height-.125}" width=".6" height=".16" fill="${a.entrance}"/>${b.locked?`<rect x="${b.x+.1}" y="${b.y+.1}" width=".3" height=".3" fill="${a.lock}" stroke="#203d3a" stroke-width=".04"/>`:''}</g>`;
    }
    return `<g data-building="${escapeText(b.id)}" data-category="${a.category}">${a.shadow?`<rect x="${b.x+.12}" y="${b.y+.16}" width="${f.width}" height="${f.height}" fill="${a.shadowColor}" opacity=".35"/>`:``}<rect x="${b.x}" y="${b.y}" width="${f.width}" height="${f.height}" fill="${a.base}" stroke="${a.outline}" stroke-width=".055"/><rect x="${b.x+.06}" y="${b.y+.06}" width="${Math.max(.1,f.width-.12)}" height=".14" fill="${a.accent}"/><g transform="translate(${b.x+f.width/2} ${b.y+f.height/2}) rotate(${b.rotation}) translate(${-w/2+.125} ${-h/2+.125}) scale(${(w-.25)/64} ${(h-.25)/64})"><path d="${symbolPaths[buildingDefinition(b.kind).symbol]}" fill="${a.roof}" stroke="${a.ink}" stroke-width="${style==='planning'?2.8:2}"/></g><rect x="${b.x+Math.floor(f.width/2)}" y="${b.y+f.height-.125}" width=".6" height=".16" fill="${a.entrance}"/>${b.locked?`<rect x="${b.x+.1}" y="${b.y+.1}" width=".3" height=".3" fill="${a.lock}" stroke="#203d3a" stroke-width=".04"/>`:''}</g>`;
  }).join('');
  const dv=doc.districtView??defaultDistrictView;
  const districtShapes=visibleDistricts(doc,options.districts===true||options.districtNames===true).map(d=>({district:d,...districtGeometry(doc,d)}));
  const districts=(options.districts??dv.visible)?districtShapes.map(g=>{const color=/^#[0-9a-f]{6}$/i.test(g.district.color)?g.district.color:'#8eaaa1';return `<g data-district="${escapeText(g.district.id)}"><path d="${g.fill}" fill="${color}" opacity="${dv.opacity}"/><path d="${g.boundary}" fill="none" stroke="${color}" stroke-width=".1" ${g.district.locked?'stroke-dasharray=".3 .2"':''}/></g>`;}).join(''):'';
  const districtNames=(options.districtNames??(dv.names&&dv.visible))?districtShapes.map(g=>`<text data-district-label="true" x="${g.label.x}" y="${g.label.y}" text-anchor="middle" font-family="sans-serif" font-size=".7" fill="#fff2c9" stroke="#26372b" stroke-width=".1" paint-order="stroke">${escapeText(g.district.name)}</text>`).join(''):'';
  const labels=options.labels?doc.buildings.filter(b=>visible(b.layerId)).map(b=>{const f=footprint(b);return `<text data-label="true" x="${b.x+f.width/2}" y="${b.y+f.height+.85}" text-anchor="middle" font-family="sans-serif" font-size=".65" fill="#f6ead0" stroke="#152019" stroke-width=".12" paint-order="stroke">${escapeText(b.name)}</text>`;}).join(''):'';
  return `<svg data-visual-style="${style}" xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${doc.grid.width} ${doc.grid.height}"><title>${escapeText(doc.name)}</title><rect width="${doc.grid.width}" height="${doc.grid.height}" fill="${styleBackground(style)}"/>${terrain}${grid}${districts}${districtNames}${roads}${buildings}<g data-layer="decorations"/>${labels}</svg>`;
}
export async function renderPng(doc: SettlementDocument, options: ImageOptions): Promise<Blob> {
  const {width,height}=imageDimensions(doc,options.resolution);
  if(options.style==='illustrated')await Promise.all([prepareBundledImages(doc.buildings.map(b=>resolveBuildingAsset(doc,b))),options.forestPilot?forestImagesForPack(options.forestPack).prepare():Promise.resolve(),groundUsesImages(options)?grasslandImages.prepare():Promise.resolve()]);
  if(options.style==='illustrated'&&groundMode(options)==='rich')try{await prepareGroundSurface(illustratedGroundPlan(doc),options.resolution/Math.max(doc.grid.width,doc.grid.height),true);}catch{throw new Error('Illustrated ground PNG preparation failed. Try 1024 pixels or turn the ground comparison off; your project is unchanged.');}
  const url=URL.createObjectURL(new Blob([mapSvg(doc,options)],{type:'image/svg+xml;charset=utf-8'}));
  const canvas=document.createElement('canvas');
  try {
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Map image could not be rendered.'));image.src=url;});
    canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');if(!context||canvas.width!==width||canvas.height!==height)throw new Error('Canvas memory is unavailable.');
    context.drawImage(image,0,0,width,height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed.')),'image/png'));
    return blob;
  } catch(error) { throw new Error(`PNG export failed: ${error instanceof Error?error.message:'Not enough image memory.'} Try 1024 or 2048 pixels; your project is unchanged.`); }
  finally {URL.revokeObjectURL(url);canvas.width=0;canvas.height=0;}
}
