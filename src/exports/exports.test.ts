import { describe, expect, it, vi } from 'vitest';
import { parseDocument, serializeDocument } from './json';
import { imageDimensions, mapSvg, renderPng } from './png';
import { createDocument } from '../model/document';
import { placeBuilding, paintTerrain } from '../model/operations';
import { generateSettlement } from '../generator/generate';
import { defaultSettings } from '../generator/settings';
describe('portable project JSON',()=>{
  it('round trips every generated field, including roads, planning, IDs and positions',()=>{const doc=generateSettlement({...defaultSettings,count:20,width:72,height:72});expect(parseDocument(serializeDocument(doc))).toEqual(doc);});
  it('upgrades old exported v1 files while preserving original IDs and one-tile placement',()=>{const doc={...createDocument(),version:1,buildings:[{id:'old',kind:'longhouse',layerId:'settlement',x:8,y:9}]};expect(parseDocument(JSON.stringify(doc)).buildings[0]).toMatchObject({id:'old',x:8,y:9,width:1,height:1});});
  it('rejects corrupt, unsupported, unsafe and inconsistent input before any storage action',()=>{
    expect(()=>parseDocument('{bad')).toThrow('valid JSON');expect(()=>parseDocument(JSON.stringify({...createDocument(),version:99}))).toThrow('Unsupported');
    const bads=[{...createDocument(),grid:{...createDocument().grid,width:0}}, {...createDocument(),buildings:[{id:'bad',kind:'not-a-building'}]}, {...createDocument(),roads:[{id:'r',layerId:'missing',points:[]}]}, {...createDocument(),terrain:[{x:1,y:1,kind:'lava'}]}];
    for(const bad of bads)expect(()=>parseDocument(JSON.stringify(bad))).toThrow('Invalid');expect(()=>parseDocument('{"__proto__":{}}')).toThrow('unsafe');
  });
  it('preserves legitimate out-of-map buildings so existing collision-warning workflows survive import',()=>{const doc=placeBuilding(createDocument(),{x:-2,y:120},'longhouse','outside');expect(parseDocument(serializeDocument(doc))).toEqual(doc);});
});
describe('full-map image export scene',()=>{
  it('computes complete-map resolution independently of viewport, including rectangular maps',()=>{const doc=createDocument();doc.grid.width=192;doc.grid.height=96;expect(imageDimensions(doc,4096)).toEqual({width:4096,height:2048});expect(()=>imageDimensions(doc,8192)).toThrow('resolution');});
  it('includes terrain, far-edge structures and roads, with explicit grid and escaped label options',()=>{
    const doc=paintTerrain(placeBuilding(createDocument(),{x:92,y:92},'cottage','far-edge'),{x:0,y:0},'water');doc.buildings[0].name='<script>& Viking';doc.roads=[{id:'route',layerId:'settlement',points:[{x:1,y:1},{x:1,y:2}]}];
    const a=mapSvg(doc,{resolution:2048,grid:false,labels:false}),b=mapSvg(doc,{resolution:4096,grid:true,labels:true});
    expect(a).toContain('viewBox="0 0 96 96"');expect(a).toContain('data-building="far-edge"');expect(a).toContain('x="92"');expect(a).toContain('data-road="route"');expect(a).toContain('#355d69');expect(a).not.toContain('data-grid');expect(a).not.toContain('data-label');expect(b).toContain('width="4096"');expect(b).toContain('data-grid');expect(b).toContain('&lt;script&gt;&amp; Viking');expect(b).not.toContain('<script>');
    const hidden={...doc,layers:doc.layers.map(l=>({...l,visible:false}))};expect(mapSvg(hidden,{resolution:1024,grid:false,labels:false})).not.toContain('data-building');
  });
  it('reports encoding/memory failure and releases temporary image resources',async()=>{
    const canvas={width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(callback:(b:Blob|null)=>void)=>callback(null)};
    class TestImage { onload?:()=>void; set src(_value:string){queueMicrotask(()=>this.onload?.());} }
    vi.stubGlobal('Image',TestImage);vi.stubGlobal('document',{createElement:()=>canvas});
    const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    try { await expect(renderPng(createDocument(),{resolution:2048,grid:false,labels:false})).rejects.toThrow(/PNG export failed.*Try 1024/);expect(revoke).toHaveBeenCalledWith('blob:test');expect(canvas.width).toBe(0);expect(canvas.height).toBe(0); }
    finally {create.mockRestore();revoke.mockRestore();vi.unstubAllGlobals();}
  });

});
