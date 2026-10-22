export interface CameraView {x:number;y:number;scale:number}
export interface CameraPoint {x:number;y:number}
export interface PinchPoint extends CameraPoint {distance:number}
/** Fit must remain reachable on portrait and short landscape viewports. */
export function fitScale(viewport:{width:number;height:number},world:{width:number;height:number}){
 return Math.max(.001,Math.min(Math.max(1,viewport.width-64)/world.width,Math.max(1,viewport.height-64)/world.height));
}
/** Retain the old desktop limit; mobile can explore down to half its Fit scale. */
export const minimumScale=(fit:number)=>Math.max(.001,Math.min(.12,fit/2));
export function zoomCamera(view:CameraView,factor:number,anchor:CameraPoint,min:number):CameraView{
 if(!Number.isFinite(factor)||factor<=0)return view;
 // A viewport/toolbar resize must not clamp an existing camera to a new limit.
 const scale=Math.max(Math.min(min,view.scale),Math.min(Math.max(3,view.scale),view.scale*factor));
 return {scale,x:anchor.x-(anchor.x-view.x)*scale/view.scale,y:anchor.y-(anchor.y-view.y)*scale/view.scale};
}
export function pinchCamera(view:CameraView,old:PinchPoint,next:PinchPoint,min:number):CameraView{
 if(old.distance<=0||next.distance<=0)return view;
 const atOld=zoomCamera(view,next.distance/old.distance,old,min);
 return {...atOld,x:atOld.x+next.x-old.x,y:atOld.y+next.y-old.y};
}
export function touchPinch(touches:ArrayLike<{clientX:number;clientY:number}>,rect:{left:number;top:number}):PinchPoint|null{
 if(touches.length!==2)return null;const [a,b]=[touches[0],touches[1]],distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 return distance>0?{distance,x:(a.clientX+b.clientX)/2-rect.left,y:(a.clientY+b.clientY)/2-rect.top}:null;
}
