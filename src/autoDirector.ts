import { actions } from "./actions";
import { poses } from "./poses";
import { compileScenarioV2 } from "./scenarioV2";
import { poseAt, uid } from "./animation";
import type {
  CameraKeyframe,
  Character,
  Effect,
  PoseKeyframe,
  Project,
  Prop,
  PropKeyframe,
  PropType,
} from "./types";
import { applyCinematic, cinematicPresets } from "./cinematicTiming";
import { loadActionAssets } from "./actionAssets";
import {
  buildFight,
  builtInFightPackages,
  fightMoves,
  type FightSettings,
} from "./fightDirector";
import { insertSpecialMove } from "./specialMoves";
import { sceneDoc, type DirectorSceneDocument } from "./sceneState";

export interface StoryRequest {
  prompt: string;
  targetDuration: number;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  style: "simple";
  generationMode: "auto" | "import";
  existingCharacters?: string[];
  constraints?: string[];
  seed?: number;
}
export type AnimationCommand =
  | {
      type: "PLAY_ACTION";
      time: number;
      actor: string;
      action: string;
      target?: string;
    }
  | {
      type: "ACTOR_MOVE";
      time: number;
      actor: string;
      action: "walk" | "run" | "approach";
      toX?: number;
    }
  | { type: "APPLY_POSE"; time: number; actor: string; pose: string }
  | {
      type: "ATTACH_PROP";
      time: number;
      actor: string;
      prop: string;
      action: "pick_up" | "hold" | "drink";
    }
  | {
      type: "CAMERA_MOVE" | "CAMERA_ZOOM";
      time: number;
      duration: number;
      x?: number;
      y?: number;
      zoom?: number;
    }
  | { type: "CAMERA_SHAKE"; time: number; duration: number; strength: number }
  | {
      type: "ADD_EFFECT";
      time: number;
      effect: "flash" | "shockwave" | "lines" | "dust";
      x?: number;
      y?: number;
      strength?: number;
    }
  | { type: "APPLY_CINEMATIC"; time: number; preset: string }
  | {
      type: "GENERATE_FIGHT";
      time: number;
      attacker: string;
      defender: string;
      duration: number;
      style: FightSettings["style"];
      intensity: number;
      winner: FightSettings["winner"];
      packageId?: string;
      seed?: number;
    }
  | {
      type: "PLAY_FIGHT_MOVE";
      time: number;
      attacker: string;
      target: string;
      moveId: string;
    }
  | { type: "WAIT"; time: number; duration: number };
export interface ShotPlan {
  id: string;
  duration: number;
  description: string;
  commands: AnimationCommand[];
  locked?: boolean;
}
export interface ScenePlan {
  id: string;
  title: string;
  duration: number;
  location: string;
  timeOfDay?: string;
  characters: string[];
  props: string[];
  objective: string;
  shots: ShotPlan[];
  locked?: boolean;
}
export interface ProjectPlan {
  version: 1;
  id: string;
  title: string;
  targetDuration: number;
  aspectRatio: StoryRequest["aspectRatio"];
  style: "simple";
  seed: number;
  characters: { id: string; name: string; preset?: Character["preset"] }[];
  props: { id: string; type: PropType; name?: string }[];
  scenes: ScenePlan[];
}
export interface CapabilityManifest {
  actions: {
    id: string;
    name: string;
    duration: number;
    categories: string[];
  }[];
  poses: string[];
  props: PropType[];
  effects: string[];
  camera: string[];
  characterCapabilities: string[];
  fightMoves: {
    id: string;
    name: string;
    category: string;
    duration: number;
  }[];
  fightPackages: { id: string; name: string }[];
  supportedFightStyles: FightSettings["style"][];
}
export interface PlanValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
export interface AutoDirectorState {
  plan: ProjectPlan;
  activeSceneId: string;
  sceneDocuments: Record<string, DirectorSceneDocument>;
  seed: number;
  locks: { shots: string[] };
}

