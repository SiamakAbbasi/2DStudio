import { basePose, clonePose, uid } from "./animation";
import { poses } from "./poses";
import type { Pose, Project } from "./types";
export function migrateProject(input: Project): Project {
  const p = structuredClone(input);
  p.characters ??= [];
  p.tracks ??= {};
  p.props ??= [];
  p.propTracks ??= {};
  p.motionPaths ??= [];
  p.pathVisibility ??= "selected";
  p.dance ??= { bpm: 120, beatGrid: false, snapToBeat: false };
  p.motionReviews ??= [];
  p.customActions ??= [];
  p.actionCategories ??= [];
  p.actionCategoryMeta ??= p.actionCategories.map((name, sortOrder) => ({
    id: `category_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name,
    sortOrder,
    isSystem: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));
  if (p.master) {
    p.master.format ??= structuredClone(p.format);
    p.master.clips.forEach((clip) => {
      clip.in = Math.max(0, Math.min(clip.in, clip.source.duration));
      clip.out = Math.max(clip.in, Math.min(clip.out, clip.source.duration));
    });
  }
  p.characters.forEach((actor, index) => {
    actor.type ??= "stick_character";
    actor.preset ??= "standard";
    actor.locked ??= false;
    actor.layer ??= index * 10 + 10;
    actor.appearance ??= {
      primaryColor: actor.color,
      accentColor: "#dcecff",
      head: "none",
      face: "none",
      body: "none",
    };
    actor.equipment ??= "none";
    p.tracks[actor.id] ??= [
      {
        id: uid(),
        time: 0,
        pose: clonePose(actor.pose),
        easing: "ease-in-out",
      },
    ];
    if (actor.id === "a" && actor.name === "Fighter A") actor.name = "Actor A";
    if (actor.id === "b" && actor.name === "Fighter B") actor.name = "Actor B";
  });
  return p;
}
const k = (time: number, pose: Pose, easing: any = "ease-in-out") => ({
  id: uid(),
  time,
  pose: clonePose(pose),
  easing,
});
const shift = (p: Pose, dx: number, dy = 0) => {
  const n = clonePose(p);
  for (const j in n) {
    n[j as keyof Pose].x += dx;
    n[j as keyof Pose].y += dy;
  }
  return n;
};
export function blankProject(
  format = { label: "9:16", width: 1080, height: 1920 },
): Project {
  const ground = Math.min(910, format.height * 0.8);
  const fighterA = basePose(format.width * 0.32, ground - 190, false);
  const fighterB = basePose(format.width * 0.68, ground - 190, true);
  return {
    version: 1,
    name: "Untitled Scene",
    duration: 5,
    fps: 24,
    format,
    characters: [
      {
        id: "a",
        name: "Actor A",
        type: "stick_character",
        preset: "standard",
        color: "#45a3ff",
        pose: fighterA,
        flip: false,
        scale: 1,
        rotation: 0,
        visible: true,
      },
      {
        id: "b",
        name: "Actor B",
        type: "stick_character",
        preset: "standard",
        color: "#ff4d64",
        pose: fighterB,
        flip: true,
        scale: 1,
        rotation: 0,
        visible: true,
      },
    ],
    tracks: { a: [k(0, fighterA)], b: [k(0, fighterB)] },
    props: [],
    propTracks: {},
    camera: [
      {
        id: uid(),
        time: 0,
        x: format.width / 2,
        y: format.height / 2,
        // New projects must start from the same neutral camera produced by
        // "Reset Camera Here".  A 0.8 zoom made the initial frame 25% larger
        // than the project canvas and looked different immediately after reset.
        zoom: 1,
        rotation: 0,
        easing: "linear",
      },
    ],
    speed: [{ id: uid(), time: 0, speed: 100 }],
    effects: [],
    background: { top: "#10182d", bottom: "#05070d", grid: true },
    savedPoses: { ...poses },
    trail: 1,
    dance: { bpm: 120, beatGrid: false, snapToBeat: false },
  };
}
export function demoProject(): Project {
  const fa = (x: number) => shift(poses["Fight Stance"], x - 360),
    fb = (x: number) => {
      const p = shift(poses["Fight Stance"], x - 360);
      const r = p.root.x;
      for (const j in p) p[j as keyof Pose].x = r - (p[j as keyof Pose].x - r);
      return p;
    };
  const bPunch = fb(610);
  bPunch.leftElbow = { x: 470, y: 540 };
  bPunch.leftWrist = { x: 390, y: 535 };
  const aCounter = fa(360);
  aCounter.rightElbow = { x: 500, y: 545 };
  aCounter.rightWrist = { x: 610, y: 540 };
  return {
    version: 1,
    name: "Matrix Counter Demo",
    duration: 5,
    fps: 24,
    format: { label: "9:16", width: 1080, height: 1920 },
    characters: [
      {
        id: "a",
        name: "Actor A",
        color: "#45a3ff",
        pose: fa(300),
        flip: false,
        scale: 1,
        rotation: 0,
        visible: true,
      },
      {
        id: "b",
        name: "Actor B",
        color: "#ff4d64",
        pose: fb(780),
        flip: true,
        scale: 1,
        rotation: 0,
        visible: true,
      },
    ],
    tracks: {
      a: [
        k(0, fa(300)),
        k(1.45, fa(300), "hold"),
        k(1.75, shift(poses.Dodge, -110), "snap"),
        k(2.12, shift(poses["Punch Anticipation"], -20), "snap"),
        k(2.34, aCounter, "hold"),
        k(2.55, aCounter, "ease-out"),
        k(3.25, fa(300), "ease-in-out"),
        k(5, fa(300)),
      ],
      b: [
        k(0, fb(780)),
        k(0.55, fb(780), "snap"),
        k(1.05, fb(570), "ease-out"),
        k(1.35, bPunch, "hold"),
        k(1.55, bPunch, "ease-out"),
        k(2.3, fb(570), "hold"),
        k(2.5, shift(fb(570), 130), "snap"),
        k(3.3, fb(780), "ease-out"),
        k(5, fb(780)),
      ],
    },
    props: [],
    propTracks: {},
    camera: [
      {
        id: uid(),
        time: 0,
        x: 540,
        y: 890,
        zoom: 0.78,
        rotation: 0,
        easing: "ease-in-out",
      },
      {
        id: uid(),
        time: 2.05,
        x: 505,
        y: 820,
        zoom: 0.86,
        rotation: 0,
        easing: "snap",
      },
      {
        id: uid(),
        time: 2.36,
        x: 510,
        y: 760,
        zoom: 1.14,
        rotation: -0.015,
        easing: "ease-out",
      },
      {
        id: uid(),
        time: 2.75,
        x: 540,
        y: 860,
        zoom: 0.82,
        rotation: 0,
        easing: "ease-in-out",
      },
      {
        id: uid(),
        time: 5,
        x: 540,
        y: 890,
        zoom: 0.78,
        rotation: 0,
        easing: "linear",
      },
    ],
    speed: [
      { id: uid(), time: 0, speed: 100 },
      { id: uid(), time: 1.7, speed: 100 },
      { id: uid(), time: 2.0, speed: 35 },
      { id: uid(), time: 2.75, speed: 35 },
      { id: uid(), time: 3.1, speed: 190 },
      { id: uid(), time: 3.6, speed: 100 },
    ],
    effects: [
      {
        id: uid(),
        time: 2.34,
        duration: 0.16,
        type: "flash",
        x: 575,
        y: 540,
        strength: 1,
      },
      {
        id: uid(),
        time: 2.34,
        duration: 0.45,
        type: "shockwave",
        x: 575,
        y: 540,
        strength: 1,
      },
      {
        id: uid(),
        time: 2.42,
        duration: 0.18,
        type: "shake",
        x: 575,
        y: 540,
        strength: 18,
      },
    ],
    background: { top: "#10182d", bottom: "#05070d", grid: true },
    savedPoses: { ...poses },
    trail: 2,
    dance: { bpm: 120, beatGrid: false, snapToBeat: false },
  };
}
