import { poseAt, uid } from "./animation";
import type {
  CombatFxSettings,
  Effect,
  EffectType,
  JointName,
  Project,
} from "./types";
import { swordPropId } from "./meleeCombat";

export type FxCategory =
  "Trails" | "Impact" | "Elemental" | "Hit Particles" | "Afterimage" | "Clash";
export interface CombatFxPreset {
  id: string;
  name: string;
  category: FxCategory;
  type: EffectType;
  duration: number;
  strength: number;
  joint?: JointName;
  trackedPoint?: Effect["trackedPoint"];
  width?: number;
  sampleCount?: number;
  minimumVelocity?: number;
  maximumTrailAge?: number;
  opacity?: number;
  glow?: number;
  color?: string;
  description: string;
}
const trail = (
  id: string,
  name: string,
  strength: number,
  width: number,
  color: string,
  description: string,
  extra: Partial<CombatFxPreset> = {},
): CombatFxPreset => ({
  id,
  name,
  category: "Trails",
  type: "motionTrail",
  duration: 0.48,
  strength,
  width,
  color,
  glow: 18,
  sampleCount: 14,
  minimumVelocity: 7,
  maximumTrailAge: 0.34,
  opacity: 0.9,
  joint: "rightWrist",
  trackedPoint: "weapon",
  description,
  ...extra,
});
export const combatFxPresets: CombatFxPreset[] = [
  trail(
    "classic_slash",
    "Classic Slash",
    0.75,
    30,
    "#f8fbff",
    "Clean velocity-aware blade arc.",
  ),
  trail(
    "wide_white_arc",
    "Wide White Arc",
    1.15,
    58,
    "#ffffff",
    "Broad luminous crescent for readable fast sword swings.",
    { sampleCount: 18, minimumVelocity: 5, glow: 28 },
  ),
  trail(
    "sharp_blade",
    "Sharp Blade Trail",
    0.8,
    18,
    "#eaf5ff",
    "Short crisp blade ribbon.",
    { duration: 0.28, sampleCount: 9, minimumVelocity: 9 },
  ),
  trail(
    "heavy_slash",
    "Heavy Slash",
    1.25,
    68,
    "#fff4d6",
    "Thick heavy weapon arc.",
    { duration: 0.62, minimumVelocity: 4 },
  ),
  trail(
    "speed_slash",
    "Speed Slash",
    1,
    24,
    "#d8f5ff",
    "Long fast tapered streak.",
    { sampleCount: 20, maximumTrailAge: 0.25 },
  ),
  trail(
    "thrust_trail",
    "Thrust Trail",
    0.85,
    16,
    "#ffffff",
    "Narrow directionally aligned thrust trail.",
    { trackedPoint: "projectile", sampleCount: 12 },
  ),
  trail(
    "staff_trail",
    "Staff Motion Trail",
    0.8,
    34,
    "#f3e5b5",
    "Long staff sweep.",
    { sampleCount: 18 },
  ),
  trail(
    "energy_slash",
    "Energy Slash",
    1.2,
    52,
    "#4de8ff",
    "Bright cyan energy ribbon.",
    { category: "Elemental", glow: 32 },
  ),
  trail(
    "fire_slash",
    "Fire Slash",
    1.2,
    55,
    "#ff7a2f",
    "Hot orange elemental slash.",
    { category: "Elemental", glow: 30 },
  ),
  trail(
    "ice_slash",
    "Ice Slash",
    1.05,
    48,
    "#8deaff",
    "Cold crystalline trail.",
    { category: "Elemental", glow: 26 },
  ),
  trail(
    "electric_slash",
    "Electric Slash",
    1.15,
    34,
    "#d6a8ff",
    "Sharp electric trail.",
    { category: "Elemental", sampleCount: 16 },
  ),
  trail(
    "shadow_slash",
    "Shadow Slash",
    1.05,
    50,
    "#8b5cf6",
    "Dark violet shadow arc.",
    { category: "Elemental" },
  ),
  trail(
    "anime_slash",
    "Anime Slash",
    1.35,
    72,
    "#ffffff",
    "Large high-contrast arcade crescent.",
    { glow: 36 },
  ),
  trail(
    "foot_trail",
    "Foot Trail",
    0.72,
    30,
    "#b7e3ff",
    "Kick and spin-kick arc.",
    { joint: "rightAnkle", trackedPoint: "foot", minimumVelocity: 6 },
  ),
  trail(
    "fist_trail",
    "Fist Trail",
    0.55,
    18,
    "#d9efff",
    "Subtle punch streak.",
    {
      joint: "rightWrist",
      trackedPoint: "fist",
      duration: 0.3,
      minimumVelocity: 8,
    },
  ),
  {
    id: "afterimage",
    name: "Dash Afterimage",
    category: "Afterimage",
    type: "afterimage",
    duration: 0.52,
    strength: 0.7,
    opacity: 0.42,
    sampleCount: 4,
    trackedPoint: "body",
    description: "Bounded fading actor silhouettes.",
  },
  {
    id: "small_flash",
    name: "Small Impact Flash",
    category: "Impact",
    type: "flash",
    duration: 0.16,
    strength: 0.45,
    description: "Compact contact flash.",
  },
  {
    id: "medium_flash",
    name: "Medium Impact Flash",
    category: "Impact",
    type: "flash",
    duration: 0.22,
    strength: 0.75,
    description: "Readable normal contact flash.",
  },
  {
    id: "heavy_flash",
    name: "Heavy Impact Flash",
    category: "Impact",
    type: "flash",
    duration: 0.3,
    strength: 1.2,
    description: "Large strong-hit flash.",
  },
  {
    id: "spark_burst",
    name: "Spark Burst",
    category: "Impact",
    type: "sparks",
    duration: 0.28,
    strength: 0.8,
    description: "Directional contact sparks.",
  },
  {
    id: "impact_ring",
    name: "Impact Ring",
    category: "Impact",
    type: "shockwave",
    duration: 0.4,
    strength: 0.75,
    description: "Expanding contact ring.",
  },
  {
    id: "ground_impact",
    name: "Ground Impact",
    category: "Impact",
    type: "dust",
    duration: 0.55,
    strength: 1,
    description: "Dusty ground contact.",
  },
  {
    id: "weapon_clash",
    name: "Weapon Clash",
    category: "Clash",
    type: "clash",
    duration: 0.25,
    strength: 1,
    description: "Flash, sparks and compact clash response.",
  },
  {
    id: "heavy_clash",
    name: "Heavy Clash",
    category: "Clash",
    type: "clash",
    duration: 0.38,
    strength: 1.35,
    description: "Strong weapon clash response.",
  },
  {
    id: "small_red_hit",
    name: "Small Red Hit",
    category: "Hit Particles",
    type: "hitParticles",
    duration: 0.25,
    strength: 0.45,
    color: "#eb2d41",
    description: "Small abstract directional red streaks.",
  },
  {
    id: "medium_red_hit",
    name: "Medium Red Hit",
    category: "Hit Particles",
    type: "hitParticles",
    duration: 0.4,
    strength: 0.75,
    color: "#eb2d41",
    description: "Medium stylized directional particles.",
  },
  {
    id: "large_red_hit",
    name: "Large Red Hit",
    category: "Hit Particles",
    type: "hitParticles",
    duration: 0.6,
    strength: 1.1,
    color: "#eb2d41",
    description: "Large brief arcade particle burst.",
  },
];
export const defaultCombatFxSettings: CombatFxSettings = {
  intensity: "MEDIUM",
  hitParticles: false,
  autoWeaponTrail: true,
};
export const fxPreset = (id?: string) =>
  combatFxPresets.find((p) => p.id === id);
