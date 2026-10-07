import { demoProject } from "./project";
import { auditionWindow, createTimelineAudition, evaluateTimelineAudition, type TimelineAuditionItem } from "./timelineAudition";
import type { FightSettings } from "./fightDirector";

const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(`Timeline Audition QA: ${message}`)};
const settings:FightSettings={duration:30,style:"Arcade",intensity:.75,specials:true,grapples:true,aerial:true,projectiles:true,autoCamera:true,winner:"Auto",seed:1741,combatType:"UNARMED",attackerWeapon:"None",targetWeapon:"None",attackerHand:"right",targetHand:"right",swordStrength:"AUTO",weaponTrail:true,cinematicMode:"STANDARD"};
const item=(moveId:string,execution:"ATTACKER_ONLY"|"ATTACK_REACTION"="ATTACK_REACTION"):TimelineAuditionItem=>({moveId,attacker:"a",target:"b",execution,autoFaceTarget:true});

export function runTimelineAuditionQa(){
  const source=demoProject(),snapshot=JSON.stringify(source),targetSnapshot=JSON.stringify(source.tracks.b),cameraSnapshot=JSON.stringify(source.camera),effectsSnapshot=JSON.stringify(source.effects),pathsSnapshot=JSON.stringify(source.motionPaths??[]);
  const session=createTimelineAudition([item("roundhouse","ATTACKER_ONLY")],3.2,settings),result=evaluateTimelineAudition(source,session);
  assert(JSON.stringify(source)===snapshot,"audition mutated source project");
  assert(JSON.stringify(source.tracks.b)===targetSnapshot,"Attacker Only changed target");
  assert(result.project.tracks.a.length>source.tracks.a.length,"attacker move was not evaluated");
  assert(JSON.stringify(source.camera)===cameraSnapshot&&JSON.stringify(source.effects)===effectsSnapshot&&JSON.stringify(source.motionPaths??[])===pathsSnapshot,"source camera, FX, or Paths changed");
  const moved=evaluateTimelineAudition(source,{...session,start:3.48});
  assert(Math.abs(moved.clips[0].start-3.48)<.0001,"temporary move did not update start");
  const retimed=evaluateTimelineAudition(source,{...session,duration:.9});
  assert(Math.abs((retimed.clips[0].end-retimed.clips[0].start)-.9)<.002,"temporary retiming failed");
  const paired=evaluateTimelineAudition(source,createTimelineAudition([item("roundhouse")],3.2,settings));
  assert(paired.project.tracks.b.length>source.tracks.b.length,"Attack + Reaction did not evaluate target");
  const cartSession=createTimelineAudition([item("jab"),item("hook"),item("roundhouse")],2.5,settings),cart=evaluateTimelineAudition(source,cartSession);
  assert(cart.clips.length===3&&JSON.stringify(source)===snapshot,"cart audition failed or mutated source");
  const window=auditionWindow(source,session);
  assert(Math.abs(window.start-2.6)<.001&&window.end>session.start+session.duration,"pre/post-roll window is incorrect");
  const committed=structuredClone(result.project),undone=structuredClone(source);
  assert(JSON.stringify(undone)===snapshot&&JSON.stringify(committed)!==snapshot,"commit/one-snapshot undo contract failed");
  return "Timeline Audition QA PASS";
}

if((globalThis as {process?:{argv?:string[]}}).process?.argv?.[1]?.includes("timelineAudition.qa"))console.log(runTimelineAuditionQa());
