import { infrastructureStrokes } from '../rendering/infrastructureGeometry';
import type { SettlementDocument } from '../model/document';
import { footprint } from '../model/buildings';
import { buildingDefinition } from '../model/catalogue';
import { symbolPaths } from '../rendering/symbols';
import { roadContext, roadGeometry } from '../rendering/roadGeometry';
export interface ImageOptions { resolution: number; grid: boolean; labels: boolean }
export function imageDimensions(doc: SettlementDocument, resolution: number) {
  if (!Number.isInteger(resolution) || resolution < 256 || resolution > 4096) throw new Error('Choose a PNG resolution from 256 to 4096 pixels.');
  const scale=resolution/Math.max(doc.grid.width,doc.grid.height),width=Math.round(doc.grid.width*scale),height=Math.round(doc.grid.height*scale);
  if(width*height>16_777_216)throw new Error('Image is too large. Choose a smaller resolution.');
  return {width,height};
}
const escapeText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Complete world-space scene shared by all viewport-independent PNG sizes. No remote assets. */
export function mapSvg(doc: SettlementDocument, options: ImageOptions): string {
  const size=imageDimensions(doc,options.resolution),colors={grass:'#536447',water:'#355d69',forest:'#294c3e',stone:'#737775'},tiles=new Map(doc.terrain.map(t=>[`${t.x},${t.y}`,t.kind]));
  const terrain=(Object.keys(colors) as (keyof typeof colors)[]).map(kind=>`<path fill="${colors[kind]}" d="${doc.terrain.filter(t=>t.kind===kind).map(t=>`M${t.x} ${t.y}h1v1h-1z`).join('')}"/>`).join('');
  const spaces=(doc.planning?.openSpaces??[]).filter(s=>s.kind!=='expansion').map(s=>`<path fill="${s.kind==='field'?'#71734d':s.kind==='yard'?'#59694b':'#777052'}" opacity=".65" d="${s.cells.filter(c=>(tiles.get(`${c.x},${c.y}`)??'grass')==='grass').map(c=>`M${c.x} ${c.y}h1v1h-1z`).join('')}"/>`).join('');
  const visible=(id:string)=>doc.layers.find(l=>l.id===id)?.visible;
  const context=roadContext(doc),roads=doc.roads.filter(r=>visible(r.layerId)).map(r=>{const g=roadGeometry(doc,r,context);return `<g data-road="${escapeText(r.id)}">${infrastructureStrokes(r,g).map(s=>`<path d="${s.data}" stroke="${s.color}" stroke-width="${s.width}" ${s.dash?`stroke-dasharray="${s.dash.join(' ')}"`:''} fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g>`;}).join('');
  const grid=options.grid?`<path data-grid="true" stroke="#a5b78e" opacity=".2" stroke-width=".035" d="${Array.from({length:doc.grid.width+1},(_,x)=>`M${x} 0V${doc.grid.height}`).join('')}${Array.from({length:doc.grid.height+1},(_,y)=>`M0 ${y}H${doc.grid.width}`).join('')}"/>`:'';
  const buildings=doc.buildings.filter(b=>visible(b.layerId)).map(b=>{
    const f=footprint(b),w=b.width,h=b.height;
    return `<g data-building="${escapeText(b.id)}"><rect x="${b.x}" y="${b.y}" width="${f.width}" height="${f.height}" fill="${b.locked?'#625f4d':'#997343'}" stroke="#292d24" stroke-width=".07"/><g transform="translate(${b.x+f.width/2} ${b.y+f.height/2}) rotate(${b.rotation}) translate(${-w/2+.125} ${-h/2+.125}) scale(${(w-.25)/64} ${(h-.25)/64})"><path d="${symbolPaths[buildingDefinition(b.kind).symbol]}" fill="#725535" stroke="#efd19a" stroke-width="2"/></g><rect x="${b.x+Math.floor(f.width/2)}" y="${b.y+f.height-.125}" width=".6" height=".16" fill="#f7dda5"/>${b.locked?`<rect x="${b.x+.1}" y="${b.y+.1}" width=".25" height=".25" fill="#c8d4de"/>`:''}</g>`;
  }).join('');
  const labels=options.labels?doc.buildings.filter(b=>visible(b.layerId)).map(b=>{const f=footprint(b);return `<text data-label="true" x="${b.x+f.width/2}" y="${b.y+f.height+.85}" text-anchor="middle" font-family="sans-serif" font-size=".65" fill="#f6ead0" stroke="#152019" stroke-width=".12" paint-order="stroke">${escapeText(b.name)}</text>`;}).join(''):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${doc.grid.width} ${doc.grid.height}"><title>${escapeText(doc.name)}</title><rect width="${doc.grid.width}" height="${doc.grid.height}" fill="#344536"/>${terrain}${spaces}${grid}${roads}${buildings}${labels}</svg>`;
}
export async function renderPng(doc: SettlementDocument, options: ImageOptions): Promise<Blob> {
  const {width,height}=imageDimensions(doc,options.resolution);
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
