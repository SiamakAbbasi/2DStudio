import { memo,useEffect,useRef } from "react";
import { clonePose,uid } from "./animation";
import { drawScene } from "./CanvasView";
import { poses } from "./poses";
import { blankProject } from "./project";
import type { Action,Pose } from "./types";

export const ActionPreview=memo(function ActionPreview({action}:{action:Action}){
  const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const container=host.current,target=canvas.current;if(!container||!target)return;
    let raf=0,start=performance.now(),active=false,last=0;
    const project=blankProject({label:"Action Preview",width:720,height:420}),actorCount=Math.max(1,action.participants?.filter(item=>item==="actor").length??1);
    project.characters=project.characters.slice(0,actorCount);project.duration=action.duration;project.trail=0;
    project.characters.forEach((character,index)=>{const origin=project.tracks[character.id][0].pose.root,keys=action.keyframes.filter(key=>key.actorIndex===undefined||key.actorIndex===index);project.tracks[character.id]=keys.map(key=>{
      const pose=clonePose(key.inlinePose??poses[key.pose]??poses.idle),base={...pose.root};
      for(const name in pose){const joint=pose[name as keyof Pose];joint.x+=origin.x-base.x+(key.dx??0);joint.y+=origin.y-base.y+(key.dy??0)}
      return{id:uid(),time:key.time,pose,easing:key.easing,flipH:false};
    })});
    if(action.participants?.includes("prop")){
      const id="preview-prop",attached=!(["Pick Up","Catch"].includes(action.name)),first=project.characters[0],startPose=project.tracks[first.id][0].pose;
      project.props=[{id,name:"Action Prop",type:action.name==="Read"?"book":action.name==="Check Phone"?"phone":"cup",color:"#f5b83b",visible:true,locked:false,layer:12}];
      project.propTracks={[id]:[{id:uid(),time:0,easing:"linear",x:attached?0:startPose.root.x+90,y:attached?0:900,rotation:0,scaleX:1,scaleY:1,flipH:false,opacity:1,attachment:attached?{actorId:first.id,joint:"rightWrist",offsetX:0,offsetY:0,rotation:0}:null}]};
      for(const event of action.interactionEvents??[]){const actor=project.characters[event.type==="TRANSFER"?(event.toActorIndex??1):(event.actorIndex??0)]??first,joint=event.joint??"rightWrist",point=project.tracks[actor.id].find(key=>key.time>=event.time)?.pose[joint]??startPose[joint],prior=project.propTracks[id].at(-1)!;project.propTracks[id].push({...prior,id:uid(),time:event.time,easing:"snap",x:event.type==="RELEASE"?point.x:0,y:event.type==="RELEASE"?point.y:0,attachment:event.type==="RELEASE"?null:{actorId:actor.id,joint,offsetX:0,offsetY:0,rotation:0}})}
    }
    const frame=(now:number)=>{if(!active)return;if(now-last>33){last=now;const ctx=target.getContext("2d");if(ctx){const t=((now-start)/1000)%(action.duration+.25);ctx.clearRect(0,0,target.width,target.height);drawScene(ctx,project,Math.min(t,action.duration),target.width,target.height,false,null,{x:360,y:620,zoom:.34,rotation:0,width:720,height:420})}}raf=requestAnimationFrame(frame)};
    const observer=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active){start=performance.now();raf=requestAnimationFrame(frame)}else cancelAnimationFrame(raf)});observer.observe(container);
    return()=>{active=false;cancelAnimationFrame(raf);observer.disconnect()};
  },[action]);
  return <div ref={host} className="action-preview"><canvas ref={canvas} width={150} height={92} aria-label={`${action.name} animated preview`}/></div>;
});
