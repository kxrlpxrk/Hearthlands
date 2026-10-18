import type {TerrainPath} from './terrainGeometry';
const nativePaths=new WeakMap<TerrainPath,Path2D>();
/** Native SVG-path parsing avoids expensive JS curve-length analysis. Weak entries
 * follow scene lifetimes; the settlement model never contains canvas objects. */
export function nativeTerrainPath(p:TerrainPath):Path2D|null{
 if(typeof Path2D==='undefined')return null;
 let path=nativePaths.get(p);if(!path){path=new Path2D(p.data);nativePaths.set(p,path);}return path;
}