const propTypes: PropType[] = [
  "chair",
  "table",
  "sofa",
  "bed",
  "bench",
  "phone",
  "cup",
  "book",
  "bag",
  "umbrella",
  "flower",
  "gift",
  "letter",
  "sword",
  "staff",
  "shield",
  "flashlight",
  "radio",
  "ball",
  "rectangle",
  "circle",
  "line",
  "image",
];
export const capabilityManifest = (): CapabilityManifest => ({
  actions: [
    ...actions.map((a) => ({
      id: a.id ?? a.name.toLowerCase().replaceAll(" ", "_"),
      name: a.name,
      duration: a.duration,
      categories: a.categories ?? [],
    })),
    ...loadActionAssets().map((a) => ({
      id: a.id,
      name: a.name,
      duration: a.duration,
      categories: [a.category, "Custom"],
    })),
  ],
  poses: Object.keys(poses),
  props: propTypes,
  effects: [
    "flash",
    "shockwave",
    "lines",
    "dust",
    "shake",
    "motionTrail",
    "afterimage",
    "sparks",
    "hitParticles",
    "clash",
  ],
  camera: ["move", "zoom", "shake", "follow", "rotation"],
  characterCapabilities: [
    "enter",
    "exit",
    "move",
    "face",
    "scale",
    "flip",
    "action",
    "pose",
    "prop-attachment",
  ],
  fightMoves: fightMoves.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    duration: m.duration,
  })),
  fightPackages: builtInFightPackages.map((p) => ({ id: p.id, name: p.name })),
  supportedFightStyles: [
    "Balanced",
    "Fast",
    "Technical",
    "Acrobatic",
    "Arcade",
    "Heavy",
  ],
});
export const autoDirectorContext = () =>
  JSON.stringify(
    {
      schema: {
        StoryRequest: "prompt,targetDuration,aspectRatio,style,generationMode",
        ProjectPlan: "title,targetDuration,characters,props,scenes[]",
        ScenePlan:
          "id,title,duration,location,characters,props,objective,shots[]",
        ShotPlan: "id,duration,description,commands[]",
        commands: [
          "PLAY_ACTION",
          "ACTOR_MOVE",
          "APPLY_POSE",
          "ATTACH_PROP",
          "CAMERA_MOVE",
          "CAMERA_ZOOM",
          "CAMERA_SHAKE",
          "ADD_EFFECT",
          "GENERATE_FIGHT",
          "PLAY_FIGHT_MOVE",
          "WAIT",
        ],
      },
      capabilities: capabilityManifest(),
    },
    null,
    2,
  );

export function validateProjectPlan(plan: ProjectPlan): PlanValidation {
  const errors: string[] = [],
    warnings: string[] = [],
    manifest = capabilityManifest(),
    actors = new Set(plan.characters.map((c) => c.id)),
    props = new Set(plan.props.map((p) => p.id)),
    actionIds = new Set(
      manifest.actions.flatMap((a) => [
        a.id,
        a.name.toLowerCase().replaceAll(" ", "_"),
      ]),
    ),
    poseIds = new Set(manifest.poses),
    fightIds = new Set(manifest.fightMoves.map((m) => m.id));
  if (!plan.scenes.length) errors.push("Plan must contain at least one Scene.");
  let total = 0;
  for (const scene of plan.scenes) {
    if (scene.duration <= 0)
      errors.push(`${scene.id}: duration must be positive.`);
    total += scene.duration;
    let shots = 0;
    for (const shot of scene.shots) {
      shots += shot.duration;
      if (shot.duration <= 0)
        errors.push(`${shot.id}: duration must be positive.`);
      for (const command of shot.commands) {
        if ("actor" in command && !actors.has(command.actor))
          errors.push(`${shot.id}: unknown actor ${command.actor}.`);
        if (
          command.type === "PLAY_ACTION" &&
          !actionIds.has(command.action.toLowerCase().replaceAll(" ", "_"))
        )
          errors.push(`${shot.id}: missing action ${command.action}.`);
        if (command.type === "APPLY_POSE" && !poseIds.has(command.pose))
          errors.push(`${shot.id}: missing pose ${command.pose}.`);
        if (command.type === "ATTACH_PROP" && !props.has(command.prop))
          errors.push(`${shot.id}: missing prop ${command.prop}.`);
        if (command.type === "PLAY_FIGHT_MOVE") {
          if (!fightIds.has(command.moveId)) errors.push(`${shot.id}: missing Fight Move ${command.moveId}.`);
          if (!actors.has(command.attacker) || !actors.has(command.target) || command.attacker === command.target) errors.push(`${shot.id}: invalid fight Actor assignment.`);
        }
        if (command.type === "GENERATE_FIGHT" && (!actors.has(command.attacker) || !actors.has(command.defender) || command.attacker === command.defender))
          errors.push(`${shot.id}: invalid generated Fight assignment.`);
        if (command.time < 0 || command.time > shot.duration)
          errors.push(`${shot.id}: command time outside shot.`);
      }
    }
    if (shots > scene.duration + 0.01)
      errors.push(`${scene.id}: shots exceed Scene duration.`);
    else if (shots < scene.duration * 0.75)
      warnings.push(
        `${scene.id}: ${Math.round(scene.duration - shots)}s is unassigned.`,
      );
  }
  if (
    Math.abs(total - plan.targetDuration) >
    Math.max(2, plan.targetDuration * 0.2)
  )
    warnings.push(
      `Scene total ${total}s differs from target ${plan.targetDuration}s.`,
    );
  return { valid: !errors.length, errors, warnings };
}
const formatFor = (r: ProjectPlan["aspectRatio"]) =>
  r === "9:16"
    ? { label: r, width: 1080, height: 1920 }
    : r === "1:1"
      ? { label: r, width: 1080, height: 1080 }
      : r === "4:5"
        ? { label: r, width: 1080, height: 1350 }
        : { label: r, width: 1920, height: 1080 };

