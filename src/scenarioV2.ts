import { actions } from "./actions";
import { basePose, clonePose, poseAt, uid } from "./animation";
import { blankProject } from "./project";
import { poses } from "./poses";
import type { Character, Ease, Pose, Project, PropType } from "./types";
export interface ScenarioV2 {
  duration: number;
  actors?: { id: string; name?: string; preset?: Character["preset"] }[];
  characters?: ScenarioV2["actors"];
  props?: {
    id: string;
    type: PropType;
    name?: string;
    x?: number;
    y?: number;
    attachTo?: { actor: string; joint: string };
  }[];
  events?: {
    time: number;
    actor?: string;
    action: string;
    target?: string;
    prop?: string;
    participants?: string[];
  }[];
}
const shift = (pose: Pose, dx: number, dy = 0) => {
  const p = clonePose(pose);
  Object.values(p).forEach((j) => {
    j.x += dx;
    j.y += dy;
  });
  return p;
};
export function compileScenarioV2(
  source: ScenarioV2,
  format = { label: "16:9", width: 1920, height: 1080 },
): Project {
  const p = blankProject(format);
  p.name = "Scenario V2 Scene";
  p.duration = Math.max(1, source.duration || 10);
  p.characters = [];
  p.tracks = {};
  p.props = [];
  p.propTracks = {};
  const actors = source.actors ?? source.characters ?? [];
  const ground = Math.min(910, format.height * 0.8);
  actors.forEach((a, i) => {
    const size =
        a.preset === "child" || a.preset === "small"
          ? 0.72
          : a.preset === "large"
            ? 1.25
            : 1,
      pose = basePose(
        (format.width * (i + 1)) / (actors.length + 1),
        ground - 190,
        i % 2 === 1,
      );
    p.characters.push({
      id: a.id,
      name: a.name ?? a.id,
      type: "stick_character",
      preset: a.preset ?? "standard",
      color: ["#45a3ff", "#ff4d64", "#65d690", "#b277ff", "#ffb347"][i % 5],
      pose,
      flip: i % 2 === 1,
      scale: size,
      rotation: 0,
      visible: true,
      locked: false,
      layer: 10 + i,
    });
    p.tracks[a.id] = [
      {
        id: uid(),
        time: 0,
        pose,
        easing: "ease-in-out",
        scaleX: size,
        scaleY: size,
      },
    ];
  });
  (source.props ?? []).forEach((item, i) => {
    p.props!.push({
      id: item.id,
      name: item.name ?? item.type,
      type: item.type,
      color: item.type === "sword" ? "#c4d0df" : "#b98b5f",
      visible: true,
      locked: false,
      layer: 5 + i,
    });
    p.propTracks![item.id] = [
      {
        id: uid(),
        time: 0,
        x: item.x ?? format.width / 2,
        y: item.y ?? ground,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flipH: false,
        opacity: 1,
        attachment: item.attachTo
          ? {
              actorId: item.attachTo.actor,
              joint: item.attachTo.joint as any,
              offsetX: 0,
              offsetY: 0,
              rotation: 0,
            }
          : null,
        easing: "ease-in-out",
      },
    ];
  });
  for (const event of [...(source.events ?? [])].sort(
    (a, b) => a.time - b.time,
  )) {
    const actorId = event.actor ?? event.participants?.[0];
    if (!actorId || !p.tracks[actorId]) continue;
    const action = actions.find(
      (x) =>
        x.id === event.action ||
        x.name.toLowerCase().replaceAll(" ", "_") ===
          event.action.toLowerCase(),
    );
    if (!action) continue;
    const origin = poseAt(p.tracks[actorId], event.time).root;
    if (event.participants?.length && event.participants.length > 1) {
      const others = event.participants.slice(1).filter((id) => p.tracks[id]);
      others.forEach((id, index) => {
        const q = poseAt(p.tracks[id], event.time),
          desired = origin.x + (index + 1) * 115;
        const approach = shift(q, desired - q.root.x);
        p.tracks[id].push(
          {
            id: uid(),
            time: Math.max(0, event.time - 0.7),
            pose: q,
            easing: "ease-in-out",
          },
          { id: uid(), time: event.time, pose: approach, easing: "ease-out" },
        );
      });
    }
    action.keyframes.forEach((k) => {
      let pose = clonePose(poses[k.pose] ?? poses.neutral_stand);
      pose = shift(
        pose,
        origin.x - pose.root.x + (k.dx ?? 0),
        origin.y - pose.root.y + (k.dy ?? 0),
      );
      p.tracks[actorId].push({
        id: uid(),
        time: event.time + k.time,
        pose,
        easing: k.easing as Ease,
      });
    });
    if (
      event.prop &&
      p.propTracks![event.prop] &&
      ["pick_up", "hold", "drink", "give"].includes(event.action)
    )
      p.propTracks![event.prop].push({
        ...p.propTracks![event.prop][0],
        id: uid(),
        time: event.time + 0.35,
        attachment: {
          actorId,
          joint: "rightWrist",
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
        },
      });
  }
  return p;
}
