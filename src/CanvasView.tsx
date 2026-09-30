import { useEffect, useRef } from "react";
import {
  basePose,
  bones,
  cameraAt,
  joints,
  poseAt,
  propTransformAt,
  transformAt,
} from "./animation";
import type { CameraState, CharacterTransform, JointName, Pose, Project } from "./types";

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
      );
    const actual = poseAt(p.tracks[c.id], time);
    drawStick(
      ctx,
      actual,
      c.color,
      preview?.id === c.id ? 0.35 : 1,
      false,
      transformAt(p.tracks[c.id], time),
    );
    if (preview?.id === c.id)
      drawStick(
        ctx,
        preview.pose,
        "#8fd3ff",
        0.8,
        false,
        transformAt(p.tracks[c.id], time),
      );
  }
  for (const prop of [...(p.props ?? [])]
    .filter((x) => x.visible)
    .sort((a, b) => a.layer - b.layer)) {
    const tf = resolvedPropTransform(p,prop.id,time);
    drawProp(ctx, prop.type, prop.color, tf, prop.image);
  }
  for (const e of p.effects) {
    const age = time - e.time;
    if (age < 0 || age > e.duration) continue;
    const q = age / e.duration,
      fade = 1 - q;
    if (e.type === "flash") {
      ctx.fillStyle = `rgba(255,255,255,${fade * 0.9})`;
      ctx.fillRect(-1000, -1000, 3000, 4000);
    }
    if (e.type === "shockwave") {
      ctx.strokeStyle = `rgba(255,240,180,${fade})`;
      ctx.lineWidth = 12 * fade;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 30 + 180 * q, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.type === "lines") {
      ctx.strokeStyle = `rgba(255,255,255,${fade})`;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(i) * 40, e.y + Math.sin(i) * 40);
        ctx.lineTo(e.x + Math.cos(i) * 250, e.y + Math.sin(i) * 250);
        ctx.stroke();
      }
    }
    if (e.type === "dust") {
      ctx.fillStyle = `rgba(200,190,170,${fade * 0.5})`;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(e.x + i * 18 - 36, e.y - q * 50, 20 + q * 20, 0, 7);
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
    if(e.type==="afterimage"&&e.targetFighter){const ch=p.characters.find(c=>c.id===e.targetFighter);if(ch)for(let i=4;i>=1;i--){const po=poseAt(p.tracks[e.targetFighter],Math.max(0,time-i*.06));drawStick(ctx,po,ch.color,fade*.12*(5-i),false)}}
    if(["sparks","hitParticles","clash"].includes(e.type)){ctx.save();const red=e.type==="hitParticles";ctx.strokeStyle=red?(e.color??`rgba(235,45,65,${fade})`):`rgba(255,225,110,${fade})`;ctx.globalAlpha=fade;ctx.lineWidth=4+e.strength*3;const count=Math.min(18,6+Math.round(e.strength*10));for(let i=0;i<count;i++){const spread=((i/count)-.5)*1.2,len=(35+i%4*13)*e.strength,base=Math.atan2(e.directionY??0,e.directionX??1),angle=base+spread,dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+dx*q,e.y+dy*q);ctx.stroke()}if(e.type==="clash"){ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(e.x,e.y,35*fade,0,7);ctx.fill()}ctx.restore()}
  }
  ctx.restore();
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
  if (type === "image" && image) {
    const bitmap = new Image();
    bitmap.src = image;
    if (bitmap.complete) ctx.drawImage(bitmap, -60, -60, 120, 120);
    else {
      ctx.fillRect(-45, -45, 90, 90);
    }
  } else if (type === "chair") {
    ctx.fillRect(-55, -30, 110, 25);
    ctx.fillRect(-50, -120, 20, 100);
    ctx.fillRect(-50, -5, 14, 85);
    ctx.fillRect(36, -5, 14, 85);
  } else if (type === "table") {
    ctx.fillRect(-100, -25, 200, 25);
    ctx.fillRect(-80, 0, 18, 100);
    ctx.fillRect(62, 0, 18, 100);
  } else if (type === "cup") {
    ctx.fillRect(-22, -35, 44, 55);
    ctx.beginPath();
    ctx.arc(25, -10, 18, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  } else if (["sword", "staff"].includes(type)) {
    ctx.fillRect(-8, -100, 16, 190);
    if (type === "sword") ctx.fillRect(-35, 65, 70, 12);
  } else if (type === "shield") {
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, 7);
    ctx.fill();
    ctx.stroke();
  } else if (type === "ball" || type === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, 7);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-45, -45, 90, 90);
    ctx.strokeRect(-45, -45, 90, 90);
  }
  ctx.restore();
}
function drawStick(
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
  ctx.lineWidth = 16;
  bones.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(p[a].x, p[a].y);
    ctx.lineTo(p[b].x, p[b].y);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 38, 0, Math.PI * 2);
  ctx.stroke();
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
};
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
  mode,
  groundLock,
  onSelect,
  onSelectProp,
  onPoseChange,
  onTransformChange,
  onPropTransformChange,
  onGestureStart,
  onGestureEnd,
  onCameraChange,
  onContextMenu,
  preview,
  previewCamera = false,
  safeArea = false,
  reviewJoints = [],
}: {
  project: Project;
  time: number;
  selected: string;
  selectedProp: string | null;
  mode: TransformMode;
  groundLock: boolean;
  onSelect: (v: string, additive?: boolean) => void;
  onSelectProp: (v: string | null) => void;
  onPoseChange: (id: string, p: Pose) => void;
  onTransformChange: (id: string, t: CharacterTransform) => void;
  onPropTransformChange: (
    id: string,
    t: import("./types").PropTransform,
  ) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onCameraChange: (camera: CameraState) => void;
  onContextMenu: (x: number, y: number) => void;
  preview?: { id: string; pose: Pose } | null;
  previewCamera?: boolean;
  safeArea?: boolean;
  reviewJoints?: JointName[];
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    drag = useRef<Drag | null>(null);
  const editorView = () => {
    const format = project.format ?? { width: 1080, height: 1920 },
      width = 1200,
      height = 800,
      zoom = Math.min(
        (width / format.width) * 0.82,
        (height / format.height) * 0.82,
      );
    // The world editor must remain stationary while the output camera moves.
    // Following output pan/zoom here creates a feedback loop under the pointer.
    return { x: format.width / 2, y: format.height / 2, zoom, rotation: 0, width, height };
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
    if (selectedProp) {
      const tf = propTransformAt(project.propTracks?.[selectedProp], time);
      ctx.translate(tf.x, tf.y);
      ctx.rotate((tf.rotation * Math.PI) / 180);
      ctx.scale(tf.scaleX, tf.scaleY);
      ctx.strokeStyle = "#67d4ff";
      ctx.lineWidth = 2 / cam.zoom;
      ctx.setLineDash([8, 7]);
      ctx.strokeRect(-65, -65, 130, 130);
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
      b = bounds(pose, tf);
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
    ctx.strokeStyle = "rgba(100,200,255,.8)";
    ctx.lineWidth = 2 / cam.zoom;
    ctx.setLineDash([8, 7]);
    ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.setLineDash([]);
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
  }, [project, time, selected, selectedProp, preview, mode, previewCamera, safeArea, reviewJoints]);
  const point = (e: React.PointerEvent) => {
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
  const down = (e: React.PointerEvent) => {
    const q = point(e);
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
    for (const prop of [...(project.props ?? [])].reverse()) {
      if (!prop.visible || prop.locked) continue;
      const tf = propTransformAt(project.propTracks?.[prop.id], time);
      if (
        Math.abs(q.x - tf.x) < 75 * Math.abs(tf.scaleX) &&
        Math.abs(q.y - tf.y) < 75 * Math.abs(tf.scaleY)
      ) {
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
      onSelectProp(null);
      onSelect(hit.char, e.shiftKey);
      const local = invertTransform(q, hit.pose.root, hit.transform);
      let joint: JointName | undefined;
      if (mode === "pose")
        for (const j of joints)
          if (Math.hypot(hit.pose[j].x - local.x, hit.pose[j].y - local.y) < 38)
            joint = j;
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
    if (!drag.current) return;
    const q = point(e),
      d = drag.current;
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
      const p = structuredClone(d.pose),
        local = invertTransform(q, p.root, d.transform);
      p[d.joint] = local;
      onPoseChange(d.char, p);
    }
  };
  const up = () => {
    if (drag.current) {
      drag.current = null;
      onGestureEnd();
    }
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
        cursor: mode === "camera" && !previewCamera ? "move" : "default",
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY);
      }}
      onDoubleClick={() => {}}
    />
  );
}