export function compileProjectPlan(plan: ProjectPlan): Project {
  const validation = validateProjectPlan(plan);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));
  const documents: Record<string, DirectorSceneDocument> = {};
  for (const scene of plan.scenes) {
    let offset = 0;
    const events: {
        time: number;
        actor?: string;
        action: string;
        target?: string;
        prop?: string;
      }[] = [],
      camera: { time: number; command: AnimationCommand }[] = [],
      poseCommands: { time: number; actor: string; pose: string }[] = [],
      fightCommands: { time: number; command: Extract<AnimationCommand,{type:"GENERATE_FIGHT"|"PLAY_FIGHT_MOVE"}> }[] = [];
    for (const shot of scene.shots) {
      for (const command of shot.commands) {
        const time = offset + command.time;
        if (command.type === "PLAY_ACTION")
          events.push({
            time,
            actor: command.actor,
            action: command.action,
            target: command.target,
          });
        else if (command.type === "ACTOR_MOVE")
          events.push({ time, actor: command.actor, action: command.action });
        else if (command.type === "ATTACH_PROP")
          events.push({
            time,
            actor: command.actor,
            action: command.action,
            prop: command.prop,
          });
        else if (command.type === "APPLY_POSE")
          poseCommands.push({ time, actor: command.actor, pose: command.pose });
        else if (command.type === "GENERATE_FIGHT" || command.type === "PLAY_FIGHT_MOVE")
          fightCommands.push({time,command});
        else if (
          command.type.startsWith("CAMERA_") ||
          command.type === "ADD_EFFECT" ||
          command.type === "APPLY_CINEMATIC"
        )
          camera.push({ time, command });
      }
      offset += shot.duration;
    }
    let p = compileScenarioV2(
      {
        duration: scene.duration,
        actors: plan.characters,
        props: plan.props,
        events,
      },
      formatFor(plan.aspectRatio),
    );
    p.name = `${plan.title} — ${scene.title}`;
    for(const {time,command} of fightCommands){
      if(command.type==="PLAY_FIGHT_MOVE"){
        const move=fightMoves.find(m=>m.id===command.moveId);if(move)p=insertSpecialMove(p,move,command.attacker,time,command.target);
      }else p=buildFight(p,command.attacker,command.defender,time,{duration:command.duration,style:command.style,intensity:command.intensity,specials:true,grapples:true,aerial:true,projectiles:true,autoCamera:true,winner:command.winner,seed:command.seed??plan.seed,packageId:command.packageId});
    }
    for (const command of poseCommands) {
      const source = structuredClone(poses[command.pose]),
        origin = poseAt(p.tracks[command.actor], command.time).root,
        dx = origin.x - source.root.x,
        dy = origin.y - source.root.y;
      for (const point of Object.values(source)) {
        point.x += dx;
        point.y += dy;
      }
      p.tracks[command.actor].push({
        id: uid(),
        time: command.time,
        pose: source,
        easing: "ease-in-out",
      });
      p.tracks[command.actor].sort((a, b) => a.time - b.time);
    }
    for (const { time, command } of camera) {
      if (command.type === "CAMERA_MOVE" || command.type === "CAMERA_ZOOM") {
        const last = p.camera.at(-1)!;
        p.camera.push({
          ...last,
          id: uid(),
          time: Math.min(scene.duration, time + command.duration),
          x: command.x ?? last.x,
          y: command.y ?? last.y,
          zoom: command.zoom ?? last.zoom,
        });
      } else if (command.type === "CAMERA_SHAKE")
        p.effects.push({
          id: uid(),
          time,
          duration: command.duration,
          type: "shake",
          x: p.format.width / 2,
          y: p.format.height / 2,
          strength: command.strength,
        });
      else if (command.type === "ADD_EFFECT")
        p.effects.push({
          id: uid(),
          time,
          duration: 0.35,
          type: command.effect,
          x: command.x ?? p.format.width / 2,
          y: command.y ?? p.format.height / 2,
          strength: command.strength ?? 1,
        });
      else if (command.type === "APPLY_CINEMATIC") {
        const preset = cinematicPresets.find((x) => x.id === command.preset);
        if (preset) Object.assign(p, applyCinematic(p, preset, time));
      }
    }
    documents[scene.id] = sceneDoc(p);
  }
  const first = plan.scenes[0],
    base = compileScenarioV2(
      {
        duration: first.duration,
        actors: plan.characters,
        props: plan.props,
        events: [],
      },
      formatFor(plan.aspectRatio),
    );
  Object.assign(base, structuredClone(documents[first.id]));
  base.name = plan.title;
  base.director = {
    plan,
    activeSceneId: first.id,
    sceneDocuments: documents,
    seed: plan.seed,
    locks: {
      shots: plan.scenes.flatMap((s) =>
        s.shots.filter((x) => x.locked).map((x) => x.id),
      ),
    },
  };
  return base;
}

