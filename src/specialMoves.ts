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
) => p.tracks[id].push({ id: uid(), time, pose, easing, flipH: false });
const mirroredPose = (pose: Pose) => {
  const p = clonePose(pose), x = p.root.x;
  for (const joint in p) p[joint as keyof Pose].x = x - (p[joint as keyof Pose].x - x);
  return p;
};
const connectedPose = (pose: Pose) => {
  const p = clonePose(pose);
  const spineX=p.neck.x-p.torso.x,spineY=p.neck.y-p.torso.y,spineDistance=Math.hypot(spineX,spineY),spineMaximum=78;
  if(spineDistance>spineMaximum){
    const old={...p.neck};
    p.neck.x=p.torso.x+spineX*spineMaximum/spineDistance;
    p.neck.y=p.torso.y+spineY*spineMaximum/spineDistance;
    p.head.x+=p.neck.x-old.x;p.head.y+=p.neck.y-old.y;
  }
  const dx = p.head.x - p.neck.x, dy = p.head.y - p.neck.y;
  const distance = Math.hypot(dx, dy), maximum = 50;
  if (distance > maximum) {
    p.head.x = p.neck.x + dx * maximum / distance;
    p.head.y = p.neck.y + dy * maximum / distance;
  }
  return p;
};
function actionInto(
  p: Project,
  id: string,
  start: number,
  event: SpecialEvent,
  facing: 1 | -1,
  opponent?: string,
) {
  const a = actions.find(
    (x) =>
      x.name === event.action ||
      x.name.toLowerCase().replaceAll(" ", "_") === event.action,
  );
  if (!a) return;
  const scale = event.scale ?? 1,
    origin = poseAt(p.tracks[id], start).root;
  for (const k of a.keyframes) {
    let q = clonePose(poses[k.pose] ?? poses.fight_guard);
    if (facing < 0) q = mirroredPose(q);
    q = connectedPose(q);
    let dx = origin.x - q.root.x + (k.dx ?? 0) * facing,
      dy = origin.y - q.root.y + (k.dy ?? 0);
    q = shift(q, dx, dy);
    if(opponent&&p.tracks[opponent]){
      const opponentX=poseAt(p.tracks[opponent],start+k.time*scale).root.x,minimum=185,
        correction=facing>0?Math.max(0,q.root.x-(opponentX-minimum)):Math.min(0,q.root.x-(opponentX+minimum));
      if(correction)q=shift(q,-correction,0);
    }
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
      : undefined;
  if(!p.tracks[attacker])return p;
  const attackerRoot = poseAt(p.tracks[attacker], start).root,
    defenderRoot = defender ? poseAt(p.tracks[defender], start).root : undefined,
    attackerFacing: 1 | -1 = defenderRoot
      ? (defenderRoot.x >= attackerRoot.x ? 1 : -1)
      : (p.characters.find((c) => c.id === attacker)?.flip ? -1 : 1);
  const attackerCharacter=p.characters.find((c)=>c.id===attacker);
  if(attackerCharacter)attackerCharacter.flip=attackerFacing<0;
  if(defender){const c=p.characters.find((x)=>x.id===defender);if(c)c.flip=attackerFacing>0;}
  p.duration = Math.max(p.duration, start + move.duration + 0.25);
  // A paired move is one event: establish the defender's opposing guard and
  // hold it until the authored contact reaction begins. Without this hold the
  // timeline interpolates toward the hit pose before impact, producing crossed
  // legs and an unrelated-looking second animation.
  if (defender) {
    const current = poseAt(p.tracks[defender], start), defenderFacing = attackerFacing === 1 ? -1 : 1;
    let guard = clonePose(poses.fight_guard);
    if (defenderFacing < 0) guard = mirroredPose(guard);
    guard = shift(connectedPose(guard), current.root.x - guard.root.x, current.root.y - guard.root.y);
    addPose(p, defender, start, guard, "hold");
  }
  for (const e of [...move.events].sort((a, b) => a.time - b.time)) {
    const t = start + e.time,
      id = e.fighter === "defender" ? defender : attacker;
    if(!id)continue;
    const
      current = poseAt(p.tracks[id], t);
    const facing: 1 | -1 = id === attacker ? attackerFacing : (attackerFacing === 1 ? -1 : 1);
    if (e.type === "action") actionInto(p, id, t, e, facing, id===attacker?defender:attacker);
    else if (e.type === "pose" && e.pose && poses[e.pose]) {
      let q = clonePose(poses[e.pose]);
      if (facing < 0) q = mirroredPose(q);
      q = connectedPose(q);
      q = shift(q, current.root.x - q.root.x, current.root.y - q.root.y);
      addPose(p, id, t, q, e.easing);
    } else if (
      ["moveRoot", "pull", "launch", "wallBounce", "groundBounce"].includes(
        e.type,
      )
    ) {
      // Positive authored travel means forward for the attacker and away from
      // the attacker for the defender, so reversed exchanges stay directional.
      const dx = (e.x ?? 0) * attackerFacing,
        dy = e.y ?? 0,
        dur = e.duration ?? 0.4;
      addPose(p, id, t, current, e.easing ?? "ease-in-out");
      let q = shift(current, dx, dy);
      if(id===attacker&&defender){
        const opponentX=poseAt(p.tracks[defender],t+dur).root.x,minimum=185,
          correction=attackerFacing>0?Math.max(0,q.root.x-(opponentX-minimum)):Math.min(0,q.root.x-(opponentX+minimum));
        if(correction)q=shift(q,-correction,0);
      }
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
          (e.rotation ?? 360) * (id === attacker ? attackerFacing : 1),
        ),
        "linear",
      );
    } else if (e.type === "attach" || e.type === "grab") {
      if(!defender)continue;
      const target = poseAt(p.tracks[defender], t),
        q = clonePose(current),
        hand = p.characters.find((c) => c.id === attacker)?.flip
          ? "leftWrist"
          : "rightWrist";
      q[hand] = { ...target.neck };
      addPose(p, attacker, t, q, "ease-out");
    } else if (e.type === "tether" || e.type === "tetherAttach") {
      if(!defender)continue;
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
      if(!defender)continue;
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
    } else if (e.type === "camera" && defender)
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
