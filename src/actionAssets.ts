import { poseAt, uid } from "./animation";
import type {
  CameraKeyframe,
  Effect,
  Pose,
  PoseKeyframe,
  Project,
  Prop,
  PropKeyframe,
} from "./types";
export interface ActionParticipant {
  role: string;
  keys: PoseKeyframe[];
  origin: { x: number; y: number };
  facing: boolean;
}
export interface ActionAsset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  duration: number;
  actorCount: number;
  participants: ActionParticipant[];
  rootMotionMode: "preserve" | "remove";
  facing: "auto" | "left" | "right";
  camera?: CameraKeyframe[];
  effects?: Effect[];
  props?: Prop[];
  propTracks?: Record<string, PropKeyframe[]>;
  sourceMetadata: {
    type: "manual" | "motion_capture" | "fight_director" | "combined";
  };
  createdAt: string;
  updatedAt: string;
}
const KEY = "flip-studio-action-assets-v1";
export const loadActionAssets = (): ActionAsset[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export const saveActionAssets = (a: ActionAsset[]) =>
  localStorage.setItem(KEY, JSON.stringify(a));
const relative = (pose: Pose, o: { x: number; y: number }) => {
  const p = structuredClone(pose);
  Object.values(p).forEach((q) => {
    q.x -= o.x;
    q.y -= o.y;
  });
  return p;
};
export function captureAction(
  project: Project,
  actors: string[],
  start: number,
  end: number,
  meta: {
    name: string;
    category: string;
    tags: string[];
    rootMotionMode: "preserve" | "remove";
    facing: "auto" | "left" | "right";
    camera: boolean;
    effects: boolean;
    props: boolean;
    source: ActionAsset["sourceMetadata"]["type"];
  },
) {
  const participants = actors.map((id, index) => {
    const origin = poseAt(project.tracks[id], start).root,
      source = [
        {
          id: uid(),
          time: start,
          pose: poseAt(project.tracks[id], start),
          easing: "linear" as const,
        },
        ...(project.tracks[id] ?? []).filter(
          (k) => k.time > start && k.time < end,
        ),
        {
          id: uid(),
          time: end,
          pose: poseAt(project.tracks[id], end),
          easing: "linear" as const,
        },
      ];
    return {
      role: index === 0 ? "actor" : `target_${index}`,
      origin,
      facing: project.characters.find((c) => c.id === id)?.flip ?? false,
      keys: source.map((k) => ({
        ...k,
        id: uid(),
        time: k.time - start,
        pose: relative(k.pose, origin),
      })),
    };
  });
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: meta.name,
    category: meta.category,
    tags: meta.tags,
    duration: end - start,
    actorCount: participants.length,
    participants,
    rootMotionMode: meta.rootMotionMode,
    facing: meta.facing,
    camera: meta.camera
      ? project.camera
          .filter((k) => k.time >= start && k.time <= end)
          .map((k) => ({ ...k, id: uid(), time: k.time - start }))
      : undefined,
    effects: meta.effects
      ? project.effects
          .filter((k) => k.time >= start && k.time <= end)
          .map((k) => ({ ...k, id: uid(), time: k.time - start }))
      : undefined,
    props: meta.props ? structuredClone(project.props) : undefined,
    propTracks: meta.props ? structuredClone(project.propTracks) : undefined,
    sourceMetadata: { type: meta.source },
    createdAt: now,
    updatedAt: now,
  } satisfies ActionAsset;
}
const mirror = (p: Pose) => {
  const q = structuredClone(p);
  Object.values(q).forEach((j) => (j.x = -j.x));
  return q;
};
export function insertAction(
  project: Project,
  asset: ActionAsset,
  actorIds: string[],
  start: number,
  mirrorAction = false,
  rootMode = asset.rootMotionMode,
) {
  const n = structuredClone(project),
    lead = actorIds[0] ? poseAt(n.tracks[actorIds[0]], start).root : null,
    baseOrigin = asset.participants[0]?.origin;
  asset.participants.forEach((part, i) => {
    const id = actorIds[i];
    if (!id || !n.tracks[id] || !lead) return;
    const spacing = {
        x: (part.origin.x - baseOrigin.x) * (mirrorAction ? -1 : 1),
        y: part.origin.y - baseOrigin.y,
      },
      destination = i ? { x: lead.x + spacing.x, y: lead.y + spacing.y } : lead,
      firstPose = part.keys[0]?.pose,
      first = firstPose
        ? (mirrorAction ? mirror(firstPose) : firstPose).root
        : { x: 0, y: 0 };
    for (const k of part.keys) {
      let po = mirrorAction ? mirror(k.pose) : structuredClone(k.pose);
      if (rootMode === "remove") {
        const dx = first.x - po.root.x,
          dy = first.y - po.root.y;
        Object.values(po).forEach((j) => {
          j.x += dx;
          j.y += dy;
        });
      }
      Object.values(po).forEach((j) => {
        j.x += destination.x;
        j.y += destination.y;
      });
      n.tracks[id].push({ ...k, id: uid(), time: start + k.time, pose: po });
      n.tracks[id].sort((a, b) => a.time - b.time);
    }
  });
  if (asset.camera)
    n.camera.push(
      ...asset.camera.map((k) => ({ ...k, id: uid(), time: start + k.time })),
    );
  if (asset.effects)
    n.effects.push(
      ...asset.effects.map((k) => ({ ...k, id: uid(), time: start + k.time })),
    );
  n.duration = Math.max(n.duration, start + asset.duration);
  return n;
}
export function exportAction(asset: ActionAsset) {
  return JSON.stringify(
    { format: "2d-flip-action", version: 1, asset },
    null,
    2,
  );
}
export function importAction(text: string) {
  const x = JSON.parse(text);
  if (x.format !== "2d-flip-action" || !x.asset?.participants)
    throw new Error("Invalid .flipaction file");
  return x.asset as ActionAsset;
}
