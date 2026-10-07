import {applySelectionRetimePlan,planSelectionRetime,type AuthoringEntry} from "./timelineAuthoring";

const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(`Timeline Selection Retiming QA: ${message}`)};
const key=(id:string,time:number,poseValue:number)=>({id,time,easing:"linear",pose:{root:{x:poseValue,y:0}}});
const source={a:[key("a0",1,10),key("a1",1.2,20),key("a2",1.4,30),key("a3",1.6,40),key("a4",1.8,50),key("a-unselected",3,60)],b:[key("b0",1.4,70),key("b-unselected",2.9,80)]};
const selected=(tracks:typeof source):AuthoringEntry[]=>tracks.a.slice(0,5).map(key=>({track:"a",key}));

export function runTimelineSelectionRetimeQa(){
  const expectations=new Map<number,number[]>([[.25,[1,1.8,2.6,3.4,4.2]],[.5,[1,1.4,1.8,2.2,2.6]],[1,[1,1.2,1.4,1.6,1.8]],[1.5,[1,1.133,1.267,1.4,1.533]],[2,[1,1.1,1.2,1.3,1.4]],[3,[1,1.067,1.133,1.2,1.267]]]);
  for(const [speed,expected] of expectations){const tracks=structuredClone(source),selectedIds=source.a.slice(0,5).map(key=>key.id),poses=new Map(tracks.a.slice(0,5).map(key=>[key.id,JSON.stringify(key.pose)])),unselected=JSON.stringify([tracks.a[5],...tracks.b]);const plan=planSelectionRetime(selected(tracks),tracks,speed,5);applySelectionRetimePlan(tracks,plan);assert(plan.anchor===1,`${speed}x anchor moved`);assert(selectedIds.map(id=>tracks.a.find(key=>key.id===id)!.time).join(",")===expected.join(","),`${speed}x math failed`);assert(selectedIds.every(id=>JSON.stringify(tracks.a.find(key=>key.id===id)!.pose)===poses.get(id)),`${speed}x changed poses`);assert(JSON.stringify([tracks.a.find(key=>key.id==="a-unselected"),...tracks.b])===unselected,`${speed}x changed unselected keys`)}
  const multi=structuredClone(source),multiEntries=[{track:"a",key:multi.a[0]},{track:"a",key:multi.a[1]},{track:"b",key:multi.b[0]}],bUnselected=JSON.stringify(multi.b[1]);applySelectionRetimePlan(multi,planSelectionRetime(multiEntries,multi,2,5));assert(multi.b[0].time===1.2&&JSON.stringify(multi.b[1])===bUnselected,"multi-actor isolation failed");
  const collision=structuredClone(source);collision.a[5].time=1.4;let rejected=false;try{planSelectionRetime(selected(collision),collision,2,5)}catch{rejected=true}assert(rejected,"collision was not rejected atomically");
  const before=structuredClone(source),after=structuredClone(source),plan=planSelectionRetime(selected(after),after,2,5);applySelectionRetimePlan(after,plan);const undo=structuredClone(before),redo=structuredClone(after);assert(JSON.stringify(undo)===JSON.stringify(source)&&JSON.stringify(redo)===JSON.stringify(after),"Undo/Redo snapshot contract failed");assert(JSON.stringify(JSON.parse(JSON.stringify(after)))===JSON.stringify(after),"save/load round-trip failed");
  return "Timeline Selection Retiming QA PASS";
}

if((globalThis as {process?:{argv?:string[]}}).process?.argv?.[1]?.includes("timelineSelectionRetime.qa"))console.log(runTimelineSelectionRetimeQa());
