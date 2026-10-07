import { useEffect, useRef, useState } from "react";
import {
  basePose,
  bones,
  cameraAt,
  joints,
  poseAt,
  propTransformAt,
  transformAt,
} from "./animation";
import type { CameraState, Character, CharacterTransform, JointName, MotionPath, Pose, Project, V } from "./types";
import { effectParamsAt } from "./effectAnimation";
import {pathLookup,rawPoint,simplifyFreeDraw,smoothPoints} from "./motionPath";

function resolvedPropTransform(p:Project,propId:string,time:number){
  const tf=propTransformAt(p.propTracks?.[propId],time), out={...tf};
  if(!tf.attachment)return out;
  const track=p.tracks[tf.attachment.actorId]??[], actorPose=poseAt(track,time), actorTf=transformAt(track,time),
    joint=applyTransform(actorPose[tf.attachment.joint],actorPose.root,actorTf);
  out.x=joint.x+tf.attachment.offsetX; out.y=joint.y+tf.attachment.offsetY;
  const wrist=tf.attachment.joint;
  const elbow=wrist==="rightWrist"?"rightElbow":wrist==="leftWrist"?"leftElbow":undefined;
  if(elbow){
    const e=applyTransform(actorPose[elbow],actorPose.root,actorTf);
    out.rotation=Math.atan2(joint.y-e.y,joint.x-e.x)*180/Math.PI+90+tf.rotation+tf.attachment.rotation;
  }else out.rotation=tf.rotation+tf.attachment.rotation+actorTf.rotation;
  return out;
}
export function bladePointsAt(p:Project,propId:string,time:number){
  const tf=resolvedPropTransform(p,propId,time), rad=tf.rotation*Math.PI/180,
    point=(x:number,y:number)=>({x:tf.x+(x*Math.cos(rad)-y*Math.sin(rad))*tf.scaleX*(tf.flipH?-1:1),y:tf.y+(x*Math.sin(rad)+y*Math.cos(rad))*tf.scaleY});
  return {base:point(0,60),tip:point(0,-108)};
}
export function drawScene(
  ctx: CanvasRenderingContext2D,
  p: Project,
  time: number,
  w: number,
  h: number,
  interactive = true,
  preview?: { id: string; pose: Pose } | null,
  viewOverride?: CameraState & { width: number; height: number },
  effectPreviewId?:string|null,
) {
  const format = p.format ?? { width: 1080, height: 1920 },
    fw = format.width,
    fh = format.height,
    groundY = Math.min(910, fh * 0.8),
    viewWidth = viewOverride?.width ?? fw,
    viewHeight = viewOverride?.height ?? fh,
    sx = w / viewWidth,
    sy = h / viewHeight;
  ctx.setTransform(sx, 0, 0, sy, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, fh);
  g.addColorStop(0, p.background.top);
  g.addColorStop(1, p.background.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
  if (p.background.image) {
    const im = new Image();
    im.src = p.background.image;
    if (im.complete) ctx.drawImage(im, 0, 0, viewWidth, viewHeight);
  }
  const cam = viewOverride ?? cameraAt(p.camera, time);
  ctx.save();
  let shakeX = 0,
    shakeY = 0,
    shakeRotation = 0;
  p.effects
    .filter(
      (e) =>
        e.type === "shake" && time >= e.time && time <= e.time + e.duration,
    )
    .forEach((e) => {
      const fade = 1 - (time - e.time) / e.duration;
      shakeX += Math.sin(time * 100) * e.strength * fade;
      shakeY += Math.cos(time * 83) * e.strength * fade;
      shakeRotation += Math.sin((time - e.time) * 72) * e.strength * 0.35 * fade;
    });
  ctx.translate(viewWidth / 2 + shakeX, viewHeight / 2 + shakeY);
  ctx.rotate((-(cam.rotation) + shakeRotation) * Math.PI / 180);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  if (p.background.grid) {
    ctx.strokeStyle = "#39435c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1000, groundY);
    ctx.lineTo(fw + 1000, groundY);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    for (let x = -500; x < fw + 700; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 500, fh);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const trails = p.trail;
  for (const c of p.characters) {
    if (!c.visible) continue;
    for (let i = trails; i >= 1; i--)
      drawStick(
        ctx,
        poseAt(p.tracks[c.id], Math.max(0, time - i * 0.045)),
        c.color,
        0.08 * i,
        false,
        transformAt(p.tracks[c.id], Math.max(0, time - i * 0.045)),
        c,
      );
    const actual = poseAt(p.tracks[c.id], time);
    drawStick(
      ctx,
      actual,
      c.color,
      preview?.id === c.id ? 0.35 : 1,
      false,
      transformAt(p.tracks[c.id], time),
      c,
      poseAt(p.tracks[c.id],Math.max(0,time-.09)),
    );
    if (preview?.id === c.id)
      drawStick(
        ctx,
        preview.pose,
        "#8fd3ff",
        0.8,
        false,
        transformAt(p.tracks[c.id], time),
        c,
      );
  }
  for (const prop of [...(p.props ?? [])]
    .filter((x) => x.visible)
    .sort((a, b) => a.layer - b.layer)) {
    const tf = resolvedPropTransform(p,prop.id,time);
    drawProp(ctx, prop.type, prop.color, tf, prop.image);
  }
  const lensBlood:{seed:number;q:number;fade:number;amount:number;color:string}[]=[];
  for (const e of p.effects) {
    const realAge=time-e.time,previewBlood=e.type==="blood"&&e.id===effectPreviewId&&realAge>=0&&realAge<Math.min(.04,e.duration*.12),age=previewBlood?e.duration*.42:realAge;
    if (age < 0 || age > e.duration) continue;
    const q = age / e.duration,
      fade = 1 - q;
    const animated=effectParamsAt(e,time);
    if(e.type==="aura"){
      const attached=e.targetFighter&&p.tracks[e.targetFighter],center=attached?(()=>{const po=poseAt(p.tracks[e.targetFighter!],time),tf=transformAt(p.tracks[e.targetFighter!],time);return applyTransform(po.root,po.root,tf)})():{x:e.x,y:e.y},
        scale=animated.scale,range=animated.range/100,scatter=animated.scatterRadius,sweep=Math.max(10,animated.arc)*Math.PI/180,count=Math.max(4,Math.round(animated.density)),phase=(time-e.time)*3.2;
      ctx.save();ctx.translate(center.x,center.y);ctx.globalAlpha=Math.max(.08,animated.opacity/100)*Math.min(1,age/.12)*Math.min(1,(e.duration-age)/.12);ctx.strokeStyle=e.color??"#a7f3ff";ctx.fillStyle=e.secondaryColor??e.color??"#fff";ctx.shadowColor=e.color??"#a7f3ff";ctx.shadowBlur=(e.glow??20)*scale;ctx.lineCap="round";
      const radius=(72+scatter*.6)*scale*range,style=e.auraStyle??"spike";
      if(style==="ring"||style==="vortex"){
        const loops=style==="vortex"?3:1;ctx.lineWidth=Math.max(4,10*scale);
        for(let j=0;j<loops;j++){ctx.beginPath();ctx.arc(0,-75*scale,radius+j*24*scale,-sweep/2+phase*(j%2?-.35:.45),sweep/2+phase*(j%2?-.35:.45));ctx.stroke()}
      }else if(style==="flame"||style==="spike"||style==="dragon"){
        ctx.beginPath();const steps=Math.max(12,count*2);for(let i=0;i<=steps;i++){const a=-sweep/2+i/steps*sweep,r=radius+(i%2?scatter*(.45+.25*Math.sin(phase+i)):0),x=Math.cos(a)*r,y=-75*scale+Math.sin(a)*r*1.35;(i?ctx.lineTo(x,y):ctx.moveTo(x,y))}ctx.strokeStyle=e.color??"#ffb23f";ctx.lineWidth=Math.max(5,9*scale);ctx.stroke();
      }else{
        ctx.lineWidth=Math.max(3,6*scale);const base=e.directionX!==undefined?Math.atan2(e.directionY??0,e.directionX):0;
        for(let i=0;i<count;i++){const a=base-sweep/2+i/Math.max(1,count-1)*sweep,wobble=Math.sin(phase*2+i*2.3)*scatter*.18,start=25*scale+(i%3)*scatter*.15,len=(55+(i%4)*18+scatter+wobble)*scale*range;ctx.beginPath();ctx.moveTo(Math.cos(a)*start,-75*scale+Math.sin(a)*start);ctx.lineTo(Math.cos(a)*len,-75*scale+Math.sin(a)*len);ctx.stroke();if(style==="shards"||style==="lightning"){ctx.beginPath();ctx.arc(Math.cos(a)*len,-75*scale+Math.sin(a)*len,Math.max(2,4*scale),0,Math.PI*2);ctx.fill()}}
      }
      ctx.restore();
    }
    if (e.type === "flash") {
      ctx.fillStyle = `rgba(255,255,255,${fade * 0.9*animated.opacity/100})`;
      ctx.fillRect(-1000, -1000, 3000, 4000);
    }
    if (e.type === "shockwave") {
      ctx.strokeStyle = `rgba(255,240,180,${fade*animated.opacity/100})`;
      ctx.lineWidth = 12 * fade*animated.scale;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (30 + 180 * q)*animated.scale*(animated.range/100), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.type === "lines") {
      ctx.strokeStyle = `rgba(255,255,255,${fade*animated.opacity/100})`;
      const lineCount=Math.max(1,Math.round(animated.density)),lineSpread=animated.spread*Math.PI/180;
      for (let i = 0; i < lineCount; i++) {
        const angle=-lineSpread/2+i/Math.max(1,lineCount-1)*lineSpread;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(angle) * 40, e.y + Math.sin(angle) * 40);
        ctx.lineTo(e.x + Math.cos(angle) * 250*animated.scale*(animated.range/100), e.y + Math.sin(angle) * 250*animated.scale*(animated.range/100));
        ctx.stroke();
      }
    }
    if (e.type === "dust") {
      ctx.fillStyle = `rgba(200,190,170,${fade * 0.5*animated.opacity/100})`;
      for (let i = 0; i < Math.round(animated.density); i++) {
        ctx.beginPath();
        ctx.arc(e.x + (i-(animated.density-1)/2) * 18*(animated.range/100), e.y - q * 50*(animated.range/100), (20 + q * 20)*animated.scale, 0, 7);
        ctx.fill();
      }
    }
    if (e.type === "tether" && e.sourceFighter && e.targetFighter) {
      const a = poseAt(p.tracks[e.sourceFighter], time),
        b = poseAt(p.tracks[e.targetFighter], time);
      ctx.save();
      ctx.strokeStyle =
        e.style === "energy"
          ? `rgba(80,190,255,${fade})`
          : `rgba(220,210,180,${fade})`;
      ctx.lineWidth = e.style === "chain" ? 9 : 5;
      ctx.setLineDash(e.style === "chain" ? [12, 8] : []);
      ctx.shadowBlur = e.style === "energy" ? 18 : 0;
      ctx.shadowColor = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(a.rightWrist.x, a.rightWrist.y);
      ctx.lineTo(b.torso.x, b.torso.y);
      ctx.stroke();
      ctx.restore();
    }
    if ((e.type === "frozen" || e.type === "stunned") && e.targetFighter) {
      const q = poseAt(p.tracks[e.targetFighter], time).root;
      ctx.save();
      ctx.strokeStyle =
        e.type === "frozen"
          ? `rgba(90,210,255,${0.8 * fade})`
          : `rgba(255,220,80,${0.8 * fade})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(q.x, q.y - 90, 95 + Math.sin(time * 18) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if(e.type==="motionTrail"&&e.targetFighter){const joint=e.trackedJoint??"rightWrist",samples=Math.max(4,Math.min(24,e.sampleCount??10)),age=e.maximumTrailAge??.35,step=age/samples,times=Array.from({length:samples},(_,i)=>Math.max(0,time-i*step)),blades=e.trackedProp?times.map(t=>bladePointsAt(p,e.trackedProp!,t)):null,pts=blades?.map(x=>x.tip)??times.map(t=>{const po=poseAt(p.tracks[e.targetFighter!],t),tf=transformAt(p.tracks[e.targetFighter!],t);return applyTransform(po[joint],po.root,tf)}),velocity=Math.hypot(pts[0].x-pts[Math.min(2,pts.length-1)].x,pts[0].y-pts[Math.min(2,pts.length-1)].y)/Math.max(.001,step*2),threshold=(e.minimumVelocity??8)*30;if(!e.autoTrail||velocity>threshold){ctx.save();ctx.lineJoin="round";ctx.shadowBlur=(e.glow??18)*e.strength;ctx.shadowColor=e.color??"#fff";for(let i=1;i<pts.length;i++){const alpha=fade*(e.opacity??.9)*(1-i/pts.length)*Math.min(1,velocity/Math.max(1,threshold*2));ctx.globalAlpha=alpha;ctx.fillStyle=e.color??"#fff";if(blades){ctx.beginPath();ctx.moveTo(blades[i-1].base.x,blades[i-1].base.y);ctx.lineTo(blades[i-1].tip.x,blades[i-1].tip.y);ctx.lineTo(blades[i].tip.x,blades[i].tip.y);ctx.lineTo(blades[i].base.x,blades[i].base.y);ctx.closePath();ctx.fill()}else{ctx.strokeStyle=e.color??"#fff";ctx.lineWidth=(e.width??42)*e.strength*(1-i/pts.length);ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke()}}ctx.restore()}}
    if(e.type==="motionTrail"&&!e.targetFighter){ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=fade*animated.opacity/100;ctx.strokeStyle=e.color??"#fff";ctx.shadowColor=e.color??"#fff";ctx.shadowBlur=(e.glow??16)*animated.scale;ctx.lineCap="round";ctx.lineWidth=Math.max(5,(e.width??42)*animated.scale*.35);ctx.beginPath();ctx.arc(0,0,80*(animated.range/100)*animated.scale,-2.35,-2.35+animated.arc*Math.PI/180);ctx.stroke();ctx.restore()}
    if(e.preset==="ink_crescent_slash"){
      const root=e.targetFighter?(()=>{const po=poseAt(p.tracks[e.targetFighter!],time),tf=transformAt(p.tracks[e.targetFighter!],time);return applyTransform(po.root,po.root,tf)})():{x:e.x,y:e.y+105},dir=e.directionX&&e.directionX<0?-1:1;
      ctx.save();ctx.translate(root.x,root.y-105);ctx.scale(dir,1);ctx.globalAlpha=fade*.82;ctx.lineCap="round";
      ctx.shadowBlur=22*e.strength;ctx.shadowColor=e.secondaryColor??"#111018";ctx.strokeStyle=e.secondaryColor??"#111018";ctx.lineWidth=38*e.strength;ctx.beginPath();ctx.arc(24,0,158,-2.25,1.04);ctx.stroke();
      ctx.shadowBlur=15*e.strength;ctx.shadowColor=e.color??"#fff";ctx.strokeStyle=e.color??"#fff";ctx.lineWidth=18*e.strength;ctx.beginPath();ctx.arc(24,0,158,-2.25,1.04);ctx.stroke();ctx.restore();
    }
    if(e.type==="afterimage"&&e.targetFighter){const ch=p.characters.find(c=>c.id===e.targetFighter);if(ch)for(let i=4;i>=1;i--){const po=poseAt(p.tracks[e.targetFighter],Math.max(0,time-i*.06));drawStick(ctx,po,ch.color,fade*.12*(5-i),false)}}
    if(["sparks","hitParticles","clash"].includes(e.type)){ctx.save();const red=e.type==="hitParticles";ctx.strokeStyle=red?(e.color??`rgba(235,45,65,${fade})`):`rgba(255,225,110,${fade})`;ctx.globalAlpha=fade*animated.opacity/100;ctx.lineWidth=4+animated.scale*3;const count=Math.max(1,Math.round(animated.density)),spreadAmount=animated.spread*Math.PI/180,speed=animated.range/100;for(let i=0;i<count;i++){const spread=((i/count)-.5)*spreadAmount,len=(35+i%4*13)*animated.scale*speed,base=Math.atan2(e.directionY??0,e.directionX??1),angle=base+spread,dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*q,e.y+dy*q);ctx.stroke()}if(e.type==="clash"){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(e.x,e.y,35*fade*animated.scale,0,7);ctx.fill()}ctx.restore()}
    if(e.type==="blood"){
      const count=Math.max(1,Math.round(animated.density)),base=Math.atan2(e.directionY??0,e.directionX??1),spreadAmount=animated.spread*Math.PI/180,speedScale=animated.range/100,seed=[...e.id].reduce((sum,char)=>sum+char.charCodeAt(0),0),random=(index:number,salt=0)=>{const value=Math.sin((seed+index*73+salt*191)*12.9898)*43758.5453;return value-Math.floor(value)};
      ctx.save();ctx.lineCap="round";
      for(let i=0;i<count;i++){
        const angle=base+(random(i,1)-.5)*spreadAmount,originScatter=animated.scatterRadius*random(i,2),originAngle=random(i,3)*Math.PI*2,originX=e.x+Math.cos(originAngle)*originScatter*.35,originY=e.y+Math.sin(originAngle)*originScatter*.35,
          speed=(42+random(i,4)*145)*animated.scale*speedScale,gravity=(70+random(i,5)*85)*q*q,
          x=originX+Math.cos(angle)*speed*q,y=originY+Math.sin(angle)*speed*q+gravity,
          velocityX=Math.cos(angle)*speed,velocityY=Math.sin(angle)*speed+(140+random(i,5)*80)*q,
          radius=Math.max(1.4,(2.2+random(i,6)*5.8)*Math.sqrt(Math.max(.2,animated.scale))*(1-q*.38)),rotation=Math.atan2(velocityY,velocityX),dropAlpha=Math.min(1,fade*1.8)*animated.opacity/100;
        ctx.globalAlpha=dropAlpha;ctx.fillStyle=i%5===0?(e.secondaryColor??"#5d0717"):(e.color??"#b3122d");ctx.strokeStyle=e.color??"#8f0b22";
        if(q<.68&&random(i,7)>.3){const trail=(8+random(i,8)*24)*animated.scale;ctx.lineWidth=Math.max(1.2,radius*.45);ctx.beginPath();ctx.moveTo(x-Math.cos(rotation)*trail,y-Math.sin(rotation)*trail);ctx.lineTo(x,y);ctx.stroke()}
        ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();ctx.ellipse(0,0,radius*1.65,radius*.82,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-radius*2.1,0);ctx.lineTo(-radius*.7,-radius*.58);ctx.lineTo(-radius*.7,radius*.58);ctx.closePath();ctx.fill();ctx.restore();
        if(i%4===0){ctx.globalAlpha=dropAlpha*.72;ctx.beginPath();ctx.arc(x+(random(i,9)-.5)*radius*5,y+(random(i,10)-.5)*radius*5,Math.max(1,radius*.32),0,Math.PI*2);ctx.fill()}
      }
      if(q>.18&&q<.94&&count>=8)lensBlood.push({seed,q,fade:animated.opacity/100*Math.min(1,(q-.18)/.12)*Math.min(1,(.94-q)/.18),amount:Math.min(5,1+Math.floor(count/12)),color:e.color??"#8f0b22"});
      ctx.restore();
    }
  }
  ctx.restore();
  if(lensBlood.length){ctx.save();ctx.setTransform(1,0,0,1,0,0);for(const spray of lensBlood){for(let i=0;i<spray.amount;i++){const random=(salt:number)=>{const value=Math.sin((spray.seed+i*97+salt*241)*7.123)*9182.771;return value-Math.floor(value)},x=w*(.08+random(1)*.84),y=h*(.08+random(2)*.78),radius=Math.max(5,Math.min(w,h)*(.012+random(3)*.025)),alpha=spray.fade*(.2+random(4)*.32);ctx.globalAlpha=alpha;ctx.fillStyle=spray.color;ctx.save();ctx.translate(x,y);ctx.rotate((random(5)-.5)*1.5);ctx.beginPath();ctx.ellipse(0,0,radius*.72,radius*1.15,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,radius*.6);ctx.quadraticCurveTo(radius*.25,radius*1.55,0,radius*2.35);ctx.quadraticCurveTo(-radius*.22,radius*1.5,0,radius*.6);ctx.fill();ctx.restore();for(let j=0;j<2;j++){ctx.globalAlpha=alpha*.65;ctx.beginPath();ctx.arc(x+(random(7+j)-.5)*radius*3.4,y+(random(9+j)-.5)*radius*2.8,Math.max(2,radius*(.12+random(11+j)*.16)),0,Math.PI*2);ctx.fill()}}}ctx.restore()}
}
function drawProp(
  ctx: CanvasRenderingContext2D,
  type: string,
  color: string,
  t: import("./types").PropTransform,
  image?: string,
) {
  ctx.save();
  ctx.globalAlpha = t.opacity;
  ctx.translate(t.x, t.y);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(t.scaleX * (t.flipH ? -1 : 1), t.scaleY);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#dcecff";
  ctx.lineWidth = 6;
  ctx.lineJoin="round";ctx.lineCap="round";
  if (type === "image" && image) {
    const bitmap = new Image();
    bitmap.src = image;
    if (bitmap.complete) ctx.drawImage(bitmap, -60, -60, 120, 120);
    else {
      ctx.fillRect(-45, -45, 90, 90);
    }
  } else if (type === "chair") {
    ctx.save();ctx.fillStyle="#8d5b3c";ctx.strokeStyle="#d49a69";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(-58,-38,116,26,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(-54,-122,22,88,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(-49,-5,13,88,5);ctx.roundRect(36,-5,13,88,5);ctx.fill();ctx.stroke();ctx.restore();
  } else if (type === "table") {
    ctx.save();ctx.fillStyle="#86573a";ctx.strokeStyle="#d39b70";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(-105,-28,210,25,7);ctx.fill();ctx.stroke();for(const x of [-82,65]){ctx.beginPath();ctx.roundRect(x,0,17,105,5);ctx.fill();ctx.stroke()}ctx.restore();
  } else if (type === "cup") {
    ctx.save();ctx.fillStyle="#e8edf3";ctx.strokeStyle="#90a8bb";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-25,-32);ctx.lineTo(22,-32);ctx.lineTo(17,25);ctx.quadraticCurveTo(0,33,-18,25);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(-2,-32,24,7,0,0,Math.PI*2);ctx.fillStyle="#68402b";ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(23,-7,19,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.restore();
  } else if(type==="phone"){
    ctx.save();ctx.fillStyle="#121a26";ctx.strokeStyle="#7fd3ff";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-28,-55,56,110,10);ctx.fill();ctx.stroke();ctx.fillStyle="#1d79aa";ctx.fillRect(-21,-43,42,80);ctx.fillStyle="#d8f4ff";ctx.beginPath();ctx.arc(0,46,4,0,7);ctx.fill();ctx.restore();
  } else if(type==="book"){
    ctx.save();ctx.fillStyle="#9d3f4c";ctx.strokeStyle="#f0c9a4";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-58,-42,116,84,6);ctx.fill();ctx.stroke();ctx.fillStyle="#f4e6cf";ctx.fillRect(-49,-34,43,68);ctx.fillRect(6,-34,43,68);ctx.strokeStyle="#8f6d58";ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(0,38);ctx.stroke();ctx.restore();
  } else if(type==="flower"){
    ctx.save();ctx.strokeStyle="#4c9b58";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,70);ctx.quadraticCurveTo(-8,10,0,-32);ctx.stroke();ctx.fillStyle="#4fa861";ctx.beginPath();ctx.ellipse(-13,20,20,9,-.5,0,7);ctx.fill();ctx.fillStyle="#ff6b9d";for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.ellipse(Math.cos(a)*23,-50+Math.sin(a)*23,17,10,a,0,7);ctx.fill()}ctx.fillStyle="#ffd15b";ctx.beginPath();ctx.arc(0,-50,12,0,7);ctx.fill();ctx.restore();
  } else if(type==="gift"){
    ctx.save();ctx.fillStyle="#cf405b";ctx.strokeStyle="#ffd0da";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-50,-38,100,88,7);ctx.fill();ctx.stroke();ctx.fillStyle="#f4bf4f";ctx.fillRect(-8,-38,16,88);ctx.fillRect(-55,-45,110,18);ctx.beginPath();ctx.ellipse(-18,-56,24,13,-.5,0,7);ctx.ellipse(18,-56,24,13,.5,0,7);ctx.fill();ctx.restore();
  } else if (type === "staff") {
    ctx.save();ctx.strokeStyle="#7f4b2c";ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(-4,105);ctx.quadraticCurveTo(5,5,-4,-108);ctx.stroke();ctx.strokeStyle="#d4a15e";ctx.lineWidth=4;for(const y of [-65,45]){ctx.beginPath();ctx.moveTo(-10,y);ctx.lineTo(8,y+2);ctx.stroke()}ctx.restore();
  } else if(type==="spear"){
    ctx.save();ctx.strokeStyle="#7b4b2c";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,112);ctx.lineTo(0,-82);ctx.stroke();ctx.fillStyle="#e7edf3";ctx.strokeStyle="#8796a7";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-135);ctx.lineTo(-18,-82);ctx.lineTo(0,-70);ctx.lineTo(18,-82);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#b88a43";ctx.fillRect(-15,-78,30,7);ctx.restore();
  } else if (type === "sword") {
    ctx.save();
    ctx.fillStyle="#29211f";ctx.fillRect(-7,48,14,62);
    ctx.fillStyle="#d8aa4f";ctx.fillRect(-28,42,56,8);
    const steel=ctx.createLinearGradient(-8,0,10,0);steel.addColorStop(0,"#8795a6");steel.addColorStop(.45,"#f5f8fb");steel.addColorStop(1,"#aab7c6");
    ctx.fillStyle=steel;ctx.strokeStyle="#eaf2fb";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-6,42);ctx.quadraticCurveTo(-12,-40,-3,-118);ctx.quadraticCurveTo(7,-112,10,-101);ctx.lineTo(7,42);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  } else if (type === "knife") {
    ctx.save();
    ctx.fillStyle="#302522";ctx.fillRect(-8,18,16,58);
    ctx.fillStyle="#c99b43";ctx.fillRect(-22,12,44,8);
    const steel=ctx.createLinearGradient(-10,0,10,0);steel.addColorStop(0,"#8190a2");steel.addColorStop(.5,"#f4f7fb");steel.addColorStop(1,"#a8b4c2");
    ctx.fillStyle=steel;ctx.strokeStyle="#eaf2fb";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,12);ctx.lineTo(-5,-62);ctx.lineTo(10,-46);ctx.lineTo(8,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  } else if(type==="gun"){
    ctx.save();ctx.fillStyle="#26313d";ctx.strokeStyle="#9aabba";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-70,-28);ctx.lineTo(52,-28);ctx.quadraticCurveTo(72,-24,72,-8);ctx.lineTo(25,4);ctx.lineTo(18,20);ctx.lineTo(-5,20);ctx.lineTo(-16,70);ctx.lineTo(-48,70);ctx.lineTo(-37,12);ctx.lineTo(-70,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#151c24";ctx.fillRect(-67,-21,106,12);ctx.beginPath();ctx.arc(-4,18,17,0,Math.PI);ctx.stroke();ctx.restore();
  } else if (type === "shield") {
    ctx.save();ctx.fillStyle=color;ctx.strokeStyle="#d7e5f2";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-68);ctx.quadraticCurveTo(58,-57,58,-8);ctx.quadraticCurveTo(48,52,0,78);ctx.quadraticCurveTo(-48,52,-58,-8);ctx.quadraticCurveTo(-58,-57,0,-68);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#e1b64f";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(0,59);ctx.moveTo(-42,-5);ctx.lineTo(42,-5);ctx.stroke();ctx.restore();
  } else if (type === "ball" || type === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, 7);
    ctx.fill();
    ctx.stroke();if(type==="ball"){ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,28,0,7);ctx.moveTo(-43,-10);ctx.quadraticCurveTo(0,12,43,-10);ctx.moveTo(-8,-44);ctx.quadraticCurveTo(12,0,-8,44);ctx.stroke()}
  } else if(type==="sofa"||type==="bench"){
    ctx.save();ctx.fillStyle=type==="sofa"?"#516f91":"#86583b";ctx.strokeStyle=type==="sofa"?"#9fc4e8":"#d3a176";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(-105,-50,210,76,16);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(-118,5,236,48,12);ctx.fill();ctx.stroke();ctx.fillRect(-95,50,18,35);ctx.fillRect(77,50,18,35);ctx.restore();
  } else if(type==="bed"){
    ctx.save();ctx.fillStyle="#d9e1ea";ctx.strokeStyle="#8aa1b8";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(-115,-25,230,65,12);ctx.fill();ctx.stroke();ctx.fillStyle="#819bc0";ctx.beginPath();ctx.roundRect(-112,-50,72,34,12);ctx.fill();ctx.fillStyle="#70533f";ctx.fillRect(-120,-57,12,132);ctx.fillRect(108,25,12,50);ctx.restore();
  } else if(type==="bag"){
    ctx.save();ctx.fillStyle="#805739";ctx.strokeStyle="#d0a477";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(-50,-35,100,90,12);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-34,30,Math.PI,0);ctx.stroke();ctx.restore();
  } else if(type==="umbrella"){
    ctx.save();ctx.fillStyle="#4e9ed0";ctx.strokeStyle="#bde8ff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-25,72,Math.PI,Math.PI*2);ctx.lineTo(-72,-25);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#6d7680";ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(0,80);ctx.quadraticCurveTo(0,105,22,92);ctx.stroke();ctx.restore();
  } else if(type==="letter"){
    ctx.save();ctx.fillStyle="#f0e3c9";ctx.strokeStyle="#9d8262";ctx.lineWidth=4;ctx.fillRect(-65,-42,130,84);ctx.strokeRect(-65,-42,130,84);ctx.beginPath();ctx.moveTo(-62,-39);ctx.lineTo(0,5);ctx.lineTo(62,-39);ctx.stroke();ctx.restore();
  } else if(type==="flashlight"){
    ctx.save();ctx.fillStyle="#34414f";ctx.strokeStyle="#a9bdce";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-18,-72,36,105,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-18,-72);ctx.lineTo(-35,-100);ctx.lineTo(35,-100);ctx.lineTo(18,-72);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#fff0a8";ctx.fillRect(-28,-96,56,8);ctx.restore();
  } else if(type==="radio"){
    ctx.save();ctx.fillStyle="#394958";ctx.strokeStyle="#a9bfce";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-67,-45,134,90,9);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(-28,4,27,0,7);ctx.stroke();ctx.fillStyle="#93a9ba";ctx.fillRect(13,-25,39,9);ctx.fillRect(13,-8,39,6);ctx.beginPath();ctx.moveTo(42,-45);ctx.lineTo(57,-95);ctx.stroke();ctx.restore();
  } else if(type==="line"){
    ctx.strokeStyle=color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,-75);ctx.lineTo(0,75);ctx.stroke();
  } else {
    ctx.fillRect(-45, -45, 90, 90);
    ctx.strokeRect(-45, -45, 90, 90);
  }
  ctx.restore();
}
const propHitSize=(type:string)=>({sword:{x:38,y:125},knife:{x:34,y:82},staff:{x:26,y:115},spear:{x:32,y:145},gun:{x:82,y:82},table:{x:115,y:110},chair:{x:70,y:130},sofa:{x:125,y:90},bed:{x:130,y:85},bench:{x:125,y:90},umbrella:{x:85,y:115},radio:{x:78,y:105}}[type]??{x:75,y:75});
export function drawCharacterPreview(ctx:CanvasRenderingContext2D,character:Character,time:number,w:number,h:number){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#17233c");g.addColorStop(1,"#080d18");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="#31425d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(50,h*.82);ctx.lineTo(w-50,h*.82);ctx.stroke();
  const pose=basePose(w/2,h*.59,false),previous=basePose(w/2,h*.59,false),phase=time*Math.PI*2/2.4,shift=Math.sin(phase)*8;
  pose.torso.x+=shift*.55;pose.neck.x+=shift*.7;pose.head.x+=shift;pose.leftWrist.y+=Math.sin(phase+.8)*8;pose.rightWrist.y+=Math.sin(phase+2.5)*7;pose.leftKnee.x-=shift*.18;pose.rightHip.x+=shift*.12;
  previous.root.x-=Math.cos(phase)*3;previous.root.y-=Math.sin(phase)*2;
  const scale=character.preset==="large"?1.24:character.preset==="child"?.7:character.preset==="small"?.82:character.preset==="female"?.96:character.preset==="male"?1.04:1,
    transform={rotation:0,scaleX:scale,scaleY:scale,flipH:false,flipV:false};
  drawStick(ctx,pose,character.color,1,false,transform,character,previous);
  if(character.equipment&&character.equipment!=="none"){
    const wrist=pose.rightWrist,elbow=pose.rightElbow,rotation=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x)*180/Math.PI+90;
    drawProp(ctx,character.equipment,character.appearance?.accentColor??"#dcecff",{x:wrist.x,y:wrist.y,rotation,scaleX:.72,scaleY:.72,flipH:false,opacity:1,attachment:null});
  }
}
export function drawStick(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  color: string,
  alpha: number,
  handles: boolean,
  transform: CharacterTransform = {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipH: false,
    flipV: false,
  },
  character?:Character,
  previousPose?:Pose,
) {
  ctx.save();
  ctx.translate(p.root.x, p.root.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(
    transform.scaleX * (transform.flipH ? -1 : 1),
    transform.scaleY * (transform.flipV ? -1 : 1),
  );
  ctx.translate(-p.root.x, -p.root.y);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const profile=character?.preset??"standard";
  const visual={
    standard:{limb:31,joint:15.5,head:40,shoulder:9,waist:9,hip:7},
    male:{limb:34,joint:17,head:41,shoulder:15,waist:11,hip:8},
    female:{limb:28,joint:14,head:39,shoulder:6,waist:7,hip:10},
    child:{limb:26,joint:13,head:44,shoulder:5,waist:7,hip:8},
    large:{limb:41,joint:20.5,head:47,shoulder:19,waist:17,hip:14},
    small:{limb:25,joint:12.5,head:36,shoulder:5,waist:6,hip:7},
  }[profile]??{limb:31,joint:15.5,head:40,shoulder:9,waist:9,hip:7};
  const thickness=visual.limb,headRadius=visual.head;
  const segment=(a:JointName,b:JointName,width=thickness)=>{
    ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(p[a].x,p[a].y);ctx.lineTo(p[b].x,p[b].y);ctx.stroke();
  };
  const segmentPoints=(a:{x:number;y:number},b:{x:number;y:number},width=thickness)=>{
    ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  };
  const smoothSpine=()=>{
    const root=p.root,waist=p.torso,neck=p.neck;
    // Two cubic sections meet at the authored torso control with the same
    // tangent. This keeps the existing three-joint rig fully editable while
    // removing the sharp V-shaped hinge produced by two straight capsules.
    const tangent={x:(neck.x-root.x)*.18,y:(neck.y-root.y)*.18};
    ctx.lineWidth=thickness;ctx.beginPath();ctx.moveTo(root.x,root.y);
    ctx.bezierCurveTo(
      root.x+(waist.x-root.x)*.42,
      root.y+(waist.y-root.y)*.42,
      waist.x-tangent.x,
      waist.y-tangent.y,
      waist.x,
      waist.y,
    );
    ctx.bezierCurveTo(
      waist.x+tangent.x,
      waist.y+tangent.y,
      neck.x-(neck.x-waist.x)*.42,
      neck.y-(neck.y-waist.y)*.42,
      neck.x,
      neck.y,
    );
    ctx.stroke();
  };
  const joint=(name:JointName,r=visual.joint)=>{ctx.beginPath();ctx.arc(p[name].x,p[name].y,r,0,Math.PI*2);ctx.fill()};

  // Limbs remain driven by the original bones, but are rendered as overlapping
  // rounded capsules. The overlap removes the mechanical gaps that otherwise
  // appear at elbows, knees, shoulders, and hips in extreme poses.
  // Visually merge the two thigh roots into the pelvis axis. The editable hip
  // handles stay independent, while the silhouette no longer grows side bumps.
  const visualHip=(side:"left"|"right")=>({
    x:p.root.x+(p[`${side}Hip`].x-p.root.x)*.28,
    y:p.root.y+(p[`${side}Hip`].y-p.root.y)*.28,
  });
  segmentPoints(visualHip("left"),p.leftKnee);
  segmentPoints(visualHip("right"),p.rightKnee);
  segment("leftKnee","leftAnkle");
  segment("rightKnee","rightAnkle");
  segment("leftAnkle","leftToe",thickness*.76);
  segment("rightAnkle","rightToe",thickness*.76);
  ([
    ["neck","leftShoulder"],["neck","rightShoulder"],
    ["leftShoulder","leftElbow"],["leftElbow","leftWrist"],
    ["rightShoulder","rightElbow"],["rightElbow","rightWrist"],
  ] as [JointName,JointName][]).forEach(([a,b])=>segment(a,b));
  (["leftKnee","rightKnee","leftElbow","rightElbow","leftAnkle","rightAnkle","leftWrist","rightWrist"] as JointName[]).forEach((name)=>joint(name));
  joint("leftToe",visual.joint*.76);joint("rightToe",visual.joint*.76);

  // The body uses the same rounded-capsule language as every limb. Unlike a
  // polygon derived from shoulder/hip distance, it cannot balloon or fold
  // over itself in wide or crouched poses.
  const ls=p.leftShoulder,rs=p.rightShoulder;
  smoothSpine();
  joint("root");joint("neck");
  (["leftShoulder","rightShoulder"] as JointName[]).forEach((name)=>joint(name));

  // The neck and filled head sit above the body silhouette; accessories are
  // layered afterward using the same joint anchors.
  segment("neck","head",thickness);
  ctx.beginPath();ctx.arc(p.head.x,p.head.y,headRadius,0,Math.PI*2);ctx.fill();
  if(character?.appearance){
    const a=character.appearance,accent=a.accentColor||color,head=p.head,neck=p.neck,ls=p.leftShoulder,rs=p.rightShoulder,
      vx=previousPose?p.root.x-previousPose.root.x:0,vy=previousPose?p.root.y-previousPose.root.y:0,
      trailX=Math.max(-42,Math.min(42,-vx*1.8)),trailY=Math.max(-22,Math.min(28,-vy*1.2));
    ctx.save();ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.lineWidth=Math.max(7,thickness*.55);ctx.lineCap="round";ctx.lineJoin="round";
    if(a.head==="headband"){ctx.beginPath();ctx.moveTo(head.x-headRadius,head.y-8);ctx.lineTo(head.x+headRadius,head.y-8);ctx.stroke();ctx.beginPath();ctx.moveTo(head.x-headRadius,head.y-8);ctx.lineTo(head.x-headRadius-28+trailX*.3,head.y+8+trailY*.2);ctx.stroke()}
    if(a.head==="hat"){ctx.fillRect(head.x-headRadius-8,head.y-headRadius-13,headRadius*2+16,10);ctx.beginPath();ctx.arc(head.x,head.y-headRadius-12,headRadius*.72,Math.PI,Math.PI*2);ctx.fill()}
    if(a.head==="hood"){ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(head.x,head.y,headRadius+13,Math.PI*.72,Math.PI*2.28);ctx.stroke()}
    if(a.face==="mask"||a.face==="ninja-mask"){ctx.globalAlpha=.78;ctx.beginPath();ctx.arc(head.x,head.y+(a.face==="ninja-mask"?12:3),headRadius*.72,0,Math.PI);ctx.fill()}
    if(a.face==="glasses"){ctx.globalAlpha=1;ctx.lineWidth=6;ctx.beginPath();ctx.arc(head.x-15,head.y-3,13,0,7);ctx.arc(head.x+15,head.y-3,13,0,7);ctx.moveTo(head.x-2,head.y-3);ctx.lineTo(head.x+2,head.y-3);ctx.stroke()}
    if(a.body==="scarf"){ctx.globalAlpha=.88;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(neck.x-12,neck.y+9);ctx.lineTo(neck.x+15,neck.y+9);ctx.stroke();ctx.beginPath();ctx.moveTo(neck.x-4,neck.y+12);ctx.quadraticCurveTo(neck.x-28+trailX*.45,neck.y+34,neck.x-52+trailX,neck.y+46+trailY);ctx.stroke()}
    if(a.body==="cape"){ctx.globalAlpha=.45;const shoulder={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2};ctx.beginPath();ctx.moveTo(ls.x,ls.y);ctx.lineTo(rs.x,rs.y);ctx.lineTo(shoulder.x+45+trailX,shoulder.y+128+trailY);ctx.lineTo(shoulder.x-34+trailX*.55,shoulder.y+118+trailY);ctx.closePath();ctx.fill();ctx.globalAlpha=.9;ctx.stroke()}
    ctx.restore();
  }
  if (handles) {
    ctx.fillStyle = "#fff";
    joints
      .filter((j) => j !== "root")
      .forEach((j) => {
        ctx.beginPath();
        ctx.arc(p[j].x, p[j].y, 8, 0, 7);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    ctx.save();
    ctx.translate(p.root.x, p.root.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffc857";
    ctx.strokeStyle = "#241800";
    ctx.lineWidth = 4;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();
  }
  ctx.restore();
}
export type TransformMode = "move" | "rotate" | "scale" | "pose" | "camera";
type Drag = {
  char: string;
  effectId?: string;
  effectPosition?: { x: number; y: number };
  propId?: string;
  propTransform?: import("./types").PropTransform;
  mode: TransformMode;
  pose: Pose;
  transform: CharacterTransform;
  start: { x: number; y: number };
  joint?: JointName;
  startAngle?: number;
  startDistance?: number;
  camera?: CameraState;
  cameraAction?: "pan" | "zoom" | "rotate";
  startClient?: { x: number; y: number };
  moved?: boolean;
  pathAction?:"anchor"|"in"|"out"|"move"|"draw";
  pathPoint?:number;
  pathStart?:MotionPath;
  freeDraw?:V[];
};
type JointHit = { char: string; joint: JointName; pose: Pose; transform: CharacterTransform; distance: number };
const jointDisplayName=(joint:JointName)=>{
  if(joint==="root")return "Pelvis / Root";
  if(joint==="torso")return "Spine / Waist";
  return joint.replace(/([A-Z])/g," $1").replace(/^./,letter=>letter.toUpperCase());
};
const jointEditorColor=(joint:JointName)=>joint.startsWith("left")?"#54d8ff":joint.startsWith("right")?"#ff78bd":["root","torso"].includes(joint)?"#ffc857":"#9df59a";
const rigChildren:Partial<Record<JointName,JointName[]>>={
  root:["torso","leftHip","rightHip"],torso:["neck"],neck:["head","leftShoulder","rightShoulder"],
  leftShoulder:["leftElbow"],leftElbow:["leftWrist"],rightShoulder:["rightElbow"],rightElbow:["rightWrist"],
  leftHip:["leftKnee"],leftKnee:["leftAnkle"],leftAnkle:["leftToe"],rightHip:["rightKnee"],rightKnee:["rightAnkle"],rightAnkle:["rightToe"],
};
const rigParent:Partial<Record<JointName,JointName>>={};
Object.entries(rigChildren).forEach(([parent,children])=>children?.forEach(child=>rigParent[child]=parent as JointName));
const descendants=(joint:JointName)=>{const out:JointName[]=[];const visit=(name:JointName)=>{for(const child of rigChildren[name]??[]){out.push(child);visit(child)}};visit(joint);return out};
/** Stick Nodes style joint editing: bone lengths stay stable and descendants follow their parent. */
export function editRigJoint(source:Pose,joint:JointName,target:{x:number;y:number}):Pose{
  const pose=structuredClone(source),old=source[joint];
  if(joint==="root"){
    const requested={x:target.x-old.x,y:target.y-old.y},legFits=(amount:number)=>["left","right"].every(side=>{const hip=source[`${side}Hip` as JointName],knee=source[`${side}Knee` as JointName],ankle=source[`${side}Ankle` as JointName],upper=Math.hypot(knee.x-hip.x,knee.y-hip.y),lower=Math.hypot(ankle.x-knee.x,ankle.y-knee.y),distance=Math.hypot(hip.x+requested.x*amount-ankle.x,hip.y+requested.y*amount-ankle.y);return distance<=upper+lower-.5&&distance>=Math.abs(upper-lower)+.5});
    // Keep both feet planted and both leg segment lengths invariant. If the
    // requested pelvis position is unreachable, stop at the reach boundary.
    let amount=1;
    if(!legFits(1)){let low=0,high=1;for(let i=0;i<28;i++){const mid=(low+high)/2;if(legFits(mid))low=mid;else high=mid}amount=low}
    const dx=requested.x*amount,dy=requested.y*amount;
    const solveKnee=(hip:JointName,knee:JointName,ankle:JointName)=>{const h=pose[hip],a=source[ankle],preferred=source[knee],upper=Math.hypot(source[knee].x-source[hip].x,source[knee].y-source[hip].y),lower=Math.hypot(source[ankle].x-source[knee].x,source[ankle].y-source[knee].y),vx=a.x-h.x,vy=a.y-h.y,d=Math.max(1,Math.hypot(vx,vy)),along=(d*d+upper*upper-lower*lower)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along)),ux=vx/d,uy=vy/d,base={x:h.x+ux*along,y:h.y+uy*along},p1={x:base.x-uy*height,y:base.y+ux*height},p2={x:base.x+uy*height,y:base.y-ux*height};pose[knee]=Math.hypot(p1.x-preferred.x,p1.y-preferred.y)<=Math.hypot(p2.x-preferred.x,p2.y-preferred.y)?p1:p2};
    for(const name of ["root","torso","neck","head","leftShoulder","leftElbow","leftWrist","rightShoulder","rightElbow","rightWrist","leftHip","rightHip"] as JointName[]){pose[name].x+=dx;pose[name].y+=dy}
    solveKnee("leftHip","leftKnee","leftAnkle");solveKnee("rightHip","rightKnee","rightAnkle");
    return pose;
  }
  // Feet are direction controls, not load-bearing IK bones. Let the toe
  // endpoint follow the pointer directly so it can cross over the ankle in
  // one gesture and reverse facing without fighting a fixed-radius orbit.
  if(joint==="leftToe"||joint==="rightToe"){
    pose[joint]={x:target.x,y:target.y};
    return pose;
  }
  const parent=rigParent[joint];let next=target;
  if(parent){const anchor=source[parent],length=Math.max(1,Math.hypot(old.x-anchor.x,old.y-anchor.y)),dx=target.x-anchor.x,dy=target.y-anchor.y,distance=Math.max(1,Math.hypot(dx,dy));next={x:anchor.x+dx/distance*length,y:anchor.y+dy/distance*length}}
  const dx=next.x-old.x,dy=next.y-old.y;pose[joint]=next;
  for(const name of descendants(joint)){pose[name].x+=dx;pose[name].y+=dy}
  return pose;
}
const applyTransform = (
  q: { x: number; y: number },
  root: { x: number; y: number },
  t: CharacterTransform,
) => {
  const x = (q.x - root.x) * t.scaleX * (t.flipH ? -1 : 1);
  const y = (q.y - root.y) * t.scaleY * (t.flipV ? -1 : 1);
  const a = (t.rotation * Math.PI) / 180;
  return {
    x: root.x + x * Math.cos(a) - y * Math.sin(a),
    y: root.y + x * Math.sin(a) + y * Math.cos(a),
  };
};
const invertTransform = (
  q: { x: number; y: number },
  root: { x: number; y: number },
  t: CharacterTransform,
) => {
  const a = (-t.rotation * Math.PI) / 180,
    dx = q.x - root.x,
    dy = q.y - root.y;
  return {
    x:
      root.x +
      (dx * Math.cos(a) - dy * Math.sin(a)) / (t.scaleX * (t.flipH ? -1 : 1)),
    y:
      root.y +
      (dx * Math.sin(a) + dy * Math.cos(a)) / (t.scaleY * (t.flipV ? -1 : 1)),
  };
};
const bounds = (pose: Pose, t: CharacterTransform, padding = 30) => {
  const points = joints.map((j) => applyTransform(pose[j], pose.root, t));
  return {
    left: Math.min(...points.map((q) => q.x)) - padding,
    right: Math.max(...points.map((q) => q.x)) + padding,
    top: Math.min(...points.map((q) => q.y)) - padding,
    bottom: Math.max(...points.map((q) => q.y)) + padding,
  };
};
export function CanvasView({
  project,
  time,
  selected,
  selectedProp,
  selectedEffect,
  mode,
  groundLock,
  onSelect,
  onSelectProp,
  onSelectEffect,
  onPoseChange,
  onTransformChange,
  onPropTransformChange,
  onEffectChange,
  onGestureStart,
  onGestureEnd,
  onCameraChange,
  onContextMenu,
  preview,
  previewCamera = false,
  safeArea = false,
  reviewJoints = [],
  workspaceZoom = 1,
  activePath = null,
  onPathChange,
  pathEditing = false,
  guidePaths = [],
}: {
  project: Project;
  time: number;
  selected: string;
  selectedProp: string | null;
  selectedEffect: string | null;
  mode: TransformMode;
  groundLock: boolean;
  onSelect: (v: string, additive?: boolean) => void;
  onSelectProp: (v: string | null) => void;
  onSelectEffect: (v: string | null) => void;
  onPoseChange: (id: string, p: Pose) => void;
  onTransformChange: (id: string, t: CharacterTransform) => void;
  onPropTransformChange: (
    id: string,
    t: import("./types").PropTransform,
  ) => void;
  onEffectChange: (id: string, values: { x: number; y: number }) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onCameraChange: (camera: CameraState) => void;
  onContextMenu: (x: number, y: number) => void;
  preview?: { id: string; pose: Pose } | null;
  previewCamera?: boolean;
  safeArea?: boolean;
  reviewJoints?: JointName[];
  /** Editor-only magnification; never changes actor or output data. */
  workspaceZoom?: number;
  activePath?:MotionPath|null;
  onPathChange?:(path:MotionPath)=>void;
  pathEditing?:boolean;
  guidePaths?:MotionPath[];
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    drag = useRef<Drag | null>(null),
    gestureView = useRef<{x:number;y:number;zoom:number;rotation:number;width:number;height:number}|null>(null),
    [hoverJoint,setHoverJoint]=useState<{char:string;joint:JointName}|null>(null);
  const editorView = () => {
    if(gestureView.current)return gestureView.current;
    const format = project.format ?? { width: 1080, height: 1920 },
      width = 1200,
      height = 800,
      zoom = Math.min(
        (width / format.width) * 0.82,
        (height / format.height) * 0.82,
      ) * workspaceZoom;
    const selectedPose = project.tracks[selected]?.length ? poseAt(project.tracks[selected], time) : null,
      focusAmount = Math.max(0, Math.min(1, (workspaceZoom - 1) / 0.5)),
      center = { x: format.width / 2, y: format.height / 2 },
      focus = selectedPose?.root ?? center;
    // The world editor must remain stationary while the output camera moves.
    // Following output pan/zoom here creates a feedback loop under the pointer.
    return {
      x: center.x + (focus.x - center.x) * focusAmount,
      y: center.y + (focus.y - center.y) * focusAmount,
      zoom,
      rotation: 0,
      width,
      height,
    };
  };
  useEffect(() => {
    const c = ref.current!,
      ctx = c.getContext("2d")!,
      format = project.format ?? { width: 1080, height: 1920 },
      outputCam = cameraAt(project.camera, time),
      view = editorView(),
      cam = previewCamera ? outputCam : view,
      viewWidth = previewCamera ? format.width : view.width,
      viewHeight = previewCamera ? format.height : view.height;
    ctx.clearRect(0, 0, c.width, c.height);
    drawScene(
      ctx,
      project,
      time,
      c.width,
      c.height,
      true,
      preview,
      previewCamera ? undefined : view,
      selectedEffect,
    );
    if (!previewCamera) {
      const width = format.width / outputCam.zoom,
        height = format.height / outputCam.zoom;
      ctx.save();
      ctx.setTransform(c.width / viewWidth, 0, 0, c.height / viewHeight, 0, 0);
      ctx.translate(viewWidth / 2, viewHeight / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);
      ctx.save();
      ctx.translate(outputCam.x, outputCam.y);
      ctx.rotate((outputCam.rotation * Math.PI) / 180);
      const left = -width / 2, top = -height / 2;
      if (mode === "camera") {
        ctx.fillStyle = "rgba(2,5,10,.58)";
        ctx.beginPath();
        ctx.rect(-viewWidth * 3 / cam.zoom, -viewHeight * 3 / cam.zoom, viewWidth * 6 / cam.zoom, viewHeight * 6 / cam.zoom);
        ctx.rect(left, top, width, height);
        ctx.fill("evenodd");
      }
      ctx.strokeStyle = mode === "camera" ? "#67d4ff" : "rgba(150,210,255,.82)";
      ctx.lineWidth = (mode === "camera" ? 4 : 2) / cam.zoom;
      ctx.strokeRect(left, top, width, height);
      if(mode==="camera"){
        ctx.fillStyle="rgba(35,145,205,.055)";
        ctx.fillRect(left,top,width,height);
      }
      if (safeArea) {
        ctx.setLineDash([10 / cam.zoom, 8 / cam.zoom]);
        ctx.strokeStyle = "rgba(255,255,255,.45)";
        ctx.strokeRect(left + width * .08, top + height * .08, width * .84, height * .84);
        ctx.setLineDash([]);
      }
      ctx.font = `${14 / cam.zoom}px system-ui`;
      ctx.fillStyle = "#bde8ff";
      ctx.fillText(mode==="camera"?"✥ CAMERA MODE · DRAG TO PAN":"CAMERA FRAME", left, top - 14 / cam.zoom);
      if(mode==="camera"){
        ctx.fillStyle = "#07111f";
        ctx.strokeStyle = "#67d4ff";
        const hs = 9 / cam.zoom;
        [[left,top],[left+width,top],[left,top+height],[left+width,top+height]].forEach(([x,y]) => {
          ctx.fillRect(x-hs,y-hs,hs*2,hs*2); ctx.strokeRect(x-hs,y-hs,hs*2,hs*2);
        });
        const handleY = top - 54 / cam.zoom;
        ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, handleY + 10 / cam.zoom); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, handleY, 10 / cam.zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }
    // Preview is the clean final camera output. Editor selections/gizmos are
    // intentionally omitted and must never extend beneath the timeline.
    if (previewCamera) return;
    ctx.save();
    ctx.setTransform(
      c.width / viewWidth,
      0,
      0,
      c.height / viewHeight,
      0,
      0,
    );
    ctx.translate(viewWidth / 2, viewHeight / 2);
    ctx.rotate((-cam.rotation * Math.PI) / 180);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    for(const guide of guidePaths.filter(path=>path.id!==activePath?.id)){const table=pathLookup(guide);ctx.save();ctx.strokeStyle="rgba(79,224,193,.22)";ctx.lineWidth=2/cam.zoom;ctx.beginPath();table.forEach((item,index)=>index?ctx.lineTo(item.point.x,item.point.y):ctx.moveTo(item.point.x,item.point.y));ctx.stroke();ctx.restore()}
    if(activePath?.points.length){
      const table=pathLookup(activePath);ctx.save();ctx.strokeStyle="#4fe0c1";ctx.lineWidth=3/cam.zoom;ctx.setLineDash([10/cam.zoom,7/cam.zoom]);ctx.beginPath();table.forEach((item,index)=>index?ctx.lineTo(item.point.x,item.point.y):ctx.moveTo(item.point.x,item.point.y));ctx.stroke();ctx.setLineDash([]);
      activePath.points.forEach((anchor,index)=>{if((activePath.pathType==="bezier"||activePath.pathType==="free-draw")){ctx.strokeStyle="rgba(130,205,255,.7)";ctx.lineWidth=1.5/cam.zoom;for(const key of ["in","out"] as const){const handle=anchor[key];if(!handle)continue;ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);ctx.lineTo(handle.x,handle.y);ctx.stroke();ctx.fillStyle="#10283a";ctx.strokeStyle="#8edcff";ctx.beginPath();ctx.arc(handle.x,handle.y,6/cam.zoom,0,Math.PI*2);ctx.fill();ctx.stroke()}}ctx.fillStyle=index===0?"#75f2ad":index===activePath.points.length-1?"#ffbd69":"#0d2635";ctx.strokeStyle="#e6ffff";ctx.lineWidth=2/cam.zoom;ctx.beginPath();ctx.arc(anchor.x,anchor.y,8/cam.zoom,0,Math.PI*2);ctx.fill();ctx.stroke()});ctx.restore();
    }
    if (selectedEffect) {
      const effect = project.effects.find((item) => item.id === selectedEffect);
      if (effect) {
        const radius = Math.max(42, 70 * Math.max(.25, effect.strength || 1));
        ctx.strokeStyle = "#ff5d86";
        ctx.lineWidth = 2 / cam.zoom;
        ctx.setLineDash([8 / cam.zoom, 7 / cam.zoom]);
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ff5d86";
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 9 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.font=`600 ${13/cam.zoom}px system-ui`;ctx.textBaseline="middle";const label="FX · drag to move",padding=7/cam.zoom,labelWidth=ctx.measureText(label).width+padding*2,labelHeight=25/cam.zoom,labelX=effect.x+14/cam.zoom,labelY=effect.y-labelHeight/2;ctx.fillStyle="rgba(22,8,16,.92)";ctx.strokeStyle="#ff5d86";ctx.lineWidth=1.5/cam.zoom;ctx.beginPath();ctx.roundRect(labelX,labelY,labelWidth,labelHeight,5/cam.zoom);ctx.fill();ctx.stroke();ctx.fillStyle="#ffd7e3";ctx.fillText(label,labelX+padding,effect.y);
      }
      ctx.restore();
      return;
    }
    if (selectedProp) {
      const tf = propTransformAt(project.propTracks?.[selectedProp], time);
      const prop=project.props?.find(item=>item.id===selectedProp),size=propHitSize(prop?.type??"rectangle");
      ctx.translate(tf.x, tf.y);
      ctx.rotate((tf.rotation * Math.PI) / 180);
      ctx.scale(tf.scaleX, tf.scaleY);
      ctx.strokeStyle = "#67d4ff";
      ctx.lineWidth = 2 / cam.zoom;
      ctx.setLineDash([8, 7]);
      ctx.strokeRect(-size.x, -size.y, size.x*2, size.y*2);
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    ctx.restore();
    const selectedCharacter = project.characters.find(
      (item) => item.id === selected && item.visible,
    );
    if (!selectedCharacter) return;
    const pose = poseAt(project.tracks[selected], time),
      tf = transformAt(project.tracks[selected], time),
      b = bounds(pose, tf),
      root = applyTransform(pose.root, pose.root, tf),
      groundY = Math.min(910, format.height * .8);
    ctx.save();
    ctx.setTransform(
      c.width / viewWidth,
      0,
      0,
      c.height / viewHeight,
      0,
      0,
    );
    ctx.translate(viewWidth / 2, viewHeight / 2);
    ctx.rotate((-cam.rotation * Math.PI) / 180);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    // Editor-only placement guides appear with the selected character. They
    // provide stage composition anchors plus an exact crosshair through the
    // actor root, while remaining absent from preview and exported frames.
    ctx.save();
    ctx.lineWidth = 1.5 / cam.zoom;
    ctx.setLineDash([9 / cam.zoom, 8 / cam.zoom]);
    ctx.strokeStyle = "rgba(150,210,255,.28)";
    [format.width / 3, format.width / 2, format.width * 2 / 3].forEach((x) => {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, format.height); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(format.width, groundY); ctx.stroke();
    ctx.strokeStyle = "rgba(255,209,102,.68)";
    ctx.beginPath(); ctx.moveTo(root.x, 0); ctx.lineTo(root.x, format.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, root.y); ctx.lineTo(format.width, root.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,225,160,.92)";
    ctx.font = `${13 / cam.zoom}px system-ui`;
    ctx.fillText(`X ${Math.round(root.x)} · Y ${Math.round(root.y)}`, root.x + 10 / cam.zoom, root.y - 10 / cam.zoom);
    ctx.restore();
    ctx.strokeStyle = "rgba(100,200,255,.8)";
    ctx.lineWidth = 2 / cam.zoom;
    ctx.setLineDash([8, 7]);
    ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.setLineDash([]);
    if(mode==="pose"){
      ctx.save();ctx.lineWidth=3/cam.zoom;ctx.strokeStyle="rgba(90,215,255,.78)";
      for(const [a,boneEnd] of bones){const aa=applyTransform(pose[a],pose.root,tf),bb=applyTransform(pose[boneEnd],pose.root,tf);ctx.beginPath();ctx.moveTo(aa.x,aa.y);ctx.lineTo(bb.x,bb.y);ctx.stroke()}
      for(const name of joints){const point=applyTransform(pose[name],pose.root,tf),root=name==="root",hot=hoverJoint?.char===selected&&hoverJoint.joint===name,color=jointEditorColor(name);ctx.fillStyle=root?"#3a2b10":"#102235";ctx.strokeStyle=hot?"#ffffff":color;ctx.lineWidth=(hot?5:3)/cam.zoom;if(root){const s=(hot?11:9)/cam.zoom;ctx.save();ctx.translate(point.x,point.y);ctx.rotate(Math.PI/4);ctx.fillRect(-s,-s,s*2,s*2);ctx.strokeRect(-s,-s,s*2,s*2);ctx.restore()}else{ctx.beginPath();ctx.arc(point.x,point.y,(hot?11:8)/cam.zoom,0,Math.PI*2);ctx.fill();ctx.stroke();if(hot){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(point.x,point.y,15/cam.zoom,0,Math.PI*2);ctx.stroke()}}}
      if(hoverJoint?.char===selected){const name=hoverJoint.joint,point=applyTransform(pose[name],pose.root,tf),label=jointDisplayName(name),fontSize=15/cam.zoom,padX=9/cam.zoom,padY=6/cam.zoom,offset=20/cam.zoom;ctx.font=`600 ${fontSize}px system-ui`;const width=ctx.measureText(label).width+padX*2,height=fontSize+padY*2,x=point.x+offset,y=point.y-height-offset*.45;ctx.fillStyle="rgba(5,13,25,.94)";ctx.strokeStyle=jointEditorColor(name);ctx.lineWidth=2/cam.zoom;ctx.beginPath();ctx.roundRect(x,y,width,height,6/cam.zoom);ctx.fill();ctx.stroke();ctx.fillStyle="#f5fbff";ctx.textBaseline="middle";ctx.fillText(label,x+padX,y+height/2)}
      ctx.restore();
    }
    ctx.fillStyle = "#07111f";
    ctx.strokeStyle = "#67d4ff";
    [
      [b.left, b.top],
      [b.right, b.top],
      [b.left, b.bottom],
      [b.right, b.bottom],
    ].forEach(([x, y]) => {
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.strokeRect(x - 7, y - 7, 14, 14);
    });
    const rx = (b.left + b.right) / 2,
      ry = b.top - 55;
    ctx.beginPath();
    ctx.moveTo(rx, b.top);
    ctx.lineTo(rx, ry + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, 11, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(pose.root.x, pose.root.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    ctx.restore();
    if (reviewJoints.length && selectedCharacter) {
      ctx.save();ctx.setTransform(c.width/viewWidth,0,0,c.height/viewHeight,0,0);ctx.translate(viewWidth/2,viewHeight/2);ctx.rotate((-cam.rotation*Math.PI)/180);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
      ctx.strokeStyle="#ffbf5b";ctx.lineWidth=4/cam.zoom;ctx.setLineDash([5/cam.zoom,4/cam.zoom]);
      const rp=poseAt(project.tracks[selected],time),rt=transformAt(project.tracks[selected],time);for(const j of reviewJoints){const q=applyTransform(rp[j],rp.root,rt);ctx.beginPath();ctx.arc(q.x,q.y,22/cam.zoom,0,Math.PI*2);ctx.stroke();}ctx.restore();
    }
  }, [project, time, selected, selectedProp, selectedEffect, preview, mode, previewCamera, safeArea, reviewJoints, workspaceZoom, hoverJoint, activePath, guidePaths]);
  const point = (e: React.PointerEvent | React.MouseEvent) => {
    const format = project.format ?? { width: 1080, height: 1920 },
      view = editorView(),
      r = ref.current!.getBoundingClientRect(),
      screen = {
        x: ((e.clientX - r.left) / r.width) * (previewCamera ? format.width : view.width),
        y: ((e.clientY - r.top) / r.height) * (previewCamera ? format.height : view.height),
      },
      cam = previewCamera ? cameraAt(project.camera, time) : view,
      dx = (screen.x - (previewCamera ? format.width : view.width) / 2) / cam.zoom,
      dy = (screen.y - (previewCamera ? format.height : view.height) / 2) / cam.zoom,
      angle = (cam.rotation * Math.PI) / 180,
      cs = Math.cos(angle),
      sn = Math.sin(angle);
    return { x: cam.x + dx * cs - dy * sn, y: cam.y + dx * sn + dy * cs };
  };
  const nearestJoint = (e: React.PointerEvent | React.MouseEvent): JointHit | null => {
    if(mode!=="pose"||previewCamera)return null;
    const q=point(e),view=editorView(),rect=ref.current!.getBoundingClientRect(),screenScale=view.zoom*rect.width/view.width,hitRadius=16;
    let best:JointHit|null=null;
    // Rendering order is deterministic. Later characters/joints win only when
    // distances are effectively equal, matching the front-most painted marker.
    const selectedCharacter=project.characters.find(character=>character.id===selected&&character.visible&&!character.locked),candidates=selectedCharacter?[selectedCharacter]:project.characters;
    for(const character of candidates){
      if(!character.visible||character.locked)continue;
      const pose=poseAt(project.tracks[character.id],time),transform=transformAt(project.tracks[character.id],time);
      for(const joint of joints){
        const world=applyTransform(pose[joint],pose.root,transform),distance=Math.hypot(world.x-q.x,world.y-q.y)*screenScale;
        if(distance<=hitRadius&&(!best||distance<best.distance-.75||Math.abs(distance-best.distance)<=.75))best={char:character.id,joint,pose,transform,distance};
      }
    }
    return best;
  };
  const characterBodyAt=(q:{x:number;y:number})=>{
    const view=editorView(),rect=ref.current!.getBoundingClientRect(),screenScale=view.zoom*rect.width/view.width,pointSegmentDistance=(point:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number})=>{const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;return Math.hypot(point.x-(a.x+dx*t),point.y-(a.y+dy*t))};
    let best:{char:string;pose:Pose;transform:CharacterTransform;distance:number}|null=null;
    for(const character of [...project.characters].reverse()){
      if(!character.visible||character.locked)continue;
      const pose=poseAt(project.tracks[character.id],time),transform=transformAt(project.tracks[character.id],time),head=applyTransform(pose.head,pose.root,transform);
      let distance=Math.max(0,Math.hypot(q.x-head.x,q.y-head.y)-44*Math.max(Math.abs(transform.scaleX),Math.abs(transform.scaleY)))*screenScale;
      for(const [start,end] of bones){const a=applyTransform(pose[start],pose.root,transform),b=applyTransform(pose[end],pose.root,transform);distance=Math.min(distance,pointSegmentDistance(q,a,b)*screenScale)}
      if(distance<=24&&(!best||distance<best.distance))best={char:character.id,pose,transform,distance};
    }
    return best;
  };
  const down = (e: React.PointerEvent) => {
    gestureView.current=editorView();
    const q = point(e);
    if(pathEditing&&activePath&&onPathChange&&!previewCamera){
      const view=editorView(),rect=ref.current!.getBoundingClientRect(),scale=view.zoom*rect.width/view.width,hit=16/scale;
      for(let i=activePath.points.length-1;i>=0;i--){const anchor=activePath.points[i];for(const action of ["out","in","anchor"] as const){const target=action==="anchor"?anchor:anchor[action];if(target&&Math.hypot(q.x-target.x,q.y-target.y)<=hit){drag.current={char:"",mode,pose:basePose(q.x,q.y),transform:{rotation:0,scaleX:1,scaleY:1,flipH:false,flipV:false},start:q,pathAction:action,pathPoint:i,pathStart:structuredClone(activePath)};onGestureStart();ref.current!.setPointerCapture(e.pointerId);return}}}
      const table=pathLookup(activePath),near=table.some(item=>Math.hypot(q.x-item.point.x,q.y-item.point.y)<=12/scale);if(near){drag.current={char:"",mode,pose:basePose(q.x,q.y),transform:{rotation:0,scaleX:1,scaleY:1,flipH:false,flipV:false},start:q,pathAction:"move",pathStart:structuredClone(activePath)};onGestureStart();ref.current!.setPointerCapture(e.pointerId);return}
      if(activePath.pathType==="free-draw"){drag.current={char:"",mode,pose:basePose(q.x,q.y),transform:{rotation:0,scaleX:1,scaleY:1,flipH:false,flipV:false},start:q,pathAction:"draw",pathStart:structuredClone(activePath),freeDraw:[q]};onGestureStart();ref.current!.setPointerCapture(e.pointerId);return}
    }
    const selectedFx=selectedEffect?project.effects.find(effect=>effect.id===selectedEffect):undefined;
    if(selectedFx&&Math.hypot(q.x-selectedFx.x,q.y-selectedFx.y)<=24/editorView().zoom){
      e.preventDefault();e.stopPropagation();
      drag.current={char:"",effectId:selectedFx.id,effectPosition:{x:selectedFx.x,y:selectedFx.y},mode:"move",pose:basePose(q.x,q.y),transform:{rotation:0,scaleX:1,scaleY:1,flipH:false,flipV:false},start:q};
      onGestureStart();ref.current!.setPointerCapture(e.pointerId);return;
    }
    const jointHit=nearestJoint(e);
    if(jointHit){
      e.preventDefault();e.stopPropagation();
      onSelectEffect(null);onSelectProp(null);onSelect(jointHit.char,e.shiftKey);setHoverJoint({char:jointHit.char,joint:jointHit.joint});
      drag.current={char:jointHit.char,mode:"pose",pose:jointHit.pose,transform:jointHit.transform,start:q,joint:jointHit.joint,startClient:{x:e.clientX,y:e.clientY},moved:false};
      onGestureStart();ref.current!.setPointerCapture(e.pointerId);return;
    }
    // A large visual effect may cover most of the canvas. The painted actor
    // silhouette is a more specific target, so it wins before FX hit areas.
    const bodyHit=mode!=="camera"?characterBodyAt(q):null;
    if(bodyHit){
      onSelectEffect(null);onSelectProp(null);onSelect(bodyHit.char,e.shiftKey);
      if(mode==="pose")return;
      drag.current={char:bodyHit.char,mode,pose:bodyHit.pose,transform:bodyHit.transform,start:q,startAngle:Math.atan2(q.y-bodyHit.pose.root.y,q.x-bodyHit.pose.root.x),startDistance:Math.hypot(q.x-bodyHit.pose.root.x,q.y-bodyHit.pose.root.y)};
      onGestureStart();ref.current!.setPointerCapture(e.pointerId);return;
    }
    if (mode === "camera" && !previewCamera) {
      const format = project.format ?? { width: 1080, height: 1920 },
        camera = cameraAt(project.camera, time),
        halfW = format.width / camera.zoom / 2,
        halfH = format.height / camera.zoom / 2,
        rotatePoint = (x: number, y: number) => { const a = camera.rotation * Math.PI / 180; return { x: camera.x + x * Math.cos(a) - y * Math.sin(a), y: camera.y + x * Math.sin(a) + y * Math.cos(a) }; },
        corners = [[-halfW,-halfH],[halfW,-halfH],[-halfW,halfH],[halfW,halfH]].map(([x,y]) => rotatePoint(x,y)),
        rotationHandle = rotatePoint(0, -halfH - 54 / editorView().zoom),
        rotateHandle = Math.hypot(rotationHandle.x - q.x, rotationHandle.y - q.y) < 45 / editorView().zoom,
        zoomHandle = corners.some((c) => Math.hypot(c.x - q.x, c.y - q.y) < 70 / editorView().zoom),
        localAngle = -camera.rotation * Math.PI / 180,
        localX = (q.x-camera.x)*Math.cos(localAngle)-(q.y-camera.y)*Math.sin(localAngle),
        localY = (q.x-camera.x)*Math.sin(localAngle)+(q.y-camera.y)*Math.cos(localAngle),
        inside = Math.abs(localX) <= halfW && Math.abs(localY) <= halfH;
      if (rotateHandle || zoomHandle || inside) {
        drag.current = {
          char: "",
          mode,
          pose: basePose(q.x, q.y),
          transform: { rotation: 0, scaleX: 1, scaleY: 1, flipH: false, flipV: false },
          start: q,
          camera,
          cameraAction: rotateHandle ? "rotate" : zoomHandle ? "zoom" : "pan",
          startAngle: Math.atan2(q.y - camera.y, q.x - camera.x),
          startDistance: Math.hypot(q.x - camera.x, q.y - camera.y),
        };
        onGestureStart();
        ref.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    for (const effect of [...project.effects].reverse()) {
      const active = time >= effect.time - .08 && time <= effect.time + effect.duration + .08;
      const radius = Math.max(46, 80 * Math.max(.25, effect.strength || 1));
      if (active && Math.hypot(q.x - effect.x, q.y - effect.y) <= radius) {
        onSelectEffect(effect.id);
        onSelectProp(null);
        drag.current = {
          char: "",
          effectId: effect.id,
          effectPosition: { x: effect.x, y: effect.y },
          mode,
          pose: basePose(q.x, q.y),
          transform: { rotation: 0, scaleX: 1, scaleY: 1, flipH: false, flipV: false },
          start: q,
        };
        onGestureStart();
        ref.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    for (const prop of [...(project.props ?? [])].reverse()) {
      if (!prop.visible || prop.locked) continue;
      const tf = propTransformAt(project.propTracks?.[prop.id], time);
      const size=propHitSize(prop.type),angle=-tf.rotation*Math.PI/180,dx=q.x-tf.x,dy=q.y-tf.y,localX=dx*Math.cos(angle)-dy*Math.sin(angle),localY=dx*Math.sin(angle)+dy*Math.cos(angle);
      if (
        Math.abs(localX) < size.x * Math.abs(tf.scaleX) &&
        Math.abs(localY) < size.y * Math.abs(tf.scaleY)
      ) {
        onSelectEffect(null);
        onSelectProp(prop.id);
        drag.current = {
          char: "",
          propId: prop.id,
          propTransform: tf,
          mode,
          pose: basePose(q.x, q.y),
          transform: {
            rotation: tf.rotation,
            scaleX: tf.scaleX,
            scaleY: tf.scaleY,
            flipH: tf.flipH,
            flipV: false,
          },
          start: q,
          startAngle: Math.atan2(q.y - tf.y, q.x - tf.x),
          startDistance: Math.hypot(q.x - tf.x, q.y - tf.y),
        };
        onGestureStart();
        ref.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    let hit:
      { char: string; pose: Pose; transform: CharacterTransform } | undefined;
    for (const ch of project.characters) {
      const pose = poseAt(project.tracks[ch.id], time),
        transform = transformAt(project.tracks[ch.id], time),
        b = bounds(pose, transform, 38);
      if (q.x >= b.left && q.x <= b.right && q.y >= b.top && q.y <= b.bottom)
        hit = { char: ch.id, pose, transform };
    }
    if (hit) {
      onSelectEffect(null);
      onSelectProp(null);
      onSelect(hit.char, e.shiftKey);
      const local = invertTransform(q, hit.pose.root, hit.transform);
      let joint: JointName | undefined;
      if (mode === "pose") {
        let nearest=38;
        for (const j of joints) {
          const distance=Math.hypot(hit.pose[j].x-local.x,hit.pose[j].y-local.y);
          if(distance<nearest){nearest=distance;joint=j}
        }
      }
      drag.current = {
        char: hit.char,
        mode,
        pose: hit.pose,
        transform: hit.transform,
        start: q,
        joint,
        startAngle: Math.atan2(q.y - hit.pose.root.y, q.x - hit.pose.root.x),
        startDistance: Math.hypot(q.x - hit.pose.root.x, q.y - hit.pose.root.y),
      };
      onGestureStart();
      ref.current!.setPointerCapture(e.pointerId);
    }
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) {const hit=nearestJoint(e);setHoverJoint(hit?{char:hit.char,joint:hit.joint}:null);return;}
    const q = point(e),
      d = drag.current;
    if(d.pathAction&&d.pathStart&&onPathChange){const next=structuredClone(d.pathStart),dx=q.x-d.start.x,dy=q.y-d.start.y;if(d.pathAction==="draw"){d.freeDraw!.push(q);const points=simplifyFreeDraw(d.freeDraw!,7);next.points=smoothPoints(points)}else if(d.pathAction==="move")next.points.forEach(p=>{p.x+=dx;p.y+=dy;if(p.in){p.in.x+=dx;p.in.y+=dy}if(p.out){p.out.x+=dx;p.out.y+=dy}});else{const anchor=next.points[d.pathPoint!],target=d.pathAction==="anchor"?anchor:anchor[d.pathAction]!;const old={x:target.x,y:target.y};target.x+=dx;target.y+=dy;if(d.pathAction==="anchor"){const ax=target.x-old.x,ay=target.y-old.y;if(anchor.in){anchor.in.x+=ax;anchor.in.y+=ay}if(anchor.out){anchor.out.x+=ax;anchor.out.y+=ay}}}next.updatedAt=new Date().toISOString();onPathChange(next);return}
    if(d.joint&&d.startClient&&!d.moved){if(Math.hypot(e.clientX-d.startClient.x,e.clientY-d.startClient.y)<3)return;d.moved=true;}
    if (d.mode === "camera" && d.camera) {
      if (d.cameraAction === "pan") {
        const format=project.format??{width:1080,height:1920};
        onCameraChange({
          ...d.camera,
          x:Math.max(0,Math.min(format.width,d.camera.x+q.x-d.start.x)),
          y:Math.max(0,Math.min(format.height,d.camera.y+q.y-d.start.y)),
        });
      }
      else if (d.cameraAction === "zoom") {
        const distance = Math.max(20, Math.hypot(q.x - d.camera.x, q.y - d.camera.y)),
          startDistance=Math.max(80,d.startDistance!),
          change=(startDistance-distance)/startDistance,
          zoom=d.camera.zoom*Math.exp(change*.9);
        onCameraChange({ ...d.camera, zoom: Math.max(.2, Math.min(4, zoom)) });
      } else {
        let rotation = d.camera.rotation + (Math.atan2(q.y - d.camera.y, q.x - d.camera.x) - d.startAngle!) * 180 / Math.PI;
        if (e.shiftKey) rotation = Math.round(rotation / 5) * 5;
        onCameraChange({ ...d.camera, rotation });
      }
      return;
    }
    if (d.effectId && d.effectPosition) {
      if (d.mode === "move") onEffectChange(d.effectId, {
        x: d.effectPosition.x + q.x - d.start.x,
        y: d.effectPosition.y + q.y - d.start.y,
      });
      return;
    }
    if (d.propId) {
      const tf = d.propTransform!;
      if (d.mode === "move")
        onPropTransformChange(d.propId, {
          ...tf,
          x: tf.x + q.x - d.start.x,
          y: tf.y + q.y - d.start.y,
        });
      else if (d.mode === "rotate") {
        let rotation =
          tf.rotation +
          ((Math.atan2(q.y - tf.y, q.x - tf.x) - d.startAngle!) * 180) /
            Math.PI;
        if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
        onPropTransformChange(d.propId, { ...tf, rotation });
      } else if (d.mode === "scale") {
        const ratio = Math.max(
          0.1,
          Math.hypot(q.x - tf.x, q.y - tf.y) / Math.max(1, d.startDistance!),
        );
        onPropTransformChange(d.propId, {
          ...tf,
          scaleX: tf.scaleX * ratio,
          scaleY: tf.scaleY * ratio,
        });
      }
      return;
    }
    if (d.mode === "move") {
      const p = structuredClone(d.pose),
        dx = q.x - d.start.x,
        rawDy = q.y - d.start.y,
        // Ground Lock is an explicit axis constraint: Y must never drift for
        // the duration of the gesture, regardless of the drag angle.
        dy = groundLock ? 0 : rawDy;
      for (const j of joints) {
        p[j].x += dx;
        p[j].y += dy;
      }
      onPoseChange(d.char, p);
    } else if (d.mode === "rotate") {
      let delta =
        ((Math.atan2(q.y - d.pose.root.y, q.x - d.pose.root.x) -
          d.startAngle!) *
          180) /
        Math.PI;
      let rotation = d.transform.rotation + delta;
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
      onTransformChange(d.char, { ...d.transform, rotation });
    } else if (d.mode === "scale") {
      const ratio = Math.max(
        0.1,
        Math.hypot(q.x - d.pose.root.x, q.y - d.pose.root.y) /
          Math.max(1, d.startDistance!),
      );
      onTransformChange(d.char, {
        ...d.transform,
        scaleX: d.transform.scaleX * ratio,
        scaleY: d.transform.scaleY * ratio,
      });
    } else if (d.joint) {
      const local = invertTransform(q, d.pose.root, d.transform),
        p = editRigJoint(d.pose,d.joint,local);
      onPoseChange(d.char, p);
    }
  };
  const up = (e:React.PointerEvent) => {
    if (drag.current) {
      drag.current = null;
      onGestureEnd();
    }
    if(ref.current?.hasPointerCapture(e.pointerId))ref.current.releasePointerCapture(e.pointerId);
    gestureView.current=null;
    const hit=nearestJoint(e);setHoverJoint(hit?{char:hit.char,joint:hit.joint}:null);
  };
  const previewAspect=(project.format?.width??1080)/(project.format?.height??1920),
    bitmapWidth=previewCamera?(previewAspect>=1?720:Math.round(480*previewAspect)):720,
    bitmapHeight=previewCamera?(previewAspect>=1?Math.round(720/previewAspect):480):480;
  return (
    <canvas
      ref={ref}
      width={bitmapWidth}
      height={bitmapHeight}
      style={{
        aspectRatio: previewCamera
          ? `${project.format?.width ?? 1080} / ${project.format?.height ?? 1920}`
          : "3 / 2",
        width: "auto",
        height: "auto",
        maxWidth: "calc(100% - 24px)",
        maxHeight: "calc(100% - 24px)",
        cursor: drag.current?.joint ? "grabbing" : mode === "pose"&&hoverJoint ? "grab" : mode === "camera" && !previewCamera ? "move" : "default",
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={()=>{if(!drag.current)setHoverJoint(null)}}
      onContextMenu={(e) => {
        e.preventDefault();
        if(pathEditing&&activePath&&onPathChange&&activePath.points.length>2){const q=point(e),view=editorView(),rect=ref.current!.getBoundingClientRect(),hit=16/(view.zoom*rect.width/view.width),index=activePath.points.findIndex(p=>Math.hypot(p.x-q.x,p.y-q.y)<=hit);if(index>=0){const next=structuredClone(activePath);next.points.splice(index,1);onPathChange(next);return}}
        onContextMenu(e.clientX, e.clientY);
      }}
      onDoubleClick={(e) => {const hit=nearestJoint(e);if(mode==="pose"&&hit&&(hit.joint==="leftToe"||hit.joint==="rightToe")){e.preventDefault();e.stopPropagation();const ankle=hit.joint==="leftToe"?"leftAnkle":"rightAnkle",next=structuredClone(hit.pose);next[hit.joint]={x:next[ankle].x-(next[hit.joint].x-next[ankle].x),y:next[ankle].y-(next[hit.joint].y-next[ankle].y)};onSelectEffect(null);onSelectProp(null);onSelect(hit.char,false);onGestureStart();onPoseChange(hit.char,next);onGestureEnd();setHoverJoint({char:hit.char,joint:hit.joint});return}if(!pathEditing||!activePath||!onPathChange||activePath.pathType==="straight")return;const q=point(e),table=pathLookup(activePath),nearest=table.reduce((best,item)=>Math.hypot(item.point.x-q.x,item.point.y-q.y)<Math.hypot(best.point.x-q.x,best.point.y-q.y)?item:best,table[0]);if(!nearest)return;const next=structuredClone(activePath),inserted={id:crypto.randomUUID(),x:nearest.point.x,y:nearest.point.y};next.points.splice(nearest.segment+1,0,inserted);if(next.pathType==="bezier"||next.pathType==="free-draw")next.points=smoothPoints(next.points);onPathChange(next)}}
    />
  );
}
