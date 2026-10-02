import { createServer } from "vite";

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
const fail=(message)=>{throw new Error(message)};
try{
  const {blankProject}=await server.ssrLoadModule("/src/project.ts");
  const {fightMoves,validateFightMoves,applyFightMoveSequence,buildFight}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {poseAt,transformAt}=await server.ssrLoadModule("/src/animation.ts");
  const invalid=validateFightMoves().filter(x=>x.errors.length);
  if(invalid.length)fail(`invalid registry: ${JSON.stringify(invalid)}`);
  if(fightMoves.length!==58)fail(`expected 58 moves, found ${fightMoves.length}`);
  const settings={duration:4,style:"Balanced",intensity:.75,specials:true,grapples:true,aerial:true,projectiles:true,autoCamera:false,winner:"No Winner",seed:41,combatType:"MIXED",attackerWeapon:"Sword",targetWeapon:"Sword"};
  const shift=(track,dx)=>track.forEach(key=>Object.values(key.pose).forEach(joint=>joint.x+=dx));
  const phaseCounts={};
  let directionCases=0;
  for(const move of fightMoves){
    phaseCounts[move.category]=(phaseCounts[move.category]??0)+1;
    if(!move.phases||!("CONTACT" in move.phases)||(move.phases.CONTACT??-1)<0)fail(`${move.id}: missing phase contract`);
    for(const direction of [1,-1]){
      const p=blankProject({label:"Full QA",width:1280,height:720});
      if(direction<0)shift(p.tracks.b,-520);
      const out=applyFightMoveSequence(p,"a",move.participants===2?"b":undefined,0,settings,[move.id]);
      if(!out.tracks.a.length)fail(`${move.id}: no attacker track`);
      const horizon=Math.min(out.duration,move.duration+.6);
      for(const actor of move.participants===2?["a","b"]:["a"]){
        for(const key of out.tracks[actor].filter(k=>k.time<=horizon)){
          for(const joint of Object.values(key.pose))if(!Number.isFinite(joint.x)||!Number.isFinite(joint.y))fail(`${move.id}: non-finite joint`);
          if(key.flipH===true||transformAt(out.tracks[actor],key.time).flipH)fail(`${move.id}: transform mirror leak`);
          if(Math.hypot(key.pose.head.x-key.pose.neck.x,key.pose.head.y-key.pose.neck.y)>62.01)fail(`${move.id}: detached head`);
          if(Math.hypot(key.pose.neck.x-key.pose.torso.x,key.pose.neck.y-key.pose.torso.y)>82.01)fail(`${move.id}: detached torso`);
        }
      }
      if(move.participants===2){
        const a=poseAt(out.tracks.a,Math.min(horizon,move.contactTime)),b=poseAt(out.tracks.b,Math.min(horizon,move.contactTime));
        if(!Number.isFinite(a.root.x+b.root.x))fail(`${move.id}: invalid contact roots`);
      }
      directionCases++;
    }
  }
  const generated=[];
  for(const duration of [10,30,60])for(const style of ["Balanced","Acrobatic","Arcade","Heavy"]){
    const p=blankProject({label:`Generated ${duration}`,width:1280,height:720});
    const out=buildFight(p,"a","b",0,{...settings,duration,style,seed:duration*17+style.length,combatType:"UNARMED",attackerWeapon:"None",targetWeapon:"None"});
    const record=out.fights?.at(-1),ids=record?.generatedMoveIds??[];
    if(!ids.length)fail(`${duration}s ${style}: empty generation`);
    if(ids.some(id=>!fightMoves.some(m=>m.id===id)))fail(`${duration}s ${style}: unknown move`);
    for(const actor of ["a","b"])for(const key of out.tracks[actor]){
      if(key.flipH===true)fail(`${duration}s ${style}: mirror leak`);
      if(Math.hypot(key.pose.head.x-key.pose.neck.x,key.pose.head.y-key.pose.neck.y)>62.01)fail(`${duration}s ${style}: detached head`);
    }
    generated.push(`${duration}s/${style}:${ids.length}`);
  }
  console.log(`PASS: ${fightMoves.length} moves; ${directionCases} mirrored move cases; phases=${JSON.stringify(phaseCounts)}; generated ${generated.join(", ")}`);
}finally{await server.close()}
