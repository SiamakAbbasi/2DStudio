import { basePose } from "./animation";
import { authoredAutoMotionAnchors, autoMotionProgress, clearAutoMotionKeys, detachAutoMotionKey, generateAutoMotionKeys } from "./autoMotion";
import type { PoseKeyframe } from "./types";
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(`Auto Motion QA: ${message}`)};
const key=(id:string,time:number,x:number):PoseKeyframe=>{const pose=basePose(x,500);pose.leftWrist.x+=x*.1;return{id,time,pose,easing:"ease-in-out",rotation:0,scaleX:1,scaleY:1,flipH:false,flipV:false}};
const source=[key("a",0,100),key("b",.5,200),key("c",1,300)],snapshot=JSON.stringify(source),ids=(()=>{let n=0;return()=>`g${++n}`})();
for(const [density,expected] of [["low",3],["medium",7],["high",15]] as const){const generated=generateAutoMotionKeys([source[0],source[2]],"linear",density,"group",ids);assert(generated.length===expected,`${density} count ${generated.length} != ${expected}`);assert(generated.every(item=>item.source==="AUTO_MOTION"&&item.autoMotionGroupId==="group"),`${density} metadata`);}
assert(JSON.stringify(source)===snapshot,"authored anchors mutated");
const multi=generateAutoMotionKeys(source,"ease-in-out","medium","multi",ids);assert(multi.every(item=>item.time>0&&item.time<1&&item.time!==.5),"generated timestamp overlaps anchor");
const midpoint=generateAutoMotionKeys([source[0],source[2]],"linear","medium","root",ids).find(item=>Math.abs(item.time-.5)<.001)!;assert(Math.abs(midpoint.pose.root.x-200)<.001,"root did not interpolate");
assert(autoMotionProgress(.25,"ease-in")<.25&&autoMotionProgress(.25,"ease-out")>.25&&autoMotionProgress(.25,"ease-in-out")<.25,"easing formulas invalid");
const edited=structuredClone(multi[0]);detachAutoMotionKey(edited);const combined=[...source,...multi,edited],cleared=clearAutoMotionKeys(combined,0,1);assert(cleared.some(item=>item.id===edited.id&&item.source==="AUTO_MOTION_MODIFIED"),"manual edit was removed");assert(cleared.filter(item=>item.source==="AUTO_MOTION").length===0,"eligible generated frames remain");
assert(authoredAutoMotionAnchors(combined,0,1).every(item=>item.source!=="AUTO_MOTION"),"generated frame became anchor");
console.log("PASS: anchors preserved; LOW=3 MEDIUM=7 HIGH=15; easing/root/metadata/clear/manual ownership valid");
