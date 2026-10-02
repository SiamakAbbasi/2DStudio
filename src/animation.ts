import type {
  CameraKeyframe,
  CameraState,
  CharacterTransform,
  Ease,
  JointName,
  Pose,
  PoseKeyframe,
  PropKeyframe,
  PropTransform,
  SpeedKeyframe,
  V,
} from "./types";
export const joints: JointName[] = [
  "root",
  "torso",
  "neck",
  "head",
  "leftShoulder",
  "leftElbow",
  "leftWrist",
  "rightShoulder",
  "rightElbow",
  "rightWrist",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "leftToe",
  "rightHip",
  "rightKnee",
  "rightAnkle",
  "rightToe",
];
export const bones: [JointName, JointName][] = [
  ["root", "torso"],
  ["root", "leftHip"],
  ["root", "rightHip"],
  ["torso", "neck"],
  ["neck", "head"],
  ["neck", "leftShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["neck", "rightShoulder"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["leftAnkle", "leftToe"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
  ["rightAnkle", "rightToe"],
];
export const clonePose = (p: Pose): Pose => JSON.parse(JSON.stringify(p));
export function basePose(x = 360, y = 720, flip = false): Pose {
  const s = flip ? -1 : 1;
  const p = (dx: number, dy: number): V => ({ x: x + dx * s, y: y + dy });
  return {
    root: p(0, 0),
    torso: p(0, -95),
    neck: p(0, -155),
    head: p(0, -195),
    leftShoulder: p(-28, -150),
    leftElbow: p(-55, -85),
    leftWrist: p(-60, -22),
    rightShoulder: p(28, -150),
    rightElbow: p(55, -85),
    rightWrist: p(60, -22),
    leftHip: p(-18, -5),
    leftKnee: p(-34, 90),
    leftAnkle: p(-55, 190),
    leftToe: p(-73, 192),
    rightHip: p(18, -5),
    rightKnee: p(38, 90),
    rightAnkle: p(62, 190),
    rightToe: p(80, 192),
  };
}
export function propTransformAt(
  track: PropKeyframe[] = [],
  time: number,
): PropTransform {
  const fallback: PropTransform = {
    x: 540,
    y: 720,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipH: false,
    opacity: 1,
    attachment: null,
  };
  if (!track.length) return fallback;
  const a = [...track].sort((x, y) => x.time - y.time);
  const current =
    time <= a[0].time
      ? a[0]
      : time >= a.at(-1)!.time
        ? a.at(-1)!
        : a.find((_, i) => a[i + 1] && time <= a[i + 1].time)!;
  if (current === a.at(-1) || time <= a[0].time) return { ...current };
  const next = a[a.indexOf(current) + 1],
    t = shaped(
      (time - current.time) / (next.time - current.time),
      current.easing,
    );
  return {
    x: current.x + (next.x - current.x) * t,
    y: current.y + (next.y - current.y) * t,
    rotation: current.rotation + (next.rotation - current.rotation) * t,
    scaleX: current.scaleX + (next.scaleX - current.scaleX) * t,
    scaleY: current.scaleY + (next.scaleY - current.scaleY) * t,
    opacity: current.opacity + (next.opacity - current.opacity) * t,
    flipH: t < 0.5 ? current.flipH : next.flipH,
    attachment: t < 0.5 ? current.attachment : next.attachment,
  };
}
function shaped(t: number, e: Ease) {
  if (e === "hold") return 0;
  if (e === "ease-in") return t * t;
  if (e === "ease-out") return 1 - (1 - t) * (1 - t);
  if (e === "ease-in-out")
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  if (e === "snap")
    return t < 0.55
      ? 0.12 * (t / 0.55)
      : 0.12 + 0.88 * (1 - Math.pow(1 - (t - 0.55) / 0.45, 4));
  return t;
}
const connectedPose = (source: Pose) => {
    const pose=clonePose(source),facingSignal=(pose.head.x-pose.root.x)+(pose.torso.x-pose.root.x)*.8+(((pose.leftWrist.x+pose.rightWrist.x)/2)-pose.root.x)*.35,directional=Math.abs(facingSignal)>8,facing=facingSignal<0?-1:1,
      foot=(side:"left"|"right",force=false)=>{const ankle=pose[`${side}Ankle`],knee=pose[`${side}Knee`],toe=pose[`${side}Toe`],toeLength=toe?Math.hypot(toe.x-ankle.x,toe.y-ankle.y):Infinity;if(force||!toe||toeLength>20){const dx=ankle.x-knee.x,dy=ankle.y-knee.y,length=Math.max(1,Math.hypot(dx,dy)),sign=directional?facing:(side==="left"?-1:1);pose[`${side}Toe`]={x:ankle.x+sign*Math.abs(dy)/length*20,y:ankle.y-sign*dx/length*20}}};
    const legacyOpposed=pose.leftToe&&pose.rightToe&&(pose.leftToe.x-pose.leftAnkle.x)*(pose.rightToe.x-pose.rightAnkle.x)<0;
    foot("left",!!legacyOpposed&&directional);foot("right",!!legacyOpposed&&directional);
    const spineX=pose.neck.x-pose.torso.x,spineY=pose.neck.y-pose.torso.y,
      spineLength=Math.hypot(spineX,spineY),spineMax=76;
    if(spineLength>spineMax){
      const oldX=pose.neck.x,oldY=pose.neck.y;
      pose.neck.x=pose.torso.x+spineX*spineMax/spineLength;
      pose.neck.y=pose.torso.y+spineY*spineMax/spineLength;
      pose.head.x+=pose.neck.x-oldX;pose.head.y+=pose.neck.y-oldY;
    }
    const headX=pose.head.x-pose.neck.x,headY=pose.head.y-pose.neck.y,
      headLength=Math.hypot(headX,headY),headMax=48;
    if(headLength>headMax){pose.head.x=pose.neck.x+headX*headMax/headLength;pose.head.y=pose.neck.y+headY*headMax/headLength;}
    return pose;
};
export function poseAt(track: PoseKeyframe[] = [], time: number): Pose {
  if (!track.length) return connectedPose(basePose());
  const a = [...track].sort((x, y) => x.time - y.time);
  if (time <= a[0].time) return connectedPose(a[0].pose);
  if (time >= a.at(-1)!.time) return connectedPose(a.at(-1)!.pose);
  let i = 0;
  while (a[i + 1].time < time) i++;
  const p = a[i],
    n = a[i + 1],pp=connectedPose(p.pose),np=connectedPose(n.pose),
    t = shaped((time - p.time) / (n.time - p.time), p.easing);
  const out = {} as Pose;
  joints.forEach(
    (j) =>
      (out[j] = {
        x: pp[j].x + (np[j].x - pp[j].x) * t,
        y: pp[j].y + (np[j].y - pp[j].y) * t,
      }),
  );
  return connectedPose(out);
}
export function transformAt(
  track: PoseKeyframe[] = [],
  time: number,
): CharacterTransform {
  const defaults = {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipH: false,
    flipV: false,
  };
  if (!track.length) return defaults;
  const a = [...track].sort((x, y) => x.time - y.time),
    value = (index: number) => {
      const result = { ...defaults };
      for (let i = 0; i <= index; i++) {
        const k = a[i];
        if (k.rotation !== undefined) result.rotation = k.rotation;
        if (k.scaleX !== undefined) result.scaleX = k.scaleX;
        if (k.scaleY !== undefined) result.scaleY = k.scaleY;
        if (k.flipH !== undefined) result.flipH = k.flipH;
        if (k.flipV !== undefined) result.flipV = k.flipV;
      }
      return result;
    };
  if (time <= a[0].time) return value(0);
  if (time >= a[a.length - 1].time) return value(a.length - 1);
  let i = 0;
  while (a[i + 1].time < time) i++;
  const x = value(i),
    y = value(i + 1),
    t = shaped((time - a[i].time) / (a[i + 1].time - a[i].time), a[i].easing);
  return {
    rotation: x.rotation + (y.rotation - x.rotation) * t,
    scaleX: x.scaleX + (y.scaleX - x.scaleX) * t,
    scaleY: x.scaleY + (y.scaleY - x.scaleY) * t,
    flipH: t < 0.5 ? x.flipH : y.flipH,
    flipV: t < 0.5 ? x.flipV : y.flipV,
  };
}
export function cameraAt(track: CameraKeyframe[], time: number): CameraState {
  if (!track.length) return { x: 540, y: 960, zoom: 1, rotation: 0 };
  const a = [...track].sort((x, y) => x.time - y.time);
  const p =
    time <= a[0].time
      ? a[0]
      : time >= a.at(-1)!.time
        ? a.at(-1)!
        : a.find((_, i) => a[i + 1] && time <= a[i + 1].time)!;
  if (p === a.at(-1) || time <= a[0].time) return p;
  const n = a[a.indexOf(p) + 1],
    t = shaped((time - p.time) / (n.time - p.time), p.easing);
  return {
    x: p.x + (n.x - p.x) * t,
    y: p.y + (n.y - p.y) * t,
    zoom: p.zoom + (n.zoom - p.zoom) * t,
    rotation: p.rotation + (n.rotation - p.rotation) * t,
  };
}
export function sourceTimeAt(speed: SpeedKeyframe[], real: number) {
  const a = [...speed].sort((x, y) => x.time - y.time);
  if (!a.length) return real;
  let src = 0,
    last = 0,
    lastS = a[0].speed / 100;
  for (let i = 1; i < a.length && a[i].time < real; i++) {
    const dt = a[i].time - last;
    src += (dt * (lastS + a[i].speed / 100)) / 2;
    last = a[i].time;
    lastS = a[i].speed / 100;
  }
  const next = a.find((k) => k.time >= real);
  const s = next
    ? lastS +
      (next.speed / 100 - lastS) * shaped((real - last) / (next.time - last || 1), next.easing ?? "linear")
    : lastS;
  src += ((real - last) * (lastS + s)) / 2;
  return src;
}
export function outputDuration(speed: SpeedKeyframe[], sourceDuration: number) {
  if (!speed.length) return sourceDuration;
  let lo=0,hi=Math.max(sourceDuration,1);
  while(sourceTimeAt(speed,hi)<sourceDuration&&hi<sourceDuration*20+30)hi*=2;
  for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(sourceTimeAt(speed,mid)<sourceDuration)lo=mid;else hi=mid;}
  return hi;
}
/** Deterministic inverse of sourceTimeAt. Returns output/real time for a source time. */
export function outputTimeAtSource(speed: SpeedKeyframe[], sourceTime: number) {
  if (sourceTime <= 0) return 0;
  if (!speed.length) return sourceTime;
  let lo = 0,
    hi = Math.max(sourceTime, 1);
  while (sourceTimeAt(speed, hi) < sourceTime && hi < sourceTime * 100 + 300)
    hi *= 2;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (sourceTimeAt(speed, mid) < sourceTime) lo = mid;
    else hi = mid;
  }
  return hi;
}
export const uid = () => Math.random().toString(36).slice(2, 9);