export function planStory(request: StoryRequest): ProjectPlan {
  const text = request.prompt.toLowerCase(),
    fight = /fight|punch|kick|fighter|confront/.test(text),
    cafe = /cafe|coffee|chair|drink/.test(text),
    characters = [
      { id: "a", name: "Actor A" },
      { id: "b", name: "Actor B" },
    ],
    props = cafe
      ? [
          { id: "chair", type: "chair" as const, name: "Chair" },
          { id: "coffee", type: "cup" as const, name: "Coffee" },
        ]
      : [];
  let scenes: ScenePlan[];
  if (fight && request.targetDuration <= 30)
    scenes = [
      {
        id: "scene_fight",
        title: "Fight Beat",
        duration: request.targetDuration,
        location: "simple stage",
        characters: ["a", "b"],
        props: [],
        objective: "Enter, exchange attacks, establish winner",
        shots: [
          {
            id: "fight_01",
            duration: 3,
            description: "Fighters enter and approach",
            commands: [
              { type: "ACTOR_MOVE", time: 0, actor: "a", action: "walk" },
              { type: "ACTOR_MOVE", time: 0.2, actor: "b", action: "walk" },
              {
                type: "PLAY_ACTION",
                time: 2,
                actor: "a",
                action: "fight_stance",
              },
            ],
          },
          {
            id: "fight_02",
            duration: 3,
            description: "Punch and dodge",
            commands: [
              {
                type: "PLAY_ACTION",
                time: 0.2,
                actor: "a",
                action: "straight_punch",
              },
              {
                type: "PLAY_ACTION",
                time: 0.35,
                actor: "b",
                action: "step_back",
              },
            ],
          },
          {
            id: "fight_03",
            duration: Math.max(2, request.targetDuration - 6),
            description: "Counter kick, fall and impact framing",
            commands: [
              {
                type: "PLAY_ACTION",
                time: 0.2,
                actor: "b",
                action: "high_kick",
              },
              { type: "PLAY_ACTION", time: 0.65, actor: "a", action: "sit" },
              { type: "CAMERA_ZOOM", time: 0.2, duration: 0.8, zoom: 1.08 },
              { type: "CAMERA_SHAKE", time: 0.55, duration: 0.25, strength: 5 },
            ],
          },
        ],
      },
    ];
  else if (cafe)
    scenes = [
      {
        id: "scene_cafe",
        title: "Cafe Visit",
        duration: request.targetDuration,
        location: "cafe (semantic; simple background)",
        characters: ["a", "b"],
        props: ["chair", "coffee"],
        objective: "Enter, sit, drink, notice and stand",
        shots: [
          {
            id: "cafe_01",
            duration: request.targetDuration * 0.35,
            description: "Walk to chair",
            commands: [
              { type: "ACTOR_MOVE", time: 0, actor: "a", action: "walk" },
              {
                type: "PLAY_ACTION",
                time: Math.max(0.5, request.targetDuration * 0.25),
                actor: "a",
                action: "sit_down",
              },
            ],
          },
          {
            id: "cafe_02",
            duration: request.targetDuration * 0.4,
            description: "Drink and look",
            commands: [
              {
                type: "ATTACH_PROP",
                time: 0,
                actor: "a",
                prop: "coffee",
                action: "drink",
              },
              { type: "PLAY_ACTION", time: 0.3, actor: "a", action: "drink" },
              {
                type: "PLAY_ACTION",
                time: Math.max(1, request.targetDuration * 0.25),
                actor: "a",
                action: "think",
              },
            ],
          },
          {
            id: "cafe_03",
            duration: request.targetDuration * 0.25,
            description: "Stand",
            commands: [
              {
                type: "PLAY_ACTION",
                time: 0.2,
                actor: "a",
                action: "stand_up",
              },
            ],
          },
        ],
      },
    ];
  else {
    const sentences = request.prompt
        .split(/[.!?]+/)
        .map((x) => x.trim())
        .filter(Boolean),
      count = Math.max(1, Math.min(20, sentences.length)),
      duration = request.targetDuration / count;
    scenes = Array.from({ length: count }, (_, i) => ({
      id: `scene_${String(i + 1).padStart(2, "0")}`,
      title: sentences[i] ?? `Scene ${i + 1}`,
      duration,
      location: "simple stage",
      characters: ["a", "b"],
      props: [],
      objective: sentences[i] ?? "Story beat",
      shots: [
        {
          id: `scene_${i + 1}_shot_01`,
          duration,
          description: sentences[i] ?? "Story beat",
          commands: [{ type: "WAIT", time: 0, duration }],
        },
      ],
    }));
  }
  return {
    version: 1,
    id: `plan_${request.seed ?? 1}`,
    title: fight ? "Auto Fight" : cafe ? "Cafe Story" : "Auto Directed Story",
    targetDuration: request.targetDuration,
    aspectRatio: request.aspectRatio,
    style: "simple",
    seed: request.seed ?? 1,
    characters,
    props,
    scenes,
  };
}

