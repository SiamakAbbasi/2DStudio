import { createServer } from "vite";

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
try{
  const {blankProject}=await server.ssrLoadModule("/src/project.ts");
  const {applyFightMoveSequence,fightMoves}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {poseAt,transformAt}=await server.ssrLoadModule("/src/animation.ts");
  const ids=["superhero_power_punch","elastic_energy_smash","aerial_meteor_smash","arcane_repulse","flame_serpent_blast","aura_eruption","blood_moon_sword_arc"];
  const settings={duration:4,style:"Arcade",intensity:.85,specials:true,grapples:false,aerial:true,projectiles:true,autoCamera:false,winner:"No Winner",seed:31,combatType:"MIXED"};
  const shift=(track,dx)=>track.forEach(k=>Object.values(k.pose).forEach(j=>j.x+=dx));
  let cases=0;
  for(const id of ids)for(const direction of [1,-1]){
    const move=fightMoves.find(m=>m.id===id),p=blankProject({label:"QA",width:1920,height:1080});
    const ax=poseAt(p.tracks.a,0).root.x,bx=poseAt(p.tracks.b,0).root.x;
    shift(p.tracks.b,ax+direction*520-bx);
    p.combatFx={intensity:"HIGH",hitParticles:true,autoWeaponTrail:true,blood:"MEDIUM"};
    const out=applyFightMoveSequence(p,"a","b",0,{...settings,combatType:id.includes("sword")?"SWORD":"UNARMED"},[id]);
    const contact=out.effects.find(e=>e.type==="flash")?.time??out.tracks.a.find(k=>k.easing==="snap")?.time??move.contactTime;
    const a=poseAt(out.tracks.a,contact),b=poseAt(out.tracks.b,contact);
    if(Math.sign(b.root.x-a.root.x)!==direction)throw new Error(`${id}: crossed target in ${direction}`);
    if((out.characters.find(c=>c.id==="a")?.flip??false)!==(direction<0))throw new Error(`${id}: facing`);
    for(const actor of ["a","b"])for(const key of out.tracks[actor]){
      if(transformAt(out.tracks[actor],key.time).flipH)throw new Error(`${id}: double mirror`);
      if(Math.hypot(key.pose.head.x-key.pose.neck.x,key.pose.head.y-key.pose.neck.y)>62.01)throw new Error(`${id}: head/neck`);
    }
    if(!out.effects.some(e=>Math.abs(e.time-contact)<.001))throw new Error(`${id}: no contact FX`);
    if(id.includes("sword")&&!out.props.some(prop=>prop.type==="sword"))throw new Error(`${id}: sword missing`);
    cases++;
  }
  console.log(`PASS: ${cases} Fantasy / Supernatural direction, pairing, rig, FX, and sword-equipment cases`);
}finally{await server.close()}
