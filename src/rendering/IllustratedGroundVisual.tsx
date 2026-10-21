import type Konva from 'konva';
import {memo,useRef,useCallback} from 'react';
import {Shape} from 'react-konva';
import {useGroundSurface,useGroundTiles} from './illustratedGroundSurface';
import {type GroundRegion,type GroundPlan} from './illustratedGround';
/** One non-listening image batch; the approved forest renderer stays above it. */
export const IllustratedGroundVisual=memo(function IllustratedGroundVisual({plan,pixelsPerTile,fine=true,viewport={x:0,y:0,width:0,height:0}}:{plan:GroundPlan;pixelsPerTile:number;fine?:boolean;viewport?:GroundRegion}){
 const state=useGroundSurface(plan),detail=useGroundTiles(plan,viewport,fine?pixelsPerTile:0);
 const drawing=useRef({state,detail});drawing.current={state,detail};
 const scene=useCallback((context:Konva.Context)=>{const {state,detail}=drawing.current;if(state.surface){const ctx=context._context;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';const base=state.surface.canvas;
 if(!detail.ready.size){const m=ctx.getTransform(),x=Math.max(0,-m.e/m.a),y=Math.max(0,-m.f/m.d),w=Math.max(0,Math.min(plan.width,(ctx.canvas.width-m.e)/m.a)-x),h=Math.max(0,Math.min(plan.height,(ctx.canvas.height-m.f)/m.d)-y);if(w&&h)ctx.drawImage(base,x/plan.width*base.width,y/plan.height*base.height,w/plan.width*base.width,h/plan.height*base.height,x,y,w,h);}
 else {const m=ctx.getTransform(),left=Math.max(0,Math.floor(-m.e/m.a/16)*16),top=Math.max(0,Math.floor(-m.f/m.d/16)*16),right=Math.min(plan.width,(ctx.canvas.width-m.e)/m.a),bottom=Math.min(plan.height,(ctx.canvas.height-m.f)/m.d);
  for(let y=top;y<bottom;y+=16)for(let x=left;x<right;x+=16){const w=Math.min(16,plan.width-x),h=Math.min(16,plan.height-y),tile=detail.ready.get(`${x}:${y}`);if(tile)ctx.drawImage(tile.canvas,0,0,tile.canvas.width,tile.canvas.height,x,y,w,h);else ctx.drawImage(base,x/plan.width*base.width,y/plan.height*base.height,w/plan.width*base.width,h/plan.height*base.height,x,y,w,h);}
 }}},[plan]);
 return <Shape name="illustrated-ground-63" groundStatus={state.error?'error':state.surface?'ready':'loading'} groundTileCount={detail.ready.size} groundDetailPending={detail.pending} groundBytes={state.surface?.bytes} groundBuildMs={state.surface?.elapsedMs} listening={false} sceneFunc={scene}/>;
});