const intensityScale = (settings: CombatFxSettings) =>
  ({ OFF: 0, LOW: 0.55, MEDIUM: 1, HIGH: 1.25, ARCADE: 1.6 })[
    settings.intensity
  ];
export function makeCombatEffect(
  project: Project,
  preset: CombatFxPreset,
  actor: string,
  time: number,
  point?: { x: number; y: number },
  direction = { x: 1, y: 0 },
): Effect | null {
  const settings = project.combatFx ?? defaultCombatFxSettings;
  if (settings.intensity === "OFF") return null;
  if (preset.type === "hitParticles" && !settings.hitParticles) return null;
  const pose = project.tracks[actor]
      ? poseAt(project.tracks[actor], time)
      : undefined,
    q = point ??
      pose?.[preset.joint ?? "root"] ?? {
        x: project.format.width / 2,
        y: project.format.height / 2,
      };
  return {
    id: uid(),
    time,
    duration: preset.duration,
    type: preset.type,
    x: q.x,
    y: q.y,
    strength: preset.strength * intensityScale(settings),
    targetFighter: actor,
    preset: preset.id,
    trackedJoint: preset.joint,
    trackedProp: preset.trackedPoint === "weapon" && project.props?.some(p=>p.id===swordPropId(actor)) ? swordPropId(actor) : undefined,
    trackedPoint: preset.trackedPoint,
    directionX: direction.x,
    directionY: direction.y,
    width: preset.width,
    sampleCount: preset.sampleCount,
    minimumVelocity: preset.minimumVelocity,
    maximumTrailAge: preset.maximumTrailAge,
    opacity: preset.opacity,
    glow: preset.glow,
    color: preset.color,
    autoTrail: settings.autoWeaponTrail,
  };
}
export function addCombatFx(
  project: Project,
  preset: CombatFxPreset,
  actor: string,
  time: number,
) {
  const next = structuredClone(project),
    effect = makeCombatEffect(next, preset, actor, time);
  if (effect) next.effects.push(effect);
  return next;
}
export function addContactFx(
  project: Project,
  actor: string,
  target: string,
  time: number,
  impact: "NORMAL" | "STRONG" | "SPECIAL" | "FINISH",
  options: {
    trail?: string;
    impact?: string;
    particles?: string;
    afterimage?: string;
  } = {},
) {
  const next = structuredClone(project),
    a = poseAt(next.tracks[actor], time),
    b = poseAt(next.tracks[target], time),
    dx = b.root.x - a.root.x,
    mag = Math.max(1, Math.abs(dx)),
    direction = { x: dx / mag, y: 0 },
    point = {
      x: (a.rightWrist.x + b.torso.x) / 2,
      y: (a.rightWrist.y + b.torso.y) / 2,
    };
  const ids = [
    options.trail,
    options.impact ??
      (impact === "NORMAL"
        ? "small_flash"
        : impact === "STRONG"
          ? "medium_flash"
          : "heavy_flash"),
    options.particles,
    options.afterimage,
  ].filter(Boolean) as string[];
  for (const id of ids) {
    const preset = fxPreset(id),
      effect =
        preset && makeCombatEffect(next, preset, actor, time, point, direction);
    if (effect) next.effects.push(effect);
  }
  return next;
}