/** A plan-only load fixture: 12 scenes, 60 shots and 240 semantic commands.
 * It verifies five-minute structure without inflating every scene into live UI state. */
export function createFiveMinuteStructureTest(): ProjectPlan {
  const scenes: ScenePlan[] = Array.from({ length: 12 }, (_, sceneIndex) => ({
    id: `long_scene_${String(sceneIndex + 1).padStart(2, "0")}`,
    title: `Sequence ${sceneIndex + 1}`,
    duration: 25,
    location: "simple stage",
    characters: ["a", "b"],
    props: [],
    objective: "Long-form structural capacity test",
    shots: Array.from({ length: 5 }, (_, shotIndex) => ({
      id: `long_scene_${String(sceneIndex + 1).padStart(2, "0")}_shot_${shotIndex + 1}`,
      duration: 5,
      description: `Beat ${shotIndex + 1}`,
      commands: Array.from({ length: 4 }, (_, commandIndex) => ({
        type: "WAIT" as const,
        time: commandIndex * 1.25,
        duration: 1.25,
      })),
    })),
  }));
  return {
    version: 1,
    id: "plan_5m_structure",
    title: "Five Minute Structure Test",
    targetDuration: 300,
    aspectRatio: "16:9",
    style: "simple",
    seed: 500,
    characters: [
      { id: "a", name: "Actor A" },
      { id: "b", name: "Actor B" },
    ],
    props: [],
    scenes,
  };
}
