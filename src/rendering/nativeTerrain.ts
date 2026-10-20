import type {TerrainPath,TerrainChunk} from './terrainGeometry';
const nativePaths=new WeakMap<{data:string},Path2D>();
/** Native SVG-path parsing avoids expensive JS curve-length analysis. Weak entries
 * follow scene lifetimes; the settlement model never contains canvas objects. */
export function nativeTerrainPath(p:Pick<TerrainPath,'data'>):Path2D|null{
 if(typeof Path2D==='undefined')return null;
 let path=nativePaths.get(p);if(!path){path=new Path2D(p.data);nativePaths.set(p,path);}return path;
}

const nativeChunks=new WeakMap<TerrainPath,{bounds:TerrainChunk['bounds'];path:Path2D}[]>();
export function nativeTerrainChunks(p:TerrainPath){
 if(!p.chunks||typeof Path2D==='undefined')return null;
 let chunks=nativeChunks.get(p);if(!chunks){chunks=p.chunks.map(c=>({bounds:c.bounds,path:nativeTerrainPath(c)!}));nativeChunks.set(p,chunks);}return chunks;
}
/** Canvas-space culling also works inside Konva's bounded overview cache. */
export function terrainChunkVisible(b:TerrainChunk['bounds'],m:{a:number;b:number;c:number;d:number;e:number;f:number},width:number,height:number){
 const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
 return Math.max(...points.map(p=>p.x))>=0&&Math.min(...points.map(p=>p.x))<=width&&Math.max(...points.map(p=>p.y))>=0&&Math.min(...points.map(p=>p.y))<=height;
}

const visiblePaths=new WeakMap<TerrainPath,{key:string;path:Path2D|null}>();
/** One fill/stroke per paint batch preserves alpha at overlaps and chunk edges.
 * addPath copies native geometry only when the visible chunk set changes. */
export function visibleTerrainPath(p:TerrainPath,chunks:NonNullable<ReturnType<typeof nativeTerrainChunks>>,matrix:Parameters<typeof terrainChunkVisible>[1],width:number,height:number):Path2D|null{
 const visible=chunks.map((c,i)=>terrainChunkVisible(c.bounds,matrix,width,height)?i:-1).filter(i=>i>=0),key=visible.join(',');
 const previous=visiblePaths.get(p);if(previous?.key===key)return previous.path;
 const path=visible.length?new Path2D():null;
 if(path)for(const i of visible)path.addPath(chunks[i].path);
 visiblePaths.set(p,{key,path});return path;
}
