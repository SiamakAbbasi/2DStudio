import { createServer } from "vite";
import assert from "node:assert/strict";

const server=await createServer({server:{middlewareMode:true,hmr:{port:24681}},appType:"custom"});
try{
  const {blankProject}=await server.ssrLoadModule("/src/project.ts");
  const {applyFightMoveSequence}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {clonePose}=await server.ssrLoadModule("/src/animation.ts");
  const baseSettings={duration:5,style:"Balanced",intensity:.7,specials:true,grapples:true,aerial:true,projectiles:true,autoCamera:false,winner:"No Winner",seed:22,combatType:"UNARMED",weaponTrail:true};
  const scene=()=>{
    const p=blankProject({label:"QA",width:1080,height:1920}),b=p.characters.find(c=>c.id==="b"),bt=p.tracks.b;
    p.characters.push({...structuredClone(b),id:"c",name:"Actor C",pose:clonePose(b.pose)});
    p.tracks.c=structuredClone(bt);
    return p;
  };
  const actorSnapshot=(p,id)=>{const propTracks=Object.fromEntries(Object.entries(p.propTracks??{}).filter(([,keys])=>keys.some(k=>k.attachment?.actorId===id))),propIds=new Set(Object.keys(propTracks));return JSON.stringify({character:p.characters.find(c=>c.id===id),track:p.tracks[id],props:(p.props??[]).filter(x=>propIds.has(x.id)),propTracks,effects:(p.effects??[]).filter(e=>e.targetFighter===id||e.sourceFighter===id)})};
  for(const id of ["jab","hook","uppercut","roundhouse"]){
    const before=scene(),b=actorSnapshot(before,"b"),c=actorSnapshot(before,"c"),after=applyFightMoveSequence(before,"a",undefined,0,baseSettings,[id],"ATTACKER_ONLY",false);
    assert.notDeepEqual(after.tracks.a,before.tracks.a,`${id}: attacker did not animate`);
    assert.equal(actorSnapshot(after,"b"),b,`${id}: target changed`);
    assert.equal(actorSnapshot(after,"c"),c,`${id}: spectator changed`);
    assert.ok(after.tracks.a.length>=6,`${id}: attacker motion was incomplete`);
    assert.ok(!after.effects.some(e=>["blood","flash","sparks","hitParticles","shockwave"].includes(e.type)),`${id}: contact FX leaked into attacker-only mode`);
  }
  const swordBefore=scene(),swordB=actorSnapshot(swordBefore,"b"),swordC=actorSnapshot(swordBefore,"c"),sword=applyFightMoveSequence(swordBefore,"a",undefined,0,{...baseSettings,combatType:"SWORD",attackerWeapon:"Sword"},["blood_moon_sword_arc"],"ATTACKER_ONLY",false);
  assert.equal(actorSnapshot(sword,"b"),swordB,"sword: target changed");
  assert.equal(actorSnapshot(sword,"c"),swordC,"sword: spectator changed");
  assert.ok(sword.effects.some(e=>e.preset==="ink_crescent_slash"),"sword: attacker trail missing");
  const reverseBefore=scene(),a0=actorSnapshot(reverseBefore,"a"),c0=actorSnapshot(reverseBefore,"c"),reverse=applyFightMoveSequence(reverseBefore,"b",undefined,0,baseSettings,["roundhouse"],"ATTACKER_ONLY",false);
  assert.equal(actorSnapshot(reverse,"a"),a0,"reverse: A changed");assert.equal(actorSnapshot(reverse,"c"),c0,"reverse: C changed");assert.notDeepEqual(reverse.tracks.b,reverseBefore.tracks.b,"reverse: B did not animate");
  const pairedBefore=scene(),spectator=actorSnapshot(pairedBefore,"c"),paired=applyFightMoveSequence(pairedBefore,"a","b",0,baseSettings,["roundhouse"],"ATTACK_REACTION",true);
  assert.notDeepEqual(paired.tracks.a,pairedBefore.tracks.a,"paired: attacker unchanged");assert.notDeepEqual(paired.tracks.b,pairedBefore.tracks.b,"paired: defender unchanged");assert.equal(actorSnapshot(paired,"c"),spectator,"paired: spectator changed");
  console.log("PASS: attacker-only target-none isolation, full motion, attacker FX, reverse actor, paired regression, and spectator integrity");
}finally{await server.close()}
