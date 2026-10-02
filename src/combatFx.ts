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
  "Trails" | "Impact" | "Elemental" | "Hit Particles" | "Blood" | "Afterimage" | "Clash" | "Aura / Power";
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
  secondaryColor?: string;
  bloodLevel?: "LOW"|"MEDIUM"|"HIGH";
  arcDegrees?: number;
  scatterRadius?: number;
  auraStyle?: Effect["auraStyle"];
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
  trail("ink_crescent_slash","Ink Crescent Slash",1.55,112,"#ffffff","Huge white sword crescent with a dark ink-like outer edge for cinematic finishing cuts.",{duration:.72,sampleCount:22,minimumVelocity:3,maximumTrailAge:.46,glow:16,secondaryColor:"#111018"}),
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
  {id:"blood_spray_low",name:"Blood Spray — Low",category:"Blood",type:"blood",duration:.34,strength:.5,color:"#a80f27",bloodLevel:"LOW",description:"Small directional blood spray for restrained hit reactions."},
  {id:"blood_spray_medium",name:"Blood Spray — Medium",category:"Blood",type:"blood",duration:.48,strength:.78,color:"#a80f27",bloodLevel:"MEDIUM",description:"Readable directional blood spray for strong contact."},
  {id:"blood_spray_high",name:"Blood Spray — High",category:"Blood",type:"blood",duration:.62,strength:1.12,color:"#910b20",bloodLevel:"HIGH",description:"Large cinematic blood spray for heavy or sword impacts."},
  {id:"flame_aura",name:"Flame Body Aura",category:"Aura / Power",type:"aura",duration:1.2,strength:1,color:"#ffb23f",secondaryColor:"#ff4d35",auraStyle:"flame",arcDegrees:360,scatterRadius:18,description:"Animated flame shell surrounding the fighter."},
  {id:"spike_aura",name:"Explosive Spike Aura",category:"Aura / Power",type:"aura",duration:1.1,strength:1.15,color:"#ffe66d",secondaryColor:"#ff6b35",auraStyle:"spike",arcDegrees:360,scatterRadius:26,description:"Large jagged power-up silhouette."},
  {id:"palm_burst",name:"Palm Energy Burst",category:"Aura / Power",type:"aura",duration:.65,strength:.75,color:"#fff3a6",secondaryColor:"#ff8a3d",auraStyle:"palm",arcDegrees:75,scatterRadius:10,description:"Focused impact energy around a hand or contact point."},
  {id:"spiral_vortex",name:"Spiral Vortex",category:"Aura / Power",type:"aura",duration:1.1,strength:1,color:"#d9f6ff",secondaryColor:"#69d7ff",auraStyle:"vortex",arcDegrees:300,scatterRadius:24,description:"Rotating spiral with scattered energy chips."},
  {id:"ring_guard",name:"Circular Guard",category:"Aura / Power",type:"aura",duration:1,strength:1,color:"#a7f3ff",secondaryColor:"#ffffff",auraStyle:"ring",arcDegrees:300,scatterRadius:8,description:"Adjustable circular defense or attack arc."},
  {id:"dragon_power",name:"Dragon Power Aura",category:"Aura / Power",type:"aura",duration:1.35,strength:1.25,color:"#c084fc",secondaryColor:"#ff5d86",auraStyle:"dragon",arcDegrees:270,scatterRadius:28,description:"Tall supernatural aura for ultimate attacks."},
  {id:"speed_aura",name:"Speed Charge Aura",category:"Aura / Power",type:"aura",duration:.9,strength:1,color:"#91f2ff",secondaryColor:"#ffffff",auraStyle:"speed",arcDegrees:170,scatterRadius:18,description:"Directional charge streaks behind a fighter."},
  {id:"wing_burst",name:"Wing Energy Burst",category:"Aura / Power",type:"aura",duration:.8,strength:1,color:"#b8f7ff",secondaryColor:"#fff",auraStyle:"wings",arcDegrees:150,scatterRadius:22,description:"Symmetrical back-facing energy wings."},
  {id:"force_fan",name:"Force Fan",category:"Aura / Power",type:"aura",duration:.7,strength:.9,color:"#a7f3ff",secondaryColor:"#60a5fa",auraStyle:"force",arcDegrees:95,scatterRadius:12,description:"Wide directional force emission."},
  {id:"shard_burst",name:"Shard Burst",category:"Aura / Power",type:"aura",duration:.75,strength:.9,color:"#dbeafe",secondaryColor:"#7dd3fc",auraStyle:"shards",arcDegrees:240,scatterRadius:35,description:"Scattered supernatural shards around the body."},
  {id:"lightning_body",name:"Lightning Body",category:"Aura / Power",type:"aura",duration:1.1,strength:1,color:"#fef08a",secondaryColor:"#38bdf8",auraStyle:"lightning",arcDegrees:360,scatterRadius:25,description:"Animated lightning branches around the whole body."},
];
export const defaultCombatFxSettings: CombatFxSettings = {
  intensity: "MEDIUM",
  hitParticles: false,
  autoWeaponTrail: true,
  blood: "OFF",
  bloodSpread: 55,
  bloodAmount: 10,
  bloodDistance: 100,
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
  actor: string | undefined,
  time: number,
  point?: { x: number; y: number },
  direction = { x: 1, y: 0 },
): Effect | null {
  const settings = project.combatFx ?? defaultCombatFxSettings;
  if (settings.intensity === "OFF") return null;
  if (preset.type === "hitParticles" && !settings.hitParticles) return null;
  const pose = actor&&project.tracks[actor]
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
    trackedProp: actor&&preset.trackedPoint === "weapon" && project.props?.some(p=>p.id===swordPropId(actor)) ? swordPropId(actor) : undefined,
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
    secondaryColor:preset.secondaryColor,
    bloodLevel:preset.bloodLevel,
    arcDegrees:preset.arcDegrees,
    scatterRadius:preset.scatterRadius,
    auraStyle:preset.auraStyle,
    particleSpread:preset.type==="blood"?(settings.bloodSpread??55)*Math.PI/180:undefined,
    particleCount:preset.type==="blood"?(settings.bloodAmount??10):undefined,
    particleSpeed:preset.type==="blood"?(settings.bloodDistance??100)/100:undefined,
    autoTrail: settings.autoWeaponTrail,
  };
}
export function addCombatFx(
  project: Project,
  preset: CombatFxPreset,
  actor: string | undefined,
  time: number,
  point?: {x:number;y:number},
) {
  const next = structuredClone(project),
    effect = makeCombatEffect(next, preset, actor, time, point);
  if (effect) {next.effects.push(effect);next.duration=Math.max(next.duration,time+effect.duration);}
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
    contact?: {endpoint?:string;target?:string};
    blood?: "INHERIT" | CombatFxSettings["blood"];
  } = {},
) {
  const next = structuredClone(project),
    a = poseAt(next.tracks[actor], time),
    b = poseAt(next.tracks[target], time),
    dx = b.root.x - a.root.x,
    mag = Math.max(1, Math.abs(dx)),
    direction = { x: dx / mag, y: 0 },
    endpoint=(options.contact?.endpoint&&a[options.contact.endpoint as keyof typeof a])||a.rightWrist,
    targetName=options.contact?.target,
    targetPoint=targetName==="head"||targetName==="chin"?b.head:targetName==="leg"?{x:(b.leftKnee.x+b.rightKnee.x)/2,y:(b.leftKnee.y+b.rightKnee.y)/2}:targetName==="upperTorso"?{x:(b.neck.x+b.torso.x)/2,y:(b.neck.y+b.torso.y)/2}:b.torso,
    point = {x:targetPoint.x,y:targetPoint.y};
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
  const configured=options.blood==="INHERIT"||!options.blood
      ?(next.combatFx?.blood??defaultCombatFxSettings.blood)
      :options.blood;
  if(configured!=="OFF"){
    const vertical=Math.max(-.65,Math.min(.65,(targetPoint.y-endpoint.y)/120)),
      scale=({LOW:.45,MEDIUM:.75,HIGH:1.1} as const)[configured];
    next.effects.push({id:uid(),time,duration:configured==="HIGH"?.62:configured==="MEDIUM"?.48:.34,type:"blood",x:point.x,y:point.y,strength:scale,targetFighter:target,directionX:direction.x,directionY:vertical,color:"#a80f27",layer:"front",bloodLevel:configured,particleSpread:(next.combatFx?.bloodSpread??55)*Math.PI/180,particleCount:next.combatFx?.bloodAmount??10,particleSpeed:(next.combatFx?.bloodDistance??100)/100});
  }
  return next;
}
