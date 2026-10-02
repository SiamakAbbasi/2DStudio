import {basePose,uid} from "./animation";
import {blankProject} from "./project";
import {applyTimelineSequence,validateTimelineSequence,type TimelineSequence} from "./timelineCommands";

const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(`Timeline Command QA: ${message}`)};
export function runTimelineCommandQa(){
  const source=blankProject({label:"QA",width:1280,height:720});
  source.characters[0].name="Character 1";source.characters[1].name="Character 2";
  const spectatorPose=basePose(1100,386);source.characters.push({id:"spectator",name:"Spectator",type:"stick_character",preset:"standard",color:"#65d690",pose:spectatorPose,flip:false,scale:1,rotation:0,visible:true});source.tracks.spectator=[{id:uid(),time:0,pose:spectatorPose,easing:"linear"}];
  const sequence:TimelineSequence={duration:5,commands:[
    {timeMs:0,type:"POSE",actor:"Character 1",name:"Combat Stance",orientation:"SIDE_RIGHT"},
    {timeMs:400,type:"ACTION",actor:"Character 1",name:"Step Forward"},
    {timeMs:800,type:"FIGHT_MOVE",attacker:"Character 1",target:"Character 2",name:"Jab",execution:"ATTACKER_ONLY"},
    {timeMs:1100,type:"REACTION",actor:"Character 2",name:"Head Hit"},
    {timeMs:1500,type:"FIGHT_MOVE",attacker:"Character 1",target:"Character 2",name:"Hook",execution:"ATTACKER_ONLY"},
    {timeMs:2000,type:"FIGHT_MOVE",attacker:"Character 1",target:"Character 2",name:"Roundhouse",execution:"PAIRED"},
    {timeMs:2600,type:"REACTION",actor:"Character 2",name:"Stagger Back"},
  ]};
  assert(validateTimelineSequence(source,sequence)==="VALID","valid QA sequence rejected");
  const original=JSON.stringify(source),targetBefore=source.tracks.b.length,spectatorBefore=JSON.stringify(source.tracks.spectator),result=applyTimelineSequence(source,sequence),out=result.project;
  assert(JSON.stringify(source)===original,"source project mutated; one-step undo contract broken");
  assert(result.inserted.map(x=>x.time).join(",")==="0,0.4,0.8,1.1,1.5,2,2.6","canonical command timing changed");
  assert(result.inserted.every(x=>x.ids.length>0),"a command produced no editable timeline IDs");
  const targetAtAttackerOnly=applyTimelineSequence(source,{commands:sequence.commands.slice(0,3)}).project;
  assert(targetAtAttackerOnly.tracks.b.length===targetBefore,"attacker-only modified target");
  const pairedOnly=applyTimelineSequence(source,{commands:[sequence.commands[5]]}).project;
  assert(pairedOnly.tracks.b.length>targetBefore,"paired move did not modify target");
  assert(JSON.stringify(out.tracks.spectator)===spectatorBefore,"spectator changed");
  assert(JSON.stringify(JSON.parse(JSON.stringify(out)))===JSON.stringify(out),"save/load JSON round-trip failed");
  assert(validateTimelineSequence(source,{commands:[{time:0,type:"ACTION",actor:"Character 1",name:"Jump Spin"}]}).startsWith("ERROR\nCommand 1:"),"invalid registry name was not rejected");
  return {status:"PASS",commands:result.inserted.length,duration:out.duration};
}

if((globalThis as {process?:{argv?:string[]}}).process?.argv?.[1]?.includes("timelineCommands.qa"))console.log(runTimelineCommandQa());
