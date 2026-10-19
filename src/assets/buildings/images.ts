import painted from './png/hearthlands-viking-longhouse-02.png?inline';
import mossy from './png/hearthlands-viking-longhouse-03.png?inline';
import ravenfjord from './png/hearthlands-viking-longhouse-01.png?inline';
import timber from './png/demo-viking-timber-longhouse.png?inline';
import turf from './png/demo-viking-turf-longhouse.png?inline';
/** Closed build-time allowlist. Vite inlines trusted PNG bytes; no runtime URL, fetch,
 * base-path assumption, CORS dependency or image blob is stored in project data. */
const installedImages:Readonly<Record<string,string>>={
 'buildings/hearthlands-viking-longhouse-02.png':painted,
 'buildings/hearthlands-viking-longhouse-03.png':mossy,
 'buildings/hearthlands-viking-longhouse-01.png':ravenfjord,
 'buildings/demo-viking-timber-longhouse.png':timber,
 'buildings/demo-viking-turf-longhouse.png':turf,
};
export const safeImageReference=(source:string)=>/^buildings\/[a-z0-9][a-z0-9-]*\.png$/.test(source);
interface InstalledPng {source:string;width:number;height:number}
const inspected=new Map<string,InstalledPng|undefined>();
/** Inspect the immutable PNG header once, not for every thumbnail/building/frame. */
export function bundledImageInfo(reference:string):InstalledPng|undefined {
 if(!safeImageReference(reference)||!Object.hasOwn(installedImages,reference))return undefined;
 if(inspected.has(reference))return inspected.get(reference);
 const source=installedImages[reference];let result:InstalledPng|undefined;
 if(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source))try{
  const header=atob(source.slice(source.indexOf(',')+1,source.indexOf(',')+45));
  const read=(offset:number)=>[0,1,2,3].reduce((n,i)=>n*256+header.charCodeAt(offset+i),0);
  const width=read(16),height=read(20);
  if(header.slice(0,8)==='\x89PNG\r\n\x1a\n'&&header.slice(12,16)==='IHDR'&&header.charCodeAt(24)===8&&header.charCodeAt(25)===6&&[width,height].every(n=>n>=32&&n<=4096)&&width*height<=8_388_608)result={source,width,height};
 }catch{/* Invalid build-time file is never used as an image URL. */}
 inspected.set(reference,result);return result;
}
export const bundledImageSource=(reference:string)=>bundledImageInfo(reference)?.source;
