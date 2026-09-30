import { createServer } from "vite";
import { performance } from "node:perf_hooks";

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
try{
  const {blankProject}=await server.ssrLoadModule("/src/project.ts");
  const {buildFight,fightMoves,validateFightMoves}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {insertSpecialMove}=await server.ssrLoadModule("/src/specialMoves.ts");
  const {bladePointsAt}=await server.ssrLoadModule("/src/CanvasView.tsx");
  const {compileProjectPlan,validateProjectPlan}=await server.ssrLoadModule("/src/autoDirector.ts");
  const registry=validateFightMoves(),failures=registry.filter(x=>x.errors.length);
  const compileFailures=[];for(const move of fightMoves){try{const result=insertSpecialMove(blankProject({label:"16:9",width:1920,height:1080}),move,"a",0,"b");const points=Object.values(result.tracks).flat().flatMap(k=>Object.values(k.pose));if(!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw new Error("NaN joint");if(!result.tracks.a.length||!result.tracks.b.length)throw new Error("missing actor track");}catch(error){compileFailures.push({id:move.id,error:String(error)})}}
  const styles=["Balanced","Fast","Technical","Acrobatic","Arcade","Heavy"],runs=[];
  for(const duration of [10,30,60])for(const style of (duration===10?styles:["Balanced"])){
    const source=blankProject({label:"16:9",width:1920,height:1080}),started=performance.now();
    const result=buildFight(source,"a","b",0,{duration,style,intensity:.75,specials:true,grapples:true,aerial:true,projectiles:true,autoCamera:true,winner:"Fighter A",seed:1741});
    const elapsed=performance.now()-started,instance=result.fights.at(-1),keys=Object.values(result.tracks).reduce((n,t)=>n+t.length,0);
    runs.push({duration,style,ms:+elapsed.toFixed(2),moves:instance.generatedMoveIds.length,unique:new Set(instance.generatedMoveIds).size,keys,effects:result.effects.length,speedKeys:result.speed.length,winner:instance.fighterAssignments.winner,end:+instance.endTime.toFixed(2)});
  }
  const sideSwap=buildFight(blankProject({label:"16:9",width:1920,height:1080}),"a","b",0,{duration:10,style:"Technical",intensity:.6,specials:false,grapples:true,aerial:false,projectiles:false,autoCamera:false,winner:"Fighter B",seed:99});
  const swordRuns=[];
  for(const duration of [10,30]){const started=performance.now(),result=buildFight(blankProject({label:"16:9",width:1920,height:1080}),"a","b",0,{duration,style:"Technical",intensity:.75,specials:true,grapples:false,aerial:false,projectiles:false,autoCamera:true,winner:"Fighter A",seed:441,combatType:"SWORD",attackerWeapon:"Sword",targetWeapon:"Sword",attackerHand:"right",targetHand:"left"}),ms=performance.now()-started,instance=result.fights.at(-1),swordMovesUsed=instance.generatedMoveIds.filter(id=>id.startsWith("sword_")),trail=result.effects.find(e=>e.type==="motionTrail"&&e.trackedProp),sample=trail?bladePointsAt(result,trail.trackedProp,trail.time):null,roundTrip=JSON.parse(JSON.stringify(result));swordRuns.push({duration,ms:+ms.toFixed(2),moves:instance.generatedMoveIds.length,swordMoves:swordMovesUsed.length,props:result.props.filter(p=>p.type==="sword").length,trails:result.effects.filter(e=>e.type==="motionTrail"&&e.trackedProp).length,bladeFinite:sample?Object.values(sample).flatMap(Object.values).every(Number.isFinite):false,roundTripProps:roundTrip.props.filter(p=>p.type==="sword").length,keys:Object.values(result.tracks).reduce((n,t)=>n+t.length,0),effects:result.effects.length})}
  const plan={version:1,id:"fight_test",title:"Fight Test",targetDuration:20,aspectRatio:"16:9",style:"simple",seed:42,characters:[{id:"a",name:"A"},{id:"b",name:"B"}],props:[],scenes:[{id:"s",title:"Arena",duration:20,location:"arena",characters:["a","b"],props:[],objective:"fight",shots:[{id:"sh",duration:20,description:"generated fight",commands:[{type:"GENERATE_FIGHT",time:0,attacker:"a",defender:"b",duration:20,style:"Arcade",intensity:.8,winner:"Fighter A",seed:42}]}]}]};
  const validation=validateProjectPlan(plan),compiled=validation.valid?compileProjectPlan(plan):null;
  console.log(JSON.stringify({registeredMoves:fightMoves.length,swordRegistered:fightMoves.filter(m=>m.tags.includes("sword")).length,moveValidationFailures:failures,moveCompileFailures:compileFailures,runs,swordRuns,sideSwapWinner:sideSwap.fights.at(-1).fighterAssignments.winner,autoDirector:{valid:validation.valid,errors:validation.errors,fights:compiled?.fights?.length??0,keys:compiled?Object.values(compiled.tracks).reduce((n,t)=>n+t.length,0):0}},null,2));
}finally{await server.close();}
