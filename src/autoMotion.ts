import { joints } from "./animation";
import type { Ease, Pose, PoseKeyframe } from "./types";

export type AutoMotionTiming = Extract<Ease,"linear"|"ease-in"|"ease-out"|"ease-in-out">;
export type AutoMotionDensity = "low"|"medium"|"high";
export const AUTO_MOTION_SPACING:Record<AutoMotionDensity,number>={low:.25,medium:.125,high:.065};

export const autoMotionProgress=(value:number,easing:AutoMotionTiming)=>{
  const t=Math.max(0,Math.min(1,value));
  if(easing==="ease-in")return t*t;
  if(easing==="ease-out")return 1-(1-t)*(1-t);
  if(easing==="ease-in-out")return t*t*(3-2*t);
  return t;
};
const poseBetween=(a:Pose,b:Pose,t:number)=>{
  const pose={} as Pose;
  joints.forEach(joint=>pose[joint]={x:a[joint].x+(b[joint].x-a[joint].x)*t,y:a[joint].y+(b[joint].y-a[joint].y)*t});
  return pose;
};
const value=(a:number|undefined,b:number|undefined,t:number,fallback:number)=>{
  const x=a??fallback,y=b??x;return x+(y-x)*t;
};
export function authoredAutoMotionAnchors(track:PoseKeyframe[],start:number,end:number,ids?:Set<string>){
  const eligible=track.filter(key=>key.source!=="AUTO_MOTION"&&key.time>=start&&key.time<=end);
  if(!ids?.size)return eligible.sort((a,b)=>a.time-b.time);
  const selected=eligible.filter(key=>ids.has(key.id));
  if(selected.length<2)return selected.sort((a,b)=>a.time-b.time);
  const min=Math.min(...selected.map(key=>key.time)),max=Math.max(...selected.map(key=>key.time));
  return eligible.filter(key=>key.time>=min&&key.time<=max).sort((a,b)=>a.time-b.time);
}
export function generateAutoMotionKeys(anchors:PoseKeyframe[],easing:AutoMotionTiming,density:AutoMotionDensity,groupId:string,idFactory:()=>string){
  const generated:PoseKeyframe[]=[];
  for(let index=0;index<anchors.length-1;index++){
    const a=anchors[index],b=anchors[index+1],duration=b.time-a.time,spacing=AUTO_MOTION_SPACING[density];
    if(duration<spacing*1.35)continue;
    const steps=Math.ceil(duration/spacing);
    for(let step=1;step<steps;step++){
      const raw=step/steps,progress=autoMotionProgress(raw,easing),time=a.time+duration*raw;
      if(time<=a.time+.0005||time>=b.time-.0005)continue;
      generated.push({id:idFactory(),time:+time.toFixed(6),pose:poseBetween(a.pose,b.pose,progress),easing:"linear",rotation:value(a.rotation,b.rotation,progress,0),scaleX:value(a.scaleX,b.scaleX,progress,1),scaleY:value(a.scaleY,b.scaleY,progress,1),flipH:progress<.5?(a.flipH??false):(b.flipH??a.flipH??false),flipV:progress<.5?(a.flipV??false):(b.flipV??a.flipV??false),source:"AUTO_MOTION",autoMotionGroupId:groupId,autoMotionAnchorStartId:a.id,autoMotionAnchorEndId:b.id});
    }
  }
  return generated;
}
export const clearAutoMotionKeys=(track:PoseKeyframe[],start:number,end:number,groupId?:string)=>track.filter(key=>key.source!=="AUTO_MOTION"||key.time<start||key.time>end||(groupId&&key.autoMotionGroupId!==groupId));
export const detachAutoMotionKey=(key:PoseKeyframe)=>{if(key.source==="AUTO_MOTION"){key.source="AUTO_MOTION_MODIFIED";delete key.autoMotionGroupId;delete key.autoMotionAnchorStartId;delete key.autoMotionAnchorEndId;}};
