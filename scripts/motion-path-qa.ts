import assert from "node:assert/strict";
import {blankProject} from "../src/project";
import {bakeMotionPath,createMotionPath,pathLookup,pointAtPath,pointAtTime,simplifyFreeDraw,smoothPoints} from "../src/motionPath";
import type {MotionPath,V} from "../src/types";

const project=blankProject({label:"test",width:1000,height:800});
const base=createMotionPath(project,"a","character","bezier",0);base.endTime=1;base.easing="linear";base.points=[{id:"a",x:100,y:400,out:{x:200,y:30}},{id:"b",x:800,y:400,in:{x:700,y:30}}];
const start=pointAtTime(base,0),end=pointAtTime(base,1);assert.deepEqual({x:start.x,y:start.y},{x:100,y:400});assert.deepEqual({x:end.x,y:end.y},{x:800,y:400});
const samples=Array.from({length:11},(_,i)=>pointAtPath(base,i/10)),distances=samples.slice(1).map((p,i)=>Math.hypot(p.x-samples[i].x,p.y-samples[i].y)),mean=distances.reduce((a,b)=>a+b,0)/distances.length;assert(Math.max(...distances.map(x=>Math.abs(x-mean)/mean))<.08,"arc-length travel varies too much");
for(const type of ["straight","polyline","bezier","free-draw"] as MotionPath["pathType"][]){const p={...structuredClone(base),pathType:type};if(type==="polyline")p.points=[{id:"1",x:0,y:0},{id:"2",x:100,y:0},{id:"3",x:100,y:300}];assert(pathLookup(p).length>=2)}
// Explicit endpoint checks without tangent coupling.
for(const type of ["straight","polyline","bezier","free-draw"] as MotionPath["pathType"][]){const p={...structuredClone(base),pathType:type},a=pointAtPath(p,0),b=pointAtPath(p,1);assert.equal(a.x,p.points[0].x);assert.equal(a.y,p.points[0].y);assert.equal(b.x,p.points.at(-1)!.x);assert.equal(b.y,p.points.at(-1)!.y)}
const raw=Array.from({length:301},(_,i)=>({x:i,y:Math.sin(i/30)*80+(i%3-1)*.8})),simple=simplifyFreeDraw(raw,5);assert(simple.length<raw.length/5&&simple.length>3);assert.equal(smoothPoints(simple).length,simple.length);
const beforeB=JSON.stringify(project.tracks.b),baked=bakeMotionPath(project,base);assert.equal(JSON.stringify(baked.tracks.b),beforeB);assert(baked.tracks.a.some(k=>k.source==="MOTION_PATH"&&k.motionPathId===base.id));const rebaked=bakeMotionPath(baked,{...base,points:base.points.map(p=>({...p,y:p.y+20}))});assert.equal(rebaked.tracks.a.filter(k=>k.motionPathId===base.id).length,baked.tracks.a.filter(k=>k.motionPathId===base.id).length);
const authored=structuredClone(project),moved=structuredClone(authored.tracks.a[0]);moved.id="authored";moved.time=.5;Object.values(moved.pose).forEach(j=>j.x+=40);authored.tracks.a.push(moved);assert.throws(()=>bakeMotionPath(authored,base),/authored root motion/);
const easingProgress=(e:MotionPath["easing"])=>pointAtTime({...base,easing:e},.25).x;assert(easingProgress("ease-in")<easingProgress("linear"));assert(easingProgress("ease-out")>easingProgress("linear"));assert(easingProgress("ease-in-out")<easingProgress("linear"));
console.log(`PASS: 4 path types; arc-length max deviation ${(Math.max(...distances.map(x=>Math.abs(x-mean)/mean))*100).toFixed(2)}%; free draw ${raw.length}→${simple.length}; bake/rebake/conflict/isolation valid`);
