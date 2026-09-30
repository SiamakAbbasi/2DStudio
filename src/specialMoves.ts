import { actions } from "./actions";
import { clonePose, poseAt, uid } from "./animation";
import { poses } from "./poses";
import type { CameraKeyframe, Pose, Project, SpecialEvent, SpecialMove } from "./types";

const modules = import.meta.glob("./specialMoves/*.json", {
  eager: true,
  import: "default",
}) as Record<string, SpecialMove>;
export const specialMoves = Object.values(modules).sort(
  (a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
);
const shift = (pose: Pose, dx: number, dy: number) => {
  const p = clonePose(pose);
  for (const j in p) {
    p[j as keyof Pose].x += dx;
    p[j as keyof Pose].y += dy;
  }
  return p;
};
const rotate = (pose: Pose, degrees: number) => {
  const p = clonePose(pose),
    r = (degrees * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r),
    o = p.root;
  for (const j in p) {
    const q = p[j as keyof Pose],
      x = q.x - o.x,
      y = q.y - o.y;
    q.x = o.x + x * c - y * s;
    q.y = o.y + x * s + y * c;
  }
  return p;
};
const addPose = (
  p: Project,
  id: string,
  time: number,
  pose: Pose,
  easing: any = "ease-in-out",
) => p.tracks[id].push({ id: uid(), time, pose, easing });
function actionInto(
  p: Project,
  id: string,
  start: number,
  event: SpecialEvent,
) {
  const a = actions.find(
    (x) =>
      x.name === event.action ||
      x.name.toLowerCase().replaceAll(" ", "_") === event.action,
  );
  if (!a) return;
  const scale = event.scale ?? 1,
    origin = poseAt(p.tracks[id], start).root,
    flip = p.characters.find((c) => c.id === id)?.flip ? -1 : 1;
  for (const k of a.keyframes) {
    let q = clonePose(poses[k.pose] ?? poses.fight_guard),
      dx = origin.x - q.root.x + (k.dx ?? 0) * flip,
      dy = origin.y - q.root.y + (k.dy ?? 0);
    q = shift(q, dx, dy);
    addPose(p, id, start + k.time * scale, q, k.easing);
  }
}
function cameraPreset(
  p: Project,
  time: number,
  preset: string,
  a: string,
  d: string,
  strength = 0.7,
) {
  const ap = poseAt(p.tracks[a], time).root,
    dp = poseAt(p.tracks[d], time).root,
    mid = { x: (ap.x + dp.x) / 2, y: (ap.y + dp.y) / 2 - 100 },
    base: CameraKeyframe = {
      id: uid(),
      time,
      x: mid.x,
      y: mid.y,
      zoom: 0.9,
      rotation: 0,
      easing: "ease-in-out",
    };
  if (preset === "wide_both") base.zoom = 0.7;
  if (preset === "push_in") base.zoom = 1.08;
  if (preset === "airborne_follow") {
    base.y -= 180;
    base.zoom = 0.85;
  }
  if (preset === "impact_zoom") {
    base.zoom = 1.15;
    base.easing = "snap";
    p.camera.push(base, {
      ...base,
      id: uid(),
      time: time + 0.22,
      zoom: 0.85,
      easing: "ease-out",
    });
    return;
  }
  p.camera.push(base);
  if (preset.startsWith("shake"))
    p.effects.push({
      id: uid(),
      time,
      duration: 0.18,
      type: "shake",
      x: mid.x,
      y: mid.y,
      strength: 8 + strength * 18,
    });
}
export function insertSpecialMove(
  project: Project,
  move: SpecialMove,
  attacker: string,
  start: number,
  defenderId?: string,
) {
  const p = structuredClone(project),
    defender = defenderId && defenderId !== attacker && p.tracks[defenderId]
      ? defenderId
      : p.characters.find((c)=>c.id!==attacker)?.id;
  if(!defender)return p;
  const
    attackerFlip = p.characters.find((c) => c.id === attacker)?.flip ? -1 : 1;
  p.duration = Math.max(p.duration, start + move.duration + 0.25);
  for (const e of [...move.events].sort((a, b) => a.time - b.time)) {
    const t = start + e.time,
      id = e.fighter === "defender" ? defender : attacker,
      current = poseAt(p.tracks[id], t);
    if (e.type === "action") actionInto(p, id, t, e);
    else if (e.type === "pose" && e.pose && poses[e.pose]) {
      let q = clonePose(poses[e.pose]);
      if (p.characters.find((c) => c.id === id)?.flip) {
        const x = q.root.x;
        for (const j in q)
          q[j as keyof Pose].x = x - (q[j as keyof Pose].x - x);
      }
      q = shift(q, current.root.x - q.root.x, current.root.y - q.root.y);
      addPose(p, id, t, q, e.easing);
    } else if (
      ["moveRoot", "pull", "launch", "wallBounce", "groundBounce"].includes(
        e.type,
      )
    ) {
      const dx = (e.x ?? 0) * (id === attacker ? attackerFlip : 1),
        dy = e.y ?? 0,
        dur = e.duration ?? 0.4;
      addPose(p, id, t, current, e.easing ?? "ease-in-out");
      let q = shift(current, dx, dy);
      if (e.rotation) q = rotate(q, e.rotation);
      addPose(
        p,
        id,
        t + dur,
        q,
        e.type === "launch" ? "ease-out" : "ease-in-out",
      );
      if (e.type === "groundBounce") {
        addPose(
          p,
          id,
          t + dur * 0.55,
          shift(current, dx * 0.7, Math.min(0, dy) - 100),
          "ease-out",
        );
        addPose(p, id, t + dur, current, "ease-in");
      }
    } else if (e.type === "rotation") {
      addPose(p, id, t, current, "linear");
      addPose(
        p,
        id,
        t + (e.duration ?? 0.5),
        rotate(
          current,
          (e.rotation ?? 360) * (id === attacker ? attackerFlip : 1),
        ),
        "linear",
      );
    } else if (e.type === "attach" || e.type === "grab") {
      const target = poseAt(p.tracks[defender], t),
        q = clonePose(current),
        hand = p.characters.find((c) => c.id === attacker)?.flip
          ? "leftWrist"
          : "rightWrist";
      q[hand] = { ...target.neck };
      addPose(p, attacker, t, q, "ease-out");
    } else if (e.type === "tether" || e.type === "tetherAttach") {
      const a = poseAt(p.tracks[attacker], t).root,
        d = poseAt(p.tracks[defender], t).root;
      p.effects.push({
        id: uid(),
        time: t,
        duration: e.duration ?? 0.7,
        type: "tether",
        x: a.x,
        y: a.y,
        strength: e.strength ?? 1,
        style: e.style ?? "energy",
        sourceFighter: attacker,
        targetFighter: defender,
        layer: "between",
      });
    } else if (e.type === "status") {
      const q = poseAt(p.tracks[id], t);
      addPose(p, id, t, q, "hold");
      addPose(p, id, t + (e.duration ?? 0.5), q, "linear");
      p.effects.push({
        id: uid(),
        time: t,
        duration: e.duration ?? 0.5,
        type: e.target === "stunned" ? "stunned" : "frozen",
        x: q.root.x,
        y: q.root.y,
        strength: e.strength ?? 0.7,
        targetFighter: id,
      });
    } else if (e.type === "effect") {
      const q = poseAt(p.tracks[id], t);
      p.effects.push({
        id: uid(),
        time: t,
        duration: e.duration ?? 0.25,
        type: (e.target as any) || "flash",
        x: q.root.x,
        y: q.root.y - 120,
        strength: e.strength ?? 0.7,
      });
    } else if (e.type === "impact") {
      const q = poseAt(p.tracks[defender], t),
        s = e.strength ?? 0.8;
      p.effects.push(
        {
          id: uid(),
          time: t,
          duration: 0.12 + 0.12 * s,
          type: "flash",
          x: q.root.x,
          y: q.root.y - 120,
          strength: s,
        },
        {
          id: uid(),
          time: t,
          duration: 0.18,
          type: "shake",
          x: q.root.x,
          y: q.root.y,
          strength: 8 + 18 * s,
        },
        {
          id: uid(),
          time: t,
          duration: 0.35,
          type: "shockwave",
          x: q.root.x,
          y: q.root.y - 120,
          strength: s,
        },
      );
    } else if (e.type === "camera")
      cameraPreset(
        p,
        t,
        e.preset ?? "wide_both",
        attacker,
        defender,
        e.strength,
      );
    else if (e.type === "speed")
      p.speed.push({ id: uid(), time: t, speed: e.speed ?? 100 });
  }
  return p;
}
