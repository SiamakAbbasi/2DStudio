import { createServer } from "vite";

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"silent"});
try{
  const {blankProject}=await server.ssrLoadModule("/src/project.ts");
  const {applyFightMoveSequence,fightMoves}=await server.ssrLoadModule("/src/fightDirector.ts");
  const {poseAt}=await server.ssrLoadModule("/src/animation.ts");
  const settings={duration:4,style:"Balanced",intensity:.7,specials:false,grapples:false,aerial:false,projectiles:false,autoCamera:false,winner:"No Winner",seed:17};
  const ids=["jab","hook","uppercut","roundhouse","knockback"], distances=[110,"desired",325], directions=[1,-1], results=[];
  const shiftTrack=(track,dx)=>track.forEach(k=>Object.values(k.pose).forEach(j=>j.x+=dx));
  for(const id of ids)for(const direction of directions)for(const requested of distances){
    const move=fightMoves.find(m=>m.id===id), project=blankProject({label:"16:9",width:1280,height:720});
    const desired=move.contact?.desiredRootDistance??175, distance=requested==="desired"?desired:requested;
    const a0=poseAt(project.tracks.a,0).root.x,b0=poseAt(project.tracks.b,0).root.x;
    shiftTrack(project.tracks.b,a0+direction*distance-b0);
    const out=applyFightMoveSequence(project,"a","b",0,settings,[id]);
    const snap=out.tracks.a.find(k=>k.easing==="snap"), contactTime=snap?.time??move.contactTime;
    const a=poseAt(out.tracks.a,contactTime),b=poseAt(out.tracks.b,contactTime),rootDistance=Math.abs(b.root.x-a.root.x);
    const endpoint=move.contact?.endpoint&&move.contact.endpoint!=="weapon"?a[move.contact.endpoint]:a.rightWrist;
    const target=move.contact?.target==="body"?b.torso:move.contact?.target==="upperTorso"?b.torso:b.head;
    const contactGap=Math.hypot(endpoint.x-target.x,endpoint.y-target.y);
    const samples=Array.from({length:81},(_,i)=>i*out.duration/80), minimumSeparation=Math.min(...samples.map(t=>Math.abs(poseAt(out.tracks.b,t).root.x-poseAt(out.tracks.a,t).root.x)));
    const reactionAtContact=out.tracks.b.some(k=>Math.abs(k.time-contactTime)<.001);
    const approachKeys=out.tracks.a.filter(k=>k.time>0&&k.time<contactTime-move.contactTime+.001).length;
    results.push({id,direction,startDistance:distance,contactTime:+contactTime.toFixed(3),rootDistance:+rootDistance.toFixed(1),contactGap:+contactGap.toFixed(1),minimumSeparation:+minimumSeparation.toFixed(1),reactionAtContact,approachKeys});
  }
  const failures=results.filter(r=>!r.reactionAtContact||r.minimumSeparation<90||(!Number.isFinite(r.contactGap)));
  console.log(JSON.stringify({cases:results.length,failures,results},null,2));
  if(failures.length)process.exitCode=1;
}finally{await server.close();}
