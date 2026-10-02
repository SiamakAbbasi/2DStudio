import { useEffect, useRef } from "react";
import { joints, poseAt, transformAt } from "./animation";
import { drawScene } from "./CanvasView";
import { applyFightMoveSequence, type FightMoveDefinition, type FightSettings } from "./fightDirector";
import { blankProject } from "./project";
import type { Project } from "./types";

type FrameCallback = (now: number) => void;
const previewFrames = new Set<FrameCallback>();
let previewRaf = 0;
const tick = (now: number) => {
  previewFrames.forEach((callback) => callback(now));
  previewRaf = previewFrames.size ? requestAnimationFrame(tick) : 0;
};
const subscribe = (callback: FrameCallback) => {
  previewFrames.add(callback);
  if (!previewRaf) previewRaf = requestAnimationFrame(tick);
  return () => {
    previewFrames.delete(callback);
    if (!previewFrames.size && previewRaf) {
      cancelAnimationFrame(previewRaf);
      previewRaf = 0;
    }
  };
};

function previewProject(move: FightMoveDefinition, settings: FightSettings) {
  const base = blankProject({ label: "Preview", width: 720, height: 420 });
  base.duration = Math.max(3, move.duration + .4);
  base.trail = 0;
  const combatType = move.tags.includes("sword") ? "SWORD" : "UNARMED";
  return applyFightMoveSequence(base, "a", move.participants===2?"b":undefined, 0, {
    ...settings,
    duration: base.duration,
    combatType,
    attackerWeapon: combatType === "SWORD" ? "Sword" : "None",
    targetWeapon: combatType === "SWORD" ? "Sword" : "None",
    winner: "No Winner",
    autoCamera: false,
  }, [move.id]);
}

function fitView(project: Project, duration: number) {
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for(let sample=0;sample<=20;sample++) {
    const time=duration*sample/20;
    for(const character of project.characters) {
      const pose=poseAt(project.tracks[character.id],time),tf=transformAt(project.tracks[character.id],time),angle=tf.rotation*Math.PI/180;
      for(const joint of joints) {
        const dx=(pose[joint].x-pose.root.x)*tf.scaleX*(tf.flipH?-1:1),dy=(pose[joint].y-pose.root.y)*tf.scaleY*(tf.flipV?-1:1);
        const x=pose.root.x+dx*Math.cos(angle)-dy*Math.sin(angle),y=pose.root.y+dx*Math.sin(angle)+dy*Math.cos(angle);
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
    }
  }
  const width=720,height=280,pad=55,contentW=Math.max(1,right-left+pad*2),contentH=Math.max(1,bottom-top+pad*2);
  return {x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(width/contentW,height/contentH),rotation:0,width,height};
}

export function FightMovePreview({move,settings}:{move:FightMoveDefinition;settings:FightSettings}) {
  const canvas=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null),restart=useRef(0),lastFrame=useRef(0),compiled=useRef<Project|null>(null),view=useRef<ReturnType<typeof fitView>|null>(null);
  useEffect(()=>{
    const element=host.current;if(!element)return;
    let unsubscribe:(()=>void)|undefined;
    const observer=new IntersectionObserver(([entry])=>{
      unsubscribe?.();unsubscribe=undefined;
      if(!entry.isIntersecting){compiled.current=null;view.current=null;return}
      const project=previewProject(move,settings),duration=Math.max(move.duration,.2);
      compiled.current=project;view.current=fitView(project,duration);restart.current=performance.now();
      unsubscribe=subscribe(now=>{
        if(now-lastFrame.current<33)return;
        lastFrame.current=now;
        const target=canvas.current,current=compiled.current,camera=view.current;if(!target||!current||!camera)return;
        const ctx=target.getContext("2d");if(!ctx)return;
        const loop=duration+.4,elapsed=(now-restart.current)/1000,time=Math.min(duration,elapsed%loop);
        ctx.clearRect(0,0,target.width,target.height);drawScene(ctx,current,time,target.width,target.height,false,null,camera);
      });
    },{rootMargin:"80px"});
    observer.observe(element);
    return()=>{observer.disconnect();unsubscribe?.();compiled.current=null;view.current=null};
  },[move,settings]);
  return <div ref={host} className="fight-preview animated" onPointerEnter={()=>{restart.current=performance.now()}}><canvas ref={canvas} width={360} height={140} aria-label={`${move.name} animated preview`}/></div>;
}
