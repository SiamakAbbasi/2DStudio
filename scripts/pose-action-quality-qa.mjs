import {createServer} from "vite";
const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
const fail=message=>{throw new Error(message)};
try{
 const {actions}=await server.ssrLoadModule("/src/actions.ts"),{poses,orientedPose,poseOrientations}=await server.ssrLoadModule("/src/poses.ts");
 const core=["Idle","Step Forward","Step Back","Walk","Walk Slowly","Walk Fast","Run","Approach","Step Away","Sit Down","Sit","Stand Up","Relaxed Stand","Wave","Point","Think","Check Phone","Drink","Read","Surprised","Happy","Sad","Scared","Facepalm","Pick Up","Put Down","Hold","Give","Catch"];
 for(const name of core)if(!actions.some(a=>a.name===name))fail(`missing core action ${name}`);
 for(const orientation of poseOrientations)for(const id of ["idle","neutral_stand","fight_guard","drink_hold"]){
   const pose=orientedPose(poses[id],orientation);
   if(Math.hypot(pose.head.x-pose.neck.x,pose.head.y-pose.neck.y)>62)fail(`${id}/${orientation}: detached head`);
   if(Math.hypot(pose.neck.x-pose.torso.x,pose.neck.y-pose.torso.y)>82)fail(`${id}/${orientation}: detached torso`);
 }
 for(const name of ["Walk","Walk Slowly","Walk Fast"]){const action=actions.find(a=>a.name===name);if(action.keyframes.length<9)fail(`${name}: incomplete gait cycle`);if(action.keyframes[0].pose!==action.keyframes.at(-1).pose)fail(`${name}: loop mismatch`)}
 const run=actions.find(a=>a.name==="Run");if(run.keyframes.length<7||!run.keyframes.some(k=>k.dy<0))fail("Run: no flight phase");
 for(const name of ["Approach","Sit Down","Stand Up","Drink","Think"]){const action=actions.find(a=>a.name===name);if(action.keyframes.length<4)fail(`${name}: insufficient authored phases`)}
 const polished=["Step Forward","Step Back","Step Away","Sit","Wave","Point","Check Phone","Read","Surprised","Happy","Scared","Facepalm","Pick Up","Put Down","Hold","Give","Catch"];
 for(const name of polished){const action=actions.find(a=>a.name===name);if(!action||action.keyframes.length<4)fail(`${name}: polish phases missing`);for(const actorIndex of [...new Set(action.keyframes.map(key=>key.actorIndex??0))]){const keys=action.keyframes.filter(key=>(key.actorIndex??0)===actorIndex);for(let i=1;i<keys.length;i++)if(keys[i].time<keys[i-1].time)fail(`${name}: unordered phases`)}}
 const semantic={"Pick Up":"GRAB","Put Down":"RELEASE","Hold":"GRAB","Give":"TRANSFER","Catch":"CATCH"};
 for(const [name,type] of Object.entries(semantic)){const action=actions.find(a=>a.name===name);if(!action?.interactionEvents?.some(event=>event.type===type))fail(`${name}: missing ${type}`);const event=action.interactionEvents.find(event=>event.type===type);if(event.time<=0||event.time>=action.duration)fail(`${name}: invalid semantic contact time`)}
 for(const action of actions)for(const key of action.keyframes)if(!poses[key.pose])fail(`${action.name}: missing pose ${key.pose}`);
 console.log(`PASS: ${poseOrientations.length} pose orientations; ${actions.length} total actions; ${core.length} core actions; locomotion/acting/transition contracts valid`);
}finally{await server.close()}
