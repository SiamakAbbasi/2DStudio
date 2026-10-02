import { createServer } from "vite";

const server=await createServer({server:{middlewareMode:true},appType:"custom"});
try{
  const {blankProject,migrateProject}=await server.ssrLoadModule("/src/project.ts");
  const {applyFightMoveSequence}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {poseAt}=await server.ssrLoadModule("/src/animation.ts");
  const settings={duration:3,style:"Balanced",intensity:.7,specials:false,grapples:false,aerial:false,projectiles:false,autoCamera:false,winner:"No Winner",seed:9,combatType:"UNARMED"};
  const make=(blood)=>{const p=blankProject({label:"QA",width:1080,height:1920});p.combatFx={intensity:"MEDIUM",hitParticles:false,autoWeaponTrail:true,blood};return p};
  const off=applyFightMoveSequence(make("OFF"),"a","b",0,settings,["jab"]);
  if(off.effects.some(e=>e.type==="blood"))throw new Error("Blood OFF emitted particles");
  const jab=applyFightMoveSequence(make("MEDIUM"),"a","b",0,settings,["jab"]),spray=jab.effects.find(e=>e.type==="blood");
  if(!spray||spray.time<.31||spray.directionX<=0)throw new Error("Forward jab blood timing/direction failed");
  const head=poseAt(jab.tracks.b,spray.time).head;
  if(Math.hypot(spray.x-head.x,spray.y-head.y)>1)throw new Error("Jab blood did not originate at head contact");
  const reverse=applyFightMoveSequence(make("HIGH"),"b","a",0,settings,["roundhouse"]),kick=reverse.effects.find(e=>e.type==="blood");
  if(!kick||kick.time<.56||kick.directionX>=0||kick.bloodLevel!=="HIGH")throw new Error("Reverse roundhouse blood failed");
  const receivingPose=poseAt(reverse.tracks.a,kick.time),upperTorso={x:(receivingPose.neck.x+receivingPose.torso.x)/2,y:(receivingPose.neck.y+receivingPose.torso.y)/2};
  if(Math.hypot(kick.x-upperTorso.x,kick.y-upperTorso.y)>1)throw new Error("Roundhouse blood did not originate at upper-torso contact");
  const saved=migrateProject(JSON.parse(JSON.stringify(reverse)));
  if(saved.combatFx?.blood!=="HIGH")throw new Error("Blood setting did not survive save/load roundtrip");
  console.log("PASS: blood OFF/LOW foundation, contact timing, head/body origin, bidirectional spray, and persistence");
}finally{await server.close()}
