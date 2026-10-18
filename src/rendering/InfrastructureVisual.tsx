import {memo,useMemo} from 'react';
import {Group,Path} from 'react-konva';
import type {Road} from '../model/document';
import type {roadGeometry} from './roadGeometry';
import type {VisualStyle} from './styles';
import {infrastructureStrokes} from './infrastructureGeometry';
/** Camera movement never rebuilds path ornamentation. Hit regions remain editor inputs. */
export const InfrastructureVisual=memo(function InfrastructureVisual({road,geometry,style,reduced,cell,hitWidth,interactive,active,conflict}:{road:Road;geometry:ReturnType<typeof roadGeometry>;style:VisualStyle;reduced:boolean;cell:number;hitWidth:number;interactive:boolean;active:boolean;conflict:boolean}){
 const strokes=useMemo(()=>infrastructureStrokes(road,geometry,style,reduced),[road,geometry,style,reduced]);
 return <Group>{strokes.map((stroke,i)=><Path key={i} roadId={road.id} data={stroke.data} scaleX={cell} scaleY={cell} stroke={i===0&&conflict?'#ed7c66':i===0&&active?'#ffe2a0':stroke.color} strokeWidth={stroke.width} dash={stroke.dash} hitStrokeWidth={Math.max(stroke.width,hitWidth)} listening={interactive} lineCap="round" lineJoin="round"/>)}</Group>;
});
