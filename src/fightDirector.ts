import { insertSpecialMove, specialMoves } from "./specialMoves";
import type { CombatType, Project, SpecialMove, WeaponHand } from "./types";
import { applyCinematic, cinematicPresets } from "./cinematicTiming";
import { addCombatFx, addContactFx, fxPreset } from "./combatFx";
import { clonePose, poseAt, uid } from "./animation";
import { ensureSword, swordMoves } from "./meleeCombat";
import { poses } from "./poses";

export type FightCategory =
  | "Basic"
  | "Defense"
  | "Reaction"
  | "Combo"
  | "Grapple"
  | "Aerial"
  | "Acrobatic"
  | "Projectile"
  | "Teleport"
  | "Elemental"
  | "Fantasy / Supernatural"
  | "Special"
  | "Cinematic"
  | "Finisher";
  
export interface FightMoveDefinition extends SpecialMove {
  participants: 1 | 2;
  category: FightCategory;
  tags: string[];
  range: "Close" | "Mid" | "Long";
  contactTime: number;
  packages: string[];
  importance: "NORMAL" | "STRONG" | "SPECIAL" | "FINISH";
  cinematicPreset?: string;
  cooldown?: number;
  weaponFXPreset?: string;
  impactFXPreset?: string;
  hitParticlePreset?: string;
  afterimagePreset?: string;
  phases?: Partial<Record<FightPhase, number>>;
  contact?: { endpoint: "leftWrist"|"rightWrist"|"leftAnkle"|"rightAnkle"|"weapon"; target: "head"|"upperTorso"|"body"|"chin"|"leg"; desiredRootDistance: number; minimumRootSeparation?: number };
}
export type FightPhase = "READY"|"ANTICIPATION"|"COMMIT"|"CONTACT"|"OVERSHOOT"|"FOLLOW_THROUGH"|"RECOVERY";
export type FightExecutionMode = "ATTACKER_ONLY" | "ATTACK_REACTION";
const move = (
  id: string,
  name: string,
  category: FightCategory,
  duration: number,
  events: SpecialMove["events"],
  range: FightMoveDefinition["range"] = "Close",
  tags: string[] = [],
  participants: 1 | 2 = 2,
): FightMoveDefinition => {
  const importance =
    category === "Finisher"
      ? "FINISH"
      : ["Special", "Elemental", "Teleport", "Projectile", "Fantasy / Supernatural"].includes(category)
        ? "SPECIAL"
        : ["Combo", "Aerial", "Acrobatic", "Grapple"].includes(category)
          ? "STRONG"
          : "NORMAL";
  return {
    id,
    name,
    category,
    duration,
    description: `Coordinated ${name} fight event.`,
    events,
    tags,
    participants,
    range,
    contactTime:
      events.find((e) => e.type === "impact")?.time ?? duration * 0.55,
    packages: ["Basic Human", category],
    importance,
    cooldown: importance === "SPECIAL" ? 4 : importance === "STRONG" ? 2 : 1,
    cinematicPreset:
      importance === "FINISH"
        ? "final_hit"
        : importance === "SPECIAL"
          ? "special_attack"
          : importance === "STRONG"
            ? "heavy_impact"
            : undefined,
    weaponFXPreset: tags.includes("weapon") ? "wide_white_arc" : undefined,
    impactFXPreset:
      importance === "NORMAL"
        ? "small_flash"
        : importance === "STRONG"
          ? "medium_flash"
          : "heavy_flash",
    hitParticlePreset: importance === "FINISH" ? "medium_red_hit" : undefined,
    afterimagePreset: category === "Teleport" ? "afterimage" : undefined,
  };
};
const hit = (
  action: string,
  impact = 0.38,
  strength = 0.55,
): SpecialMove["events"] => [
  { time: 0, type: "action", action },
  { time: impact, type: "impact", strength },
  {
    time: impact + 0.02,
    type: "moveRoot",
    fighter: "defender",
    x: 55 + strength * 80,
    y: 0,
    duration: 0.3,
  },
  {
    time: impact + 0.4,
    type: "pose",
    fighter: "defender",
    pose: "fight_guard",
  },
];
export const fightMoves: FightMoveDefinition[] = [
  {...move("jab","Jab","Basic",.72,[
    {time:0,type:"pose",pose:"jab_ready",easing:"ease-in"},{time:.12,type:"pose",pose:"jab_anticipation_v1",easing:"ease-in"},{time:.25,type:"pose",pose:"jab_commit",easing:"ease-in"},
    {time:.31,type:"pose",pose:"jab_contact",easing:"snap"},{time:.31,type:"impact",strength:.42},{time:.31,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},
    {time:.37,type:"pose",pose:"jab_overshoot",easing:"ease-out"},{time:.39,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out"},{time:.51,type:"pose",fighter:"defender",pose:"head_hit_recoil",easing:"ease-out"},
    {time:.56,type:"pose",pose:"jab_recover",easing:"ease-in-out"},{time:.7,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"}
  ]),phases:{READY:0,ANTICIPATION:.12,COMMIT:.25,CONTACT:.31,OVERSHOOT:.37,FOLLOW_THROUGH:.43,RECOVERY:.56},contact:{endpoint:"leftWrist",target:"head",desiredRootDistance:205,minimumRootSeparation:132}},
  {...move("cross","Cross","Basic",.85,[
    {time:0,type:"pose",pose:"fight_guard",easing:"ease-in"},{time:.16,type:"pose",pose:"straight_punch_anticipation",easing:"ease-in"},
    {time:.36,type:"pose",pose:"straight_punch_extension",easing:"snap"},{time:.36,type:"impact",strength:.55},{time:.36,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},
    {time:.44,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out"},{time:.5,type:"pose",pose:"jab_overshoot",easing:"ease-out"},
    {time:.62,type:"pose",fighter:"defender",pose:"head_hit_recoil",easing:"ease-out"},{time:.7,type:"pose",pose:"fight_guard",easing:"ease-in-out"},{time:.82,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"}
  ]),phases:{READY:0,ANTICIPATION:.16,COMMIT:.28,CONTACT:.36,OVERSHOOT:.5,FOLLOW_THROUGH:.62,RECOVERY:.7},contact:{endpoint:"rightWrist",target:"head",desiredRootDistance:180,minimumRootSeparation:145}},
  {...move("hook","Hook","Basic",.94,[
    {time:0,type:"pose",pose:"hook_ready"},{time:.18,type:"pose",pose:"hook_windup",easing:"ease-in"},{time:.34,type:"pose",pose:"hook_commit",easing:"ease-in"},
    {time:.43,type:"pose",pose:"hook_contact_v1",easing:"snap"},{time:.43,type:"impact",strength:.68},{time:.43,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},
    {time:.5,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out"},{time:.56,type:"pose",pose:"hook_follow",easing:"ease-out"},{time:.63,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-out"},
    {time:.77,type:"pose",pose:"hook_recover",easing:"ease-in-out"},{time:.9,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"}
  ]),phases:{READY:0,ANTICIPATION:.18,COMMIT:.34,CONTACT:.43,OVERSHOOT:.5,FOLLOW_THROUGH:.56,RECOVERY:.77},contact:{endpoint:"rightWrist",target:"head",desiredRootDistance:184,minimumRootSeparation:128}},
  {...move("uppercut","Uppercut","Basic",1.02,[
    {time:0,type:"pose",pose:"uppercut_ready"},{time:.2,type:"pose",pose:"uppercut_compress",easing:"ease-in"},{time:.36,type:"pose",pose:"uppercut_drive",easing:"ease-in"},
    {time:.46,type:"pose",pose:"uppercut_contact_v1",easing:"snap"},{time:.46,type:"impact",strength:.78},{time:.46,type:"pose",fighter:"defender",pose:"uppercut_hit_contact",easing:"snap"},
    {time:.54,type:"pose",pose:"uppercut_follow",easing:"ease-out"},{time:.55,type:"pose",fighter:"defender",pose:"uppercut_head_lag",easing:"ease-out"},{time:.7,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-out"},
    {time:.82,type:"pose",pose:"uppercut_recover",easing:"ease-in-out"},{time:.98,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"}
  ]),phases:{READY:0,ANTICIPATION:.2,COMMIT:.36,CONTACT:.46,OVERSHOOT:.54,FOLLOW_THROUGH:.64,RECOVERY:.82},contact:{endpoint:"rightWrist",target:"chin",desiredRootDistance:170,minimumRootSeparation:126}},
  {...move("roundhouse","Roundhouse","Basic",1.2,[
    {time:0,type:"pose",pose:"roundhouse_ready"},{time:.2,type:"pose",pose:"roundhouse_prepare",easing:"ease-in"},{time:.39,type:"pose",pose:"roundhouse_chamber_v1",easing:"ease-in"},
    {time:.56,type:"pose",pose:"roundhouse_contact_v1",easing:"snap"},{time:.56,type:"impact",strength:.85},{time:.56,type:"pose",fighter:"defender",pose:"heavy_kick_contact",easing:"snap"},
    {time:.64,type:"pose",pose:"roundhouse_follow",easing:"ease-out"},{time:.65,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out"},{time:.73,type:"moveRoot",fighter:"defender",x:72,duration:.2,easing:"ease-out"},
    {time:.82,type:"pose",pose:"roundhouse_retract",easing:"ease-in-out"},{time:.86,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-out"},{time:1.02,type:"pose",fighter:"defender",pose:"stagger_back_2",easing:"ease-in-out"},
    {time:1.08,type:"pose",pose:"roundhouse_recover",easing:"ease-in-out"},{time:1.18,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"}
  ],"Mid"),phases:{READY:0,ANTICIPATION:.2,COMMIT:.39,CONTACT:.56,OVERSHOOT:.64,FOLLOW_THROUGH:.72,RECOVERY:1.08},contact:{endpoint:"rightAnkle",target:"upperTorso",desiredRootDistance:226,minimumRootSeparation:145}},
  {...move("sweep","Sweep","Basic",1.1,[
    {time:0,type:"pose",pose:"sweep_anticipation",easing:"ease-in"},{time:.26,type:"pose",pose:"sweep_mid",easing:"ease-in"},
    {time:.48,type:"pose",pose:"sweep_extension",easing:"snap"},{time:.48,type:"impact",strength:.72},{time:.48,type:"pose",fighter:"defender",pose:"fall_side_start",easing:"snap"},
    {time:.55,type:"rotation",fighter:"defender",rotation:82,duration:.3},{time:.62,type:"moveRoot",fighter:"defender",x:65,y:70,duration:.28,easing:"ease-in"},
    {time:.78,type:"pose",fighter:"defender",pose:"fall_side_ground",easing:"ease-in"},{time:.82,type:"pose",pose:"fight_guard",easing:"ease-in-out"}
  ]),phases:{READY:0,ANTICIPATION:.12,COMMIT:.26,CONTACT:.48,OVERSHOOT:.55,FOLLOW_THROUGH:.72,RECOVERY:.82},contact:{endpoint:"rightAnkle",target:"leg",desiredRootDistance:185,minimumRootSeparation:150}},
  {...move("high_block","High Block","Defense",.72,[{time:0,type:"pose",pose:"fight_guard",easing:"ease-in"},{time:.12,type:"pose",pose:"block_high",easing:"snap"},{time:.46,type:"pose",pose:"block_high",easing:"hold"},{time:.58,type:"pose",pose:"fight_guard",easing:"ease-out"}],"Close",["block","head"],1),phases:{READY:0,ANTICIPATION:.12,COMMIT:.12,CONTACT:.24,FOLLOW_THROUGH:.46,RECOVERY:.58}},
  {...move("low_block","Low Block","Defense",.72,[{time:0,type:"pose",pose:"fight_guard",easing:"ease-in"},{time:.12,type:"pose",pose:"block_low",easing:"snap"},{time:.46,type:"pose",pose:"block_low",easing:"hold"},{time:.58,type:"pose",pose:"fight_guard",easing:"ease-out"}],"Close",["block","body"],1),phases:{READY:0,ANTICIPATION:.12,COMMIT:.12,CONTACT:.24,FOLLOW_THROUGH:.46,RECOVERY:.58}},
  {...move("dodge_back","Dodge Back","Defense",.82,[{time:0,type:"pose",pose:"fight_guard",easing:"ease-in"},{time:.12,type:"pose",pose:"dodge_back",easing:"snap"},{time:.14,type:"moveRoot",x:-85,duration:.28,easing:"ease-out"},{time:.5,type:"pose",pose:"combat_recovery",easing:"ease-out"},{time:.7,type:"pose",pose:"fight_guard",easing:"ease-in-out"}],"Close",["dodge"],1),phases:{READY:0,ANTICIPATION:.12,COMMIT:.14,CONTACT:.32,FOLLOW_THROUGH:.5,RECOVERY:.7}},
  move("head_hit", "Head Hit", "Reaction", 0.78, [
    { time: 0, type: "impact", strength: 0.45 },
    {time:0,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},{time:.07,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out"},
    {time:.2,type:"pose",fighter:"defender",pose:"head_hit_recoil",easing:"ease-out"},{time:.42,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-in-out"},
    {time:.74,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"},
  ]),
  move("body_hit", "Body Hit", "Reaction", 0.82, [
    { time: 0, type: "impact", strength: 0.5 },
    {time:0,type:"pose",fighter:"defender",pose:"body_hit_contact",easing:"snap"},{time:.07,type:"pose",fighter:"defender",pose:"body_hit_fold",easing:"ease-out"},
    {time:.16,type:"pose",fighter:"defender",pose:"body_hit_deep_fold",easing:"ease-in-out"},{time:.29,type:"pose",fighter:"defender",pose:"body_hit_arm_lag",easing:"ease-out"},{time:.48,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-in-out"},
    {time:.78,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"},
  ]),
  move("knockback", "Knockback", "Reaction", 1.35, [
    { time: 0, type: "impact", strength: 0.85 },
    {time:0,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap"},{time:.07,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out"},
    {time:.13,type:"moveRoot",fighter:"defender",x:145,y:-12,duration:.38,easing:"ease-out"},{time:.25,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out"},
    {time:.56,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-in"},{time:.72,type:"moveRoot",fighter:"defender",x:58,y:12,duration:.2,easing:"ease-out"},
    {time:.83,type:"pose",fighter:"defender",pose:"stagger_back_2",easing:"ease-out"},{time:1.08,type:"pose",fighter:"defender",pose:"combat_recovery",easing:"ease-in-out"},
    {time:1.32,type:"pose",fighter:"defender",pose:"fight_guard",easing:"ease-in-out"},
  ]),
  move("stagger_back", "Stagger Back", "Reaction", .72, [
    {time:0,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"snap"},
    {time:.28,type:"pose",fighter:"defender",pose:"stagger_back_2",easing:"ease-out"},
    {time:.68,type:"pose",fighter:"defender",pose:"combat_recovery",easing:"ease-in-out"},
  ],"Close",["reaction","stagger"]),
  {...move("fall_get_up","Fall / Get Up","Reaction",1.8,[{time:0,type:"pose",fighter:"defender",pose:"fall_backward_start",easing:"snap"},{time:.38,type:"pose",fighter:"defender",pose:"fall_backward_ground",easing:"ease-in"},{time:.9,type:"pose",fighter:"defender",pose:"ground_recovery_start",easing:"ease-out"},{time:1.25,type:"pose",fighter:"defender",pose:"ground_recovery_mid",easing:"ease-in-out"},{time:1.58,type:"pose",fighter:"defender",pose:"stand_recovery",easing:"ease-out"}],"Close",["reaction"]),phases:{CONTACT:0,OVERSHOOT:.38,FOLLOW_THROUGH:.9,RECOVERY:1.25}},
  {...move("jab_cross_hook", "Jab → Cross → Hook", "Combo", 1.8, [
    { time: 0, type: "action", action: "Straight Punch", scale: 0.55 },
    { time: 0.48, type: "impact", strength: 0.35 },
    { time: 0.48, type: "pose", fighter:"defender", pose:"head_hit_contact", easing:"snap" },
    { time: 0.56, type: "pose", fighter:"defender", pose:"head_hit_snap", easing:"ease-out" },
    { time: 0.58, type: "action", action: "Straight Punch", scale: 0.55 },
    { time: 1, type: "impact", strength: 0.45 },
    { time: 1, type: "pose", fighter:"defender", pose:"body_hit_contact", easing:"snap" },
    { time: 1.06, type: "pose", fighter:"defender", pose:"body_hit_fold", easing:"ease-out" },
    { time: 1.08, type: "action", action: "Hook", scale: 0.65 },
    { time: 1.45, type: "impact", strength: 0.75 },
    { time: 1.45, type: "pose", fighter:"defender", pose:"head_hit_contact", easing:"snap" },
    { time: 1.53, type: "pose", fighter:"defender", pose:"knockback_trailing", easing:"ease-out" },
    {
      time: 1.47,
      type: "launch",
      fighter: "defender",
      x: 130,
      y: -20,
      duration: 0.4,
    },
  ]),contactTime:1.45,phases:{READY:0,ANTICIPATION:.12,COMMIT:1.08,CONTACT:1.45,OVERSHOOT:1.53,FOLLOW_THROUGH:1.62,RECOVERY:1.74},contact:{endpoint:"rightWrist",target:"head",desiredRootDistance:184,minimumRootSeparation:128}},
  {...move("punch_roundhouse", "Punch → Roundhouse", "Combo", 1.55, [
    { time: 0, type: "action", action: "Straight Punch", scale: 0.65 },
    { time: 0.4, type: "impact", strength: 0.4 },
    { time: .4, type:"pose", fighter:"defender", pose:"head_hit_contact", easing:"snap" },
    { time: .5, type:"pose", fighter:"defender", pose:"head_hit_recoil", easing:"ease-out" },
    { time: 0.65, type: "action", action: "High Kick", scale: 0.75 },
    { time: 1.05, type: "impact", strength: 0.8 },
    { time:1.05,type:"pose",fighter:"defender",pose:"heavy_kick_contact",easing:"snap" },
    { time:1.13,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out" },
    { time:1.18,type:"launch",fighter:"defender",x:120,y:-15,duration:.3,easing:"ease-out" },
    { time:1.27,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out" },
  ]),contactTime:1.05,phases:{READY:0,ANTICIPATION:.12,COMMIT:.65,CONTACT:1.05,OVERSHOOT:1.13,FOLLOW_THROUGH:1.27,RECOVERY:1.45},contact:{endpoint:"rightAnkle",target:"upperTorso",desiredRootDistance:220,minimumRootSeparation:142}},
  {...move("grab_throw", "Grab → Throw", "Grapple", 1.65, [
    { time: 0, type: "action", action: "Step Forward", scale: 0.5 },
    { time:.2,type:"pose",pose:"body_hit_contact",easing:"ease-in" },
    { time: 0.3, type: "grab" },
    { time:.3,type:"pose",fighter:"defender",pose:"body_hit_fold",easing:"snap" },
    { time:.52,type:"pose",fighter:"defender",pose:"fall_side_start",easing:"ease-in" },
    {
      time: 0.6,
      type: "rotation",
      fighter: "defender",
      rotation: 180,
      duration: 0.45,
    },
    {
      time: 0.95,
      type: "launch",
      fighter: "defender",
      x: 150,
      y: 120,
      duration: 0.45,
    },
    { time: 1.05, type: "impact", strength: 0.85 },
    { time:1.05,type:"pose",fighter:"defender",pose:"fall_side_ground",easing:"snap" },
    { time:1.35,type:"pose",pose:"combat_recovery",easing:"ease-out" },
  ]),contactTime:1.05,phases:{READY:0,ANTICIPATION:.2,COMMIT:.3,CONTACT:.6,OVERSHOOT:.95,FOLLOW_THROUGH:1.05,RECOVERY:1.35},contact:{endpoint:"rightWrist",target:"upperTorso",desiredRootDistance:150,minimumRootSeparation:112}},
  {...move("flying_kick", "Flying Kick", "Aerial", 1.45, [
    { time:0,type:"pose",pose:"kick_chamber_side",easing:"ease-in" },
    { time: 0, type: "launch", x: 130, y: -150, duration: 0.45 },
    { time: 0.35, type: "pose", pose: "jump_side_kick_extension" },
    { time: 0.72, type: "impact", strength: 0.8 },
    { time:.72,type:"pose",fighter:"defender",pose:"heavy_kick_contact",easing:"snap" },
    { time:.8,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out" },
    {
      time: 0.75,
      type: "launch",
      fighter: "defender",
      x: 160,
      y: -20,
      duration: 0.45,
    },
    { time:1.15,type:"pose",pose:"combat_recovery",easing:"ease-out" },
  ]),phases:{READY:0,ANTICIPATION:.12,COMMIT:.35,CONTACT:.72,OVERSHOOT:.8,FOLLOW_THROUGH:.95,RECOVERY:1.15},contact:{endpoint:"rightAnkle",target:"upperTorso",desiredRootDistance:220,minimumRootSeparation:140}},
  {...move("superhero_power_punch","Superhero Power Punch","Fantasy / Supernatural",1.35,[
    {time:0,type:"pose",pose:"superhero_charge",easing:"ease-in"},
    {time:.28,type:"effect",target:"lines",duration:.34,strength:.8},
    {time:.42,type:"pose",pose:"superhero_power_contact",easing:"snap"},
    {time:.42,type:"impact",strength:1.05},
    {time:.42,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},
    {time:.49,type:"launch",fighter:"defender",x:190,y:-18,duration:.42,easing:"ease-out"},
    {time:.52,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out"},
    {time:.72,type:"pose",pose:"superhero_follow",easing:"ease-out"},
    {time:1.14,type:"pose",pose:"fight_guard",easing:"ease-in-out"},
  ],"Mid",["superhero","energy"]),description:"A comic-book power punch with a deep charge, explosive extension and airborne knockback.",phases:{READY:0,ANTICIPATION:.18,COMMIT:.32,CONTACT:.42,OVERSHOOT:.52,FOLLOW_THROUGH:.72,RECOVERY:1.14},contact:{endpoint:"rightWrist",target:"head",desiredRootDistance:205,minimumRootSeparation:138}},
  {...move("elastic_energy_smash","Elastic Energy Smash","Fantasy / Supernatural",1.55,[
    {time:0,type:"pose",pose:"elastic_charge",easing:"ease-in"},
    {time:.24,type:"tether",duration:.58,style:"energy",strength:.9},
    {time:.54,type:"pose",pose:"elastic_smash_contact",easing:"snap"},
    {time:.54,type:"impact",strength:1.1},
    {time:.54,type:"pose",fighter:"defender",pose:"body_hit_contact",easing:"snap"},
    {time:.61,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out"},
    {time:.66,type:"launch",fighter:"defender",x:215,y:-25,duration:.46,easing:"ease-out"},
    {time:.86,type:"pose",pose:"elastic_recoil",easing:"ease-out"},
    {time:1.32,type:"pose",pose:"fight_guard",easing:"ease-in-out"},
  ],"Long",["superhero","energy","stretch"]),description:"A supernatural elastic-arm smash that connects attacker, energy line and defender as one event.",phases:{READY:0,ANTICIPATION:.2,COMMIT:.4,CONTACT:.54,OVERSHOOT:.66,FOLLOW_THROUGH:.86,RECOVERY:1.32},contact:{endpoint:"rightWrist",target:"upperTorso",desiredRootDistance:300,minimumRootSeparation:155}},
  {...move("aerial_meteor_smash","Aerial Meteor Smash","Fantasy / Supernatural",1.85,[
    {time:0,type:"pose",pose:"meteor_crouch",easing:"ease-in"},
    {time:.18,type:"launch",x:80,y:-190,duration:.3,easing:"ease-out"},
    {time:.3,type:"pose",pose:"meteor_airborne_arch",easing:"ease-out"},
    {time:.58,type:"pose",pose:"meteor_dive",easing:"ease-in"},
    {time:.62,type:"launch",x:95,y:190,duration:.28,easing:"ease-in"},
    {time:.9,type:"pose",pose:"meteor_impact",easing:"snap"},
    {time:.9,type:"impact",strength:1.25},
    {time:.9,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap"},
    {time:.96,type:"launch",fighter:"defender",x:185,y:-70,duration:.42,easing:"ease-out"},
    {time:1.02,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out"},
    {time:1.15,type:"effect",target:"shockwave",duration:.36,strength:1.2},
    {time:1.48,type:"pose",pose:"combat_recovery",easing:"ease-in-out"},
  ],"Mid",["superhero","aerial","heavy"]),description:"A high arcing leap, compressed airborne silhouette and full-body meteor impact.",phases:{READY:0,ANTICIPATION:.18,COMMIT:.58,CONTACT:.9,OVERSHOOT:1.02,FOLLOW_THROUGH:1.15,RECOVERY:1.48},contact:{endpoint:"rightWrist",target:"upperTorso",desiredRootDistance:175,minimumRootSeparation:132}},
  {...move("arcane_repulse","Arcane Repulse","Fantasy / Supernatural",1.45,[
    {time:0,type:"pose",pose:"arcane_charge",easing:"ease-in"},
    {time:.25,type:"effect",target:"lines",duration:.4,strength:1},
    {time:.48,type:"pose",pose:"arcane_release",easing:"snap"},
    {time:.48,type:"tether",duration:.36,style:"energy",strength:1},
    {time:.58,type:"impact",strength:1.15},
    {time:.58,type:"pose",fighter:"defender",pose:"body_hit_fold",easing:"snap"},
    {time:.64,type:"launch",fighter:"defender",x:245,y:-35,duration:.5,easing:"ease-out"},
    {time:.7,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out"},
    {time:1.18,type:"pose",pose:"fight_guard",easing:"ease-in-out"},
  ],"Long",["magic","energy","supernatural"]),description:"A two-hand arcane charge that releases a force wave and throws the target backward.",phases:{READY:0,ANTICIPATION:.25,COMMIT:.48,CONTACT:.58,OVERSHOOT:.7,FOLLOW_THROUGH:.82,RECOVERY:1.18},contact:{endpoint:"leftWrist",target:"body",desiredRootDistance:250,minimumRootSeparation:150}},
  {...move("flame_serpent_blast","Flame Serpent Blast","Fantasy / Supernatural",1.6,[
    {time:0,type:"pose",pose:"arcane_charge",easing:"ease-in"},
    {time:.32,type:"pose",pose:"flame_serpent_cast",easing:"ease-out"},
    {time:.34,type:"tether",duration:.62,style:"energy",strength:1.15},
    {time:.78,type:"impact",strength:1.05},
    {time:.78,type:"pose",fighter:"defender",pose:"body_hit_fold",easing:"snap"},
    {time:.86,type:"launch",fighter:"defender",x:175,y:-20,duration:.42,easing:"ease-out"},
    {time:.9,type:"pose",fighter:"defender",pose:"heavy_kick_recoil",easing:"ease-out"},
    {time:1.3,type:"pose",pose:"fight_guard",easing:"ease-in-out"},
  ],"Long",["magic","fire","projectile","supernatural"]),description:"A coiling supernatural flame cast inspired by the long curved energy poses in the reference.",phases:{READY:0,ANTICIPATION:.2,COMMIT:.34,CONTACT:.78,OVERSHOOT:.9,FOLLOW_THROUGH:1.02,RECOVERY:1.3},contact:{endpoint:"leftWrist",target:"upperTorso",desiredRootDistance:280,minimumRootSeparation:165}},
  {...move("aura_eruption","Aura Eruption","Fantasy / Supernatural",1.5,[
    {time:0,type:"pose",pose:"meteor_crouch",easing:"ease-in"},
    {time:.38,type:"pose",pose:"aura_eruption",easing:"snap"},
    {time:.4,type:"effect",target:"shockwave",duration:.58,strength:1.3},
    {time:.52,type:"impact",strength:1.15},
    {time:.52,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap"},
    {time:.58,type:"launch",fighter:"defender",x:210,y:-65,duration:.48,easing:"ease-out"},
    {time:.64,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out"},
    {time:1.2,type:"pose",pose:"combat_recovery",easing:"ease-in-out"},
  ],"Mid",["magic","aura","supernatural"]),description:"A compressed crouch that erupts into a full-body aura burst and launches the opponent.",phases:{READY:0,ANTICIPATION:.2,COMMIT:.38,CONTACT:.52,OVERSHOOT:.64,FOLLOW_THROUGH:.86,RECOVERY:1.2},contact:{endpoint:"rightWrist",target:"body",desiredRootDistance:190,minimumRootSeparation:155}},
  {...move("blood_moon_sword_arc","Blood Moon Sword Arc","Fantasy / Supernatural",1.7,[
    {time:0,type:"pose",pose:"fantasy_sword_windup",easing:"ease-in"},
    {time:.32,type:"pose",pose:"fantasy_sword_commit",easing:"ease-in"},
    {time:.58,type:"pose",pose:"fantasy_sword_contact",easing:"snap"},
    {time:.58,type:"impact",strength:1.2},
    {time:.58,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap"},
    {time:.65,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out"},
    {time:.72,type:"launch",fighter:"defender",x:150,y:-10,duration:.4,easing:"ease-out"},
    {time:.78,type:"pose",pose:"fantasy_sword_follow",easing:"ease-out"},
    {time:1.38,type:"pose",pose:"sword_recovery",easing:"ease-in-out"},
  ],"Mid",["sword","strong","fantasy","blood"]),description:"A huge fantasy sword arc with committed follow-through; red spray follows the global Blood setting.",phases:{READY:0,ANTICIPATION:.2,COMMIT:.32,CONTACT:.58,OVERSHOOT:.68,FOLLOW_THROUGH:.78,RECOVERY:1.38},weaponFXPreset:"ink_crescent_slash",impactFXPreset:"heavy_flash",hitParticlePreset:"medium_red_hit",contact:{endpoint:"weapon",target:"head",desiredRootDistance:190,minimumRootSeparation:142}},
  move(
    "chain_pull",
    "Chain Pull",
    "Special",
    2.1,
    [
      { time: 0, type: "pose", pose: "fight_guard" },
      { time: 0.25, type: "tether", duration: 1.05, style: "chain" },
      { time: 0.7, type: "impact", strength: 0.4 },
      { time:.7,type:"pose",fighter:"defender",pose:"body_hit_contact",easing:"snap" },
      {
        time: 0.72,
        type: "pull",
        fighter: "defender",
        x: -240,
        duration: 0.55,
      },
      { time: 1.25, type: "camera", preset: "push_in" },
      { time:1.28,type:"pose",fighter:"defender",pose:"stagger_back_1",easing:"ease-out" },
      { time: 1.6, type: "pose", pose: "fight_guard" },
    ],
    "Long",
  ),
  move(
    "ice_burst",
    "Ice Burst",
    "Elemental",
    2,
    [
      { time: 0, type: "effect", target: "lines", duration: 0.55 },
      { time: 0.65, type: "impact", strength: 0.55 },
      { time:.65,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap" },
      {
        time: 0.67,
        type: "status",
        fighter: "defender",
        target: "frozen",
        duration: 0.8,
      },
      { time: 0.7, type: "camera", preset: "push_in" },
      { time:1.48,type:"pose",fighter:"defender",pose:"combat_recovery",easing:"ease-out" },
    ],
    "Long",
  ),
  move(
    "flame_orb",
    "Flame Orb",
    "Projectile",
    1.65,
    [
      { time: 0, type: "pose", pose: "straight_punch_anticipation" },
      { time: 0.3, type: "tether", duration: 0.55, style: "energy" },
      { time: 0.82, type: "impact", strength: 0.7 },
      { time:.82,type:"pose",fighter:"defender",pose:"body_hit_contact",easing:"snap" },
      { time:.91,type:"pose",fighter:"defender",pose:"body_hit_fold",easing:"ease-out" },
    ],
    "Long",
  ),
  move(
    "lightning_bolt",
    "Lightning Bolt",
    "Elemental",
    1.45,
    [
      {
        time: 0,
        type: "effect",
        target: "lines",
        duration: 0.45,
        strength: 0.8,
      },
      { time: 0.45, type: "impact", strength: 0.85 },
      { time:.45,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap" },
      { time:.55,type:"pose",fighter:"defender",pose:"body_hit_arm_lag",easing:"ease-out" },
      {
        time: 0.48,
        type: "status",
        fighter: "defender",
        target: "stunned",
        duration: 0.5,
      },
    ],
    "Long",
  ),
  move(
    "shadow_teleport_strike",
    "Shadow Teleport Strike",
    "Teleport",
    1.55,
    [
      { time: 0, type: "effect", target: "lines", duration: 0.25 },
      { time: 0.18, type: "moveRoot", x: 300, duration: 0.2 },
      { time: 0.45, type: "action", action: "Straight Punch", scale: 0.65 },
      { time: 0.72, type: "impact", strength: 0.9 },
      { time:.72,type:"pose",fighter:"defender",pose:"head_hit_contact",easing:"snap" },
      { time:.8,type:"pose",fighter:"defender",pose:"head_hit_snap",easing:"ease-out" },
      { time: 0.72, type: "camera", preset: "impact_zoom" },
    ],
    "Mid",
  ),
  move(
    "energy_wave",
    "Energy Wave",
    "Projectile",
    1.7,
    [
      { time: 0, type: "pose", pose: "straight_punch_anticipation" },
      { time: 0.28, type: "tether", duration: 0.7, style: "energy" },
      { time: 0.88, type: "impact", strength: 0.8 },
      { time:.88,type:"pose",fighter:"defender",pose:"body_hit_contact",easing:"snap" },
      {
        time: 0.9,
        type: "launch",
        fighter: "defender",
        x: 170,
        duration: 0.45,
      },
    ],
    "Long",
  ),
  move(
    "ground_shockwave",
    "Ground Shockwave",
    "Special",
    1.8,
    [
      {
        time: 0.2,
        type: "effect",
        target: "shockwave",
        duration: 0.6,
        strength: 1,
      },
      { time: 0.62, type: "impact", strength: 0.9 },
      { time:.62,type:"pose",fighter:"defender",pose:"heavy_hit_compress",easing:"snap" },
      { time:.74,type:"pose",fighter:"defender",pose:"knockback_trailing",easing:"ease-out" },
      {
        time: 0.65,
        type: "launch",
        fighter: "defender",
        x: 100,
        y: -100,
        duration: 0.45,
      },
    ],
    "Long",
  ),
  ...specialMoves.map((s) => {
    const contact=s.events.find((e)=>e.type==="impact")?.time??s.duration*.55,
      kick=/kick/i.test(s.id),
      metadata:FightMoveDefinition["contact"]={endpoint:kick?"rightAnkle":"rightWrist",target:kick?"upperTorso":"body",desiredRootDistance:kick?225:195,minimumRootSeparation:kick?140:132};
    return ({...s,
    category: (s.category === "Air"
      ? "Aerial"
      : s.category === "Throw"
        ? "Grapple"
        : s.category === "Featured"
          ? "Special"
          : s.category === "Tether"
            ? "Special"
            : s.category) as FightCategory,
    tags: [s.category.toLowerCase()],
    range: "Mid" as const,
    contactTime:contact,
    packages: [s.category],
    importance: "SPECIAL" as const,
    participants: 2 as const,
    cinematicPreset: "special_attack",
    phases:{READY:0,ANTICIPATION:Math.max(.1,contact*.3),COMMIT:Math.max(.2,contact*.68),CONTACT:contact,OVERSHOOT:Math.min(s.duration,contact+.1),FOLLOW_THROUGH:Math.min(s.duration,contact+.3),RECOVERY:Math.max(contact+.32,s.duration-.25)},
    contact:metadata,
  })}),
  ...swordMoves.map(s=>({
    ...s,
    category:(s.kind==="defense"?"Defense":s.kind==="combo"?"Combo":"Special") as FightCategory,
    description:`${s.strength.toLowerCase()} sword choreography with anticipation, contact and recovery.`,
    tags:["weapon","sword",s.kind,s.strength.toLowerCase()],packages:["Sword Duel"],
    participants:(s.kind==="defense"?1:2) as 1|2,
    importance:(s.strength==="SPECIAL"?"SPECIAL":s.strength==="HEAVY"?"STRONG":"NORMAL") as FightMoveDefinition["importance"],
    cooldown:s.kind==="combo"?3:s.strength==="HEAVY"?2:1,
    cinematicPreset:s.strength==="SPECIAL"?"special_attack":s.strength==="HEAVY"?"heavy_impact":undefined,
    weaponFXPreset:s.trail,
    impactFXPreset:s.kind==="clash"?"weapon_clash":s.strength==="HEAVY"?"heavy_flash":"small_flash",
    phases:{READY:0,ANTICIPATION:Math.max(.1,s.contactTime*.35),COMMIT:Math.max(.18,s.contactTime*.75),CONTACT:s.contactTime,OVERSHOOT:Math.min(s.duration,s.contactTime+.1),FOLLOW_THROUGH:Math.min(s.duration,s.contactTime+.22),RECOVERY:Math.max(s.contactTime+.25,s.duration-.18)},
    contact:s.kind==="defense"?undefined:{endpoint:"weapon",target:s.kind==="clash"?"upperTorso":s.id.includes("low")?"leg":"body",desiredRootDistance:s.range==="Long"?245:s.range==="Mid"?205:170,minimumRootSeparation:s.range==="Close"?118:138} as FightMoveDefinition["contact"],
  })),
];
// The library is intentionally authored by one choreography engine. Older
// entries receive the same deterministic phase/contact contract as the newer
// benchmark moves, so range preparation, mirroring and QA do not fork by era.
for (const definition of fightMoves) {
  const contact=definition.contactTime;
  definition.phases??={
    READY:0,ANTICIPATION:Math.max(.08,contact*.3),COMMIT:Math.max(.16,contact*.7),
    CONTACT:contact,OVERSHOOT:Math.min(definition.duration,contact+.1),
    FOLLOW_THROUGH:Math.min(definition.duration,contact+.28),
    RECOVERY:Math.max(contact+.3,definition.duration-.22),
  };
  if(definition.participants===2&&!definition.contact&&!(["Reaction"] as FightCategory[]).includes(definition.category)){
    const kick=definition.tags.some(t=>/kick|aerial|acrobatic/i.test(t))||/kick/i.test(definition.id),
      ranged=["Projectile","Elemental","Teleport","Special"].includes(definition.category)&&definition.range==="Long";
    definition.contact={endpoint:kick?"rightAnkle":"rightWrist",target:kick?"upperTorso":"body",desiredRootDistance:ranged?300:kick?220:185,minimumRootSeparation:kick?140:130};
  }
}
export type FightStyle =
  "Balanced" | "Fast" | "Technical" | "Acrobatic" | "Arcade" | "Heavy";
export interface FightSettings {
  duration: number;
  style: FightStyle;
  intensity: number;
  specials: boolean;
  grapples: boolean;
  aerial: boolean;
  projectiles: boolean;
  autoCamera: boolean;
  winner: "Auto" | "Fighter A" | "Fighter B" | "No Winner";
  seed: number;
  packageId?: string;
  combatType?: CombatType;
  attackerWeapon?: "None" | "Sword";
  targetWeapon?: "None" | "Sword";
  attackerHand?: WeaponHand;
  targetHand?: WeaponHand;
  swordStrength?: "AUTO" | "LIGHT" | "MEDIUM" | "HEAVY" | "SPECIAL";
  weaponTrail?: boolean;
  cinematicMode?: "STANDARD" | "DRAMATIC";
}
export interface FightPackage {
  id: string;
  name: string;
  description: string;
  settings: Partial<FightSettings>;
}
export const builtInFightPackages: FightPackage[] = [
  {
    id: "street_brawl",
    name: "Street Brawl",
    description: "Heavy grounded fight with grapples.",
    settings: {
      style: "Heavy",
      specials: false,
      grapples: true,
      aerial: false,
      projectiles: false,
      intensity: 0.65,
    },
  },
  {
    id: "arcade_duel",
    name: "Arcade Duel",
    description: "Specials, projectiles and cinematic peaks.",
    settings: {
      style: "Arcade",
      specials: true,
      grapples: true,
      aerial: true,
      projectiles: true,
      intensity: 0.9,
    },
  },
  {
    id: "martial_arts",
    name: "Martial Arts",
    description: "Technical counters, defense and spacing.",
    settings: {
      style: "Technical",
      specials: false,
      grapples: true,
      aerial: false,
      projectiles: false,
      intensity: 0.6,
    },
  },
  {
    id: "acrobatic_duel",
    name: "Acrobatic Duel",
    description: "Aerial movement and spinning attacks.",
    settings: {
      style: "Acrobatic",
      specials: true,
      grapples: false,
      aerial: true,
      projectiles: false,
      intensity: 0.8,
    },
  },
];
const random = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

/** Applies only the explicitly requested cards/cart items. Unlike generated
 * fights this does not add a winner/finisher or infer any participant. */
function orientCombatPair(p:Project,a:string,b:string,time:number){
  if(!p.tracks[a]||!p.tracks[b])return;
  const ax=poseAt(p.tracks[a],time).root.x,bx=poseAt(p.tracks[b],time).root.x;
  const first=p.characters.find(character=>character.id===a),second=p.characters.find(character=>character.id===b);
  // Authored combat poses face right. Resolve only the active pair from their
  // current world positions; spectators retain their normal scene identity.
  if(first)first.flip=ax>bx;
  if(second)second.flip=bx>ax;
}
export function applyFightMoveSequence(
  project: Project,
  attacker: string,
  target: string | undefined,
  start: number,
  input: FightSettings,
  ids: string[],
  execution: FightExecutionMode = "ATTACK_REACTION",
  autoFaceTarget = true,
) {
  let p=structuredClone(project), cursor=start;
  const moves=ids.map(id=>fightMoves.find(move=>move.id===id)).filter((move):move is FightMoveDefinition=>!!move);
  if(!p.tracks[attacker])return p;
  const attackerOnly=execution==="ATTACKER_ONLY",needsTarget=!attackerOnly&&moves.some(move=>move.participants===2);
  if(needsTarget&&(!target||target===attacker||!p.tracks[target]))return p;
  const combatType=input.combatType??"UNARMED";
  const attackerWeapon=input.attackerWeapon??(combatType==="UNARMED"?"None":"Sword");
  const targetWeapon=input.targetWeapon??(combatType==="SWORD"?"Sword":"None");
  if(attackerWeapon==="Sword")p=ensureSword(p,attacker,input.attackerHand??"right",start);
  if(needsTarget&&target&&targetWeapon==="Sword")p=ensureSword(p,target,input.targetHand??"right",start);
  for(const move of moves){
    const paired=!attackerOnly&&move.participants===2;
    if(paired&&target)orientCombatPair(p,attacker,target,cursor);
    else if(attackerOnly&&autoFaceTarget&&target&&target!==attacker&&p.tracks[target]){
      const actor=p.characters.find(c=>c.id===attacker),ax=poseAt(p.tracks[attacker],cursor).root.x,tx=poseAt(p.tracks[target],cursor).root.x;
      if(actor)actor.flip=ax>tx;
    }
    const lead=paired&&target?prepareRange(p,attacker,target,cursor,move):0, attackStart=cursor+lead;
    p=insertSpecialMove(p,move,attacker,attackStart,paired?target:undefined);
    if(paired&&target)p=addContactFx(p,attacker,target,attackStart+move.contactTime,move.importance,{
      trail:input.weaponTrail===false?undefined:move.weaponFXPreset,
      impact:move.impactFXPreset,particles:move.hitParticlePreset,afterimage:move.afterimagePreset,contact:move.contact,
    });
    else if(attackerOnly){
      for(const presetId of [input.weaponTrail===false?undefined:move.weaponFXPreset,move.afterimagePreset].filter(Boolean) as string[]){
        const preset=fxPreset(presetId);if(preset)p=addCombatFx(p,preset,attacker,attackStart+move.contactTime);
      }
    }
    cursor=Math.round((attackStart+move.duration+.3)*1000)/1000;
  }
  p.duration=Math.round(Math.max(p.duration,cursor)*1000)/1000;
  if(needsTarget&&target)p.fights=[...(p.fights??[]),{id:uid(),seed:input.seed,settings:{...input},packageId:input.packageId,fighterAssignments:{attacker,target},startTime:start,endTime:cursor,generatedMoveIds:moves.map(move=>move.id)}];
  return p;
}

/** Compile a registered reaction as a solo editable timeline move. Reaction
 * definitions are authored on the defender lane; remapping that lane to the
 * actor lets the existing SpecialMove compiler remain the single executor. */
export function applyReactionMove(project:Project,actor:string,start:number,move:FightMoveDefinition){
  const solo:FightMoveDefinition={...move,participants:1,events:move.events
    .filter(event=>event.fighter==="defender"||["impact","effect","status","camera","speed"].includes(event.type))
    .map(event=>event.fighter==="defender"?{...event,fighter:undefined}:event)};
  return insertSpecialMove(project,solo,actor,start);
}
const styleWeights: Record<
  FightStyle,
  Partial<Record<FightCategory, number>>
> = {
  Balanced: { Basic: 3, Defense: 2, Combo: 2, Special: 1 },
  Fast: { Basic: 4, Combo: 4, Defense: 1 },
  Technical: { Defense: 5, Basic: 3, Grapple: 2, Reaction: 2 },
  Acrobatic: { Aerial: 5, Acrobatic: 5, Combo: 2 },
  Arcade: { Special: 5, Elemental: 4, Projectile: 3, Teleport: 3, "Fantasy / Supernatural": 5, Combo: 2 },
  Heavy: { Grapple: 4, Combo: 3, Basic: 2, Reaction: 2 },
};
const rangeDistance = { Close: 175, Mid: 225, Long: 360 };
function shiftedAt(p: Project, id: string, time: number, dx: number) {
  const pose = clonePose(poseAt(p.tracks[id], time));
  Object.values(pose).forEach((j) => (j.x += dx));
  p.tracks[id].push({ id: uid(), time, pose, easing: "ease-in-out", flipH: false });
  p.tracks[id].sort((a, b) => a.time - b.time);
}
function authoredContactDistance(move: FightMoveDefinition) {
  if (!move.contact) return undefined;
  const events = move.events.filter((event) => event.type === "pose" && event.time === move.contactTime);
  const attackerEvent = events.find((event) => event.fighter !== "defender" && event.pose && poses[event.pose]);
  const defenderEvent = events.find((event) => event.fighter === "defender" && event.pose && poses[event.pose]);
  if (!attackerEvent?.pose || !defenderEvent?.pose) return undefined;
  const attackerPose = poses[attackerEvent.pose], defenderPose = poses[defenderEvent.pose];
  const endpoint = move.contact.endpoint === "weapon"
    ? (()=>{const wrist=attackerPose.rightWrist,elbow=attackerPose.rightElbow,dx=wrist.x-elbow.x,dy=wrist.y-elbow.y,length=Math.max(1,Math.hypot(dx,dy));return{x:wrist.x+dx/length*100,y:wrist.y+dy/length*100}})()
    : attackerPose[move.contact.endpoint];
  const target = move.contact.target === "body" ? defenderPose.torso
    : move.contact.target === "leg" ? { x: (defenderPose.leftKnee.x + defenderPose.rightKnee.x) / 2, y: (defenderPose.leftKnee.y + defenderPose.rightKnee.y) / 2 }
    : move.contact.target === "upperTorso"
      ? { x: (defenderPose.neck.x + defenderPose.torso.x) / 2, y: (defenderPose.neck.y + defenderPose.torso.y) / 2 }
      : move.contact.target === "chin"
        ? { x: defenderPose.head.x * .35 + defenderPose.neck.x * .65, y: defenderPose.head.y * .35 + defenderPose.neck.y * .65 }
        : defenderPose.head;
  const endpointOffset = endpoint.x - attackerPose.root.x;
  const targetOffset = target.x - defenderPose.root.x;
  // Solve against the visible near surface of the target, not the target
  // joint centre. A small inset sells compression without letting a fist,
  // foot, or weapon travel through the whole body.
  return Math.abs(endpointOffset + targetOffset) + 18;
}
function prepareRange(
  p: Project,
  attacker: string,
  target: string,
  time: number,
  move: FightMoveDefinition,
) {
  const a = poseAt(p.tracks[attacker], time).root,
    b = poseAt(p.tracks[target], time).root,
    authored = authoredContactDistance(move),
    minimum = move.contact?.minimumRootSeparation ?? 120,
    desired = Math.max(minimum, authored ?? move.contact?.desiredRootDistance ?? rangeDistance[move.range]),
    sign = b.x >= a.x ? 1 : -1,
    distance = Math.abs(b.x - a.x),
    delta = distance - desired;
  const ac = p.characters.find((c) => c.id === attacker),
    tc = p.characters.find((c) => c.id === target);
  if (ac) ac.flip = sign < 0;
  if (tc) tc.flip = sign > 0;
  if (distance >= minimum && Math.abs(delta) <= 22) return 0;
  const correction = Math.max(-Math.max(0, desired - minimum), Math.min(delta, 520));
  if (Math.abs(correction) < 4) return 0;
  const duration = Math.min(.3, .14 + Math.abs(correction) / 900);
  shiftedAt(p, attacker, time, 0);
  shiftedAt(p, attacker, time + duration, correction * sign);
  return duration;
}
function weightedPick(
  pool: FightMoveDefinition[],
  style: FightStyle,
  recent: string[],
  rng: () => number,
  intensity: number,
) {
  const weighted = pool.map((m) => {
      const recency = recent.lastIndexOf(m.id),
        penalty =
          recency < 0
            ? 1
            : Math.max(
                0.08,
                ((recent.length - recency) / (recent.length + 1)) * 0.25,
              ),
        base = styleWeights[style][m.category] ?? 1,
        special = m.importance === "SPECIAL" ? 0.35 + intensity * 1.5 : 1;
      return { m, w: (base * penalty * special) / (m.cooldown ?? 1) };
    }),
    total = weighted.reduce((n, x) => n + x.w, 0);
  let roll = rng() * total;
  for (const x of weighted) {
    roll -= x.w;
    if (roll <= 0) return x.m;
  }
  return weighted.at(-1)!.m;
}
export function validateFightMoves() {
  return fightMoves.map((move) => {
    const errors: string[] = [];
    if (!move.events.length) errors.push("no events");
    if (!(move.duration > 0)) errors.push("invalid duration");
    if (move.contactTime < 0 || move.contactTime > move.duration)
      errors.push("contact outside duration");
    for (const event of move.events)
      if (
        !Number.isFinite(event.time) ||
        event.time < 0 ||
        event.time > move.duration + 0.01
      )
        errors.push(`invalid event ${event.type}`);
    return { id: move.id, errors };
  });
}
export function buildFight(
  project: Project,
  firstAttacker: string,
  firstTarget: string,
  start: number,
  input: FightSettings,
  cart: string[] = [],
) {
  let p = structuredClone(project),
    settings = { ...input },
    cursor = start,
    attacker = firstAttacker,
    target = firstTarget;
  const pkg = builtInFightPackages.find((x) => x.id === settings.packageId);
  if (pkg) settings = { ...settings, ...pkg.settings };
  const combatType=settings.combatType??"UNARMED";
  const attackerWeapon=settings.attackerWeapon??(combatType==="UNARMED"?"None":"Sword"),
    targetWeapon=settings.targetWeapon??(combatType==="SWORD"?"Sword":"None");
  if(attackerWeapon==="Sword")p=ensureSword(p,firstAttacker,settings.attackerHand??"right",start);
  if(targetWeapon==="Sword")p=ensureSword(p,firstTarget,settings.targetHand??"right",start);
  const rng = random(settings.seed),
    end = start + settings.duration,
    endingReserve = Math.min(3.2, Math.max(1.5, settings.duration * 0.16)),
    bodyEnd = end - endingReserve;
  const allowed = fightMoves.filter(
      (m) =>
        (combatType==="MIXED" || (combatType==="SWORD" ? m.tags.includes("sword") : !m.tags.includes("sword"))) &&
        (!m.tags.includes("sword") || !settings.swordStrength || settings.swordStrength==="AUTO" || m.tags.includes(settings.swordStrength.toLowerCase())) &&
        (settings.specials ||
          !["Special", "Elemental", "Teleport", "Fantasy / Supernatural"].includes(m.category)) &&
        (settings.grapples || m.category !== "Grapple") &&
        (settings.aerial || !["Aerial", "Acrobatic"].includes(m.category)) &&
        (settings.projectiles || m.category !== "Projectile") &&
        m.category !== "Finisher",
    ),
    recent: string[] = [],
    generated: string[] = [];
  let cinematicCount = 0,
    index = 0;
  while (cursor < bodyEnd - 0.3) {
    const requested = cart[index],
      move = requested
        ? fightMoves.find((x) => x.id === requested)
        : weightedPick(
            allowed,
            settings.style,
            recent,
            rng,
            settings.intensity,
          );
    if (!move || cursor + move.duration > bodyEnd) {
      cursor += 0.2;
      index++;
      if (cart.length && index >= cart.length) break;
      continue;
    }
    orientCombatPair(p,attacker,target,cursor);
    const lead=prepareRange(p, attacker, target, cursor, move), attackStart=cursor+lead;
    p = insertSpecialMove(p, move, attacker, attackStart, target);
    p = addContactFx(
      p,
      attacker,
      target,
      attackStart + move.contactTime,
      move.importance,
      {
        trail: settings.weaponTrail===false?undefined:move.weaponFXPreset,
        impact: move.impactFXPreset,
        particles: move.hitParticlePreset,
        afterimage: move.afterimagePreset,
        contact: move.contact,
      },
    );
    generated.push(move.id);
    recent.push(move.id);
    if (recent.length > 6) recent.shift();
    const important = (move.importance !== "NORMAL" || (settings.cinematicMode==="DRAMATIC"&&move.tags.includes("sword"))) && index > 0,
      max = Math.max(1, Math.round(settings.intensity * 4));
    if (settings.autoCamera && important && cinematicCount < max) {
      const preset = cinematicPresets.find(
        (x) => x.id === move.cinematicPreset,
      );
      if (preset) {
        p = applyCinematic(p, preset, attackStart + move.contactTime);
        cinematicCount++;
      }
    }
    const baseGap =
        settings.style === "Fast"
          ? 0.08
          : settings.style === "Heavy"
            ? 0.42
            : 0.22,
      pause = index % 4 === 3 ? (settings.style === "Fast" ? 0.18 : 0.5) : 0;
    cursor = attackStart + move.duration + baseGap + pause;
    [attacker, target] = [target, attacker];
    index++;
    if (cart.length && index >= cart.length) break;
  }
  let winner: string | undefined =
    settings.winner === "Fighter A"
      ? firstAttacker
      : settings.winner === "Fighter B"
        ? firstTarget
        : settings.winner === "Auto"
          ? rng() < 0.5
            ? firstAttacker
            : firstTarget
          : undefined;
  if (winner) {
    const loser = winner === firstAttacker ? firstTarget : firstAttacker,
      finish =
        (combatType==="SWORD" ? fightMoves.find(m=>m.id==="sword_overhead") : undefined) ??
        fightMoves.find(
          (m) =>
            m.id ===
            (settings.style === "Heavy"
              ? "ground_shockwave"
              : settings.style === "Arcade"
                ? "shadow_teleport_strike"
                : "knockback"),
        ) ?? fightMoves[0],
      finishAt = Math.max(cursor, end - endingReserve);
    orientCombatPair(p,winner,loser,finishAt);
    const lead=prepareRange(p, winner, loser, finishAt, finish), finishStart=finishAt+lead;
    p = insertSpecialMove(p, finish, winner, finishStart, loser);
    p = addContactFx(
      p,
      winner,
      loser,
      finishStart + finish.contactTime,
      "FINISH",
      { impact: "heavy_flash", particles: "medium_red_hit", contact: finish.contact },
    );
    generated.push(finish.id);
  }
  p.duration = Math.max(p.duration, end);
  p.fights = [
    ...(p.fights ?? []),
    {
      id: uid(),
      seed: settings.seed,
      settings: { ...settings },
      packageId: settings.packageId,
      fighterAssignments: {
        attacker: firstAttacker,
        target: firstTarget,
        winner,
      },
      startTime: start,
      endTime: end,
      generatedMoveIds: generated,
    },
  ];
  return p;
}
