import { clonePose, joints, uid } from "./animation";
import type { JointName, Pose, PoseKeyframe } from "./types";
import {loadMediaPipePoseProvider} from "./mediaPipePoseProvider";

export type MotionLandmark = { x: number; y: number; z: number; confidence: number };
export type MotionFrame = { time: number; joints: Partial<Record<JointName, MotionLandmark>>; confidence: number; discontinuity?: boolean };

const map: Partial<Record<JointName, number>> = {
  head: 0, leftShoulder: 11, rightShoulder: 12, leftElbow: 13,
  rightElbow: 14, leftWrist: 15, rightWrist: 16, leftHip: 23,
  rightHip: 24, leftKnee: 25, rightKnee: 26, leftAnkle: 27, rightAnkle: 28,
};

export function loadMotionEngine() {
  return loadMediaPipePoseProvider();
}

const seekVideo = (video: HTMLVideoElement, time: number) => new Promise<void>((resolve, reject) => {
  const done = () => { video.removeEventListener("seeked", done); resolve(); };
  const fail = () => reject(new Error("Unable to decode the selected video frame."));
  video.addEventListener("seeked", done, { once: true });
  video.addEventListener("error", fail, { once: true });
  video.currentTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
});

export async function analyzeVideo(
  video: HTMLVideoElement,
  start: number,
  end: number,
  sampleFps: number,
  onProgress: (value: number, frame: MotionFrame | null) => void,
  signal: AbortSignal,
) {
  const detector = await loadMotionEngine(), frames: MotionFrame[] = [], timestampBase = Math.ceil(performance.now()) + 1000;
  const total = Math.max(1, Math.floor((end - start) * sampleFps) + 1);
  for (let i = 0; i < total; i++) {
    if (signal.aborted) throw new DOMException("Analysis cancelled", "AbortError");
    const sourceTime = Math.min(end, start + i / sampleFps);
    await seekVideo(video, sourceTime);
    const landmarks = detector.detect(video, timestampBase + Math.round(i * 1000 / sampleFps));
    let frame: MotionFrame | null = null;
    if (landmarks) {
      const detected: MotionFrame["joints"] = {};
      for (const [joint, index] of Object.entries(map)) {
        const q = landmarks[index!];
        if (q) detected[joint as JointName] = { x: q.x, y: q.y, z: q.z, confidence: q.visibility ?? 0 };
      }
      const lh = detected.leftHip!, rh = detected.rightHip!, ls = detected.leftShoulder!, rs = detected.rightShoulder!;
      detected.root = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, z: (lh.z + rh.z) / 2, confidence: Math.min(lh.confidence, rh.confidence) };
      detected.torso = { x: (ls.x + rs.x + lh.x + rh.x) / 4, y: (ls.y + rs.y + lh.y + rh.y) / 4, z: 0, confidence: Math.min(ls.confidence, rs.confidence, lh.confidence, rh.confidence) };
      detected.neck = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2, confidence: Math.min(ls.confidence, rs.confidence) };
      const values = Object.values(detected);
      frame = { time: sourceTime - start, joints: detected, confidence: values.reduce((s, q) => s + q!.confidence, 0) / values.length };
    }
    frames.push(frame ?? {time:sourceTime-start,joints:{},confidence:0});
    onProgress((i + 1) / total, frame);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return frames;
}

function direction(a: MotionLandmark, b: MotionLandmark) {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function retargetMotion(
  frames: MotionFrame[],
  target: Pose,
  startTime: number,
  rootMotion: boolean,
  rootScale: number,
  smoothing: number,
  detail: number,
  easing: PoseKeyframe["easing"],
) {
  frames=frames.filter(f=>f.joints.root); if (!frames.length) return [];
  const sourceRoot = frames[0].joints.root!, targetRoot = target.root;
  let previous = clonePose(target);
  const links: [JointName, JointName][] = [
    ["root","torso"],["torso","neck"],["neck","head"],
    ["neck","leftShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftWrist"],
    ["neck","rightShoulder"],["rightShoulder","rightElbow"],["rightElbow","rightWrist"],
    ["root","leftHip"],["leftHip","leftKnee"],["leftKnee","leftAnkle"],
    ["root","rightHip"],["rightHip","rightKnee"],["rightKnee","rightAnkle"],
  ];
  const stride = Math.max(1, Math.round(6 - Math.max(1, Math.min(5, detail))));
  const selected=frames.filter((frame, i) => i % stride === 0 || i === frames.length - 1 || frame.discontinuity || (i>0&&i<frames.length-1&&["leftWrist","rightWrist","leftAnkle","rightAnkle","root"].some(j=>{const a=frames[i-1].joints[j as JointName],b=frame.joints[j as JointName],c=frames[i+1].joints[j as JointName];return a&&b&&c&&(b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)<-.002;})));
  const keys:PoseKeyframe[]=[];
  for(const frame of selected) {
    if(frame.discontinuity&&keys.length) keys[keys.length-1].easing="hold";
    const pose = clonePose(target), root = frame.joints.root!;
    pose.root = rootMotion ? {
      x: targetRoot.x + (root.x - sourceRoot.x) * 900 * rootScale,
      y: targetRoot.y + (root.y - sourceRoot.y) * 900 * rootScale,
    } : { ...targetRoot };
    for (const [parent, child] of links) {
      const a = frame.joints[parent], b = frame.joints[child];
      const targetLength = Math.hypot(target[child].x - target[parent].x, target[child].y - target[parent].y);
      if (a && b && a.confidence > .25 && b.confidence > .25) {
        const d = direction(a, b);
        pose[child] = { x: pose[parent].x + d.x * targetLength, y: pose[parent].y + d.y * targetLength };
      } else pose[child] = { ...previous[child] };
    }
    const alpha = Math.max(.05, 1 - smoothing / 100);
    for (const joint of joints) pose[joint] = { x: previous[joint].x + (pose[joint].x - previous[joint].x) * alpha, y: previous[joint].y + (pose[joint].y - previous[joint].y) * alpha };
    previous = pose;
    keys.push({ id: uid(), time: startTime + frame.time, pose, easing });
  }
  return keys;
}
