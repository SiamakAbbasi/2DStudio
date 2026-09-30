import { insertSpecialMove, specialMoves } from "./specialMoves";
import type { CombatType, Project, SpecialMove, WeaponHand } from "./types";
import { applyCinematic, cinematicPresets } from "./cinematicTiming";
import { addContactFx } from "./combatFx";
import { clonePose, poseAt, uid } from "./animation";
import { ensureSword, swordMoves } from "./meleeCombat";

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
  | "Special"
  | "Cinematic"
  | "Finisher";
  
export interface FightMoveDefinition extends SpecialMove {
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
}
const move = (
  id: string,
  name: string,
  category: FightCategory,
  duration: number,
  events: SpecialMove["events"],
  range: FightMoveDefinition["range"] = "Close",
  tags: string[] = [],
): FightMoveDefinition => {
  const importance =
    category === "Finisher"
      ? "FINISH"
      : ["Special", "Elemental", "Teleport", "Projectile"].includes(category)
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
  move("jab", "Jab", "Basic", 0.75, hit("Straight Punch", 0.32, 0.35)),
  move("cross", "Cross", "Basic", 0.85, hit("Straight Punch", 0.36, 0.5)),
  move("hook", "Hook", "Basic", 0.9, hit("Hook", 0.38, 0.6)),
  move("uppercut", "Uppercut", "Basic", 1.05, [
    ...hit("Uppercut", 0.42, 0.75),
    {
      time: 0.44,
      type: "launch",
      fighter: "defender",
      x: 45,
      y: -150,
      duration: 0.4,
    },
  ]),
  move(
    "roundhouse",
    "Roundhouse",
    "Basic",
    1.05,
    hit("High Kick", 0.48, 0.75),
    "Mid",
  ),
  move("sweep", "Sweep", "Basic", 1.1, [
    { time: 0, type: "action", action: "Low Kick" },
    { time: 0.48, type: "impact", strength: 0.7 },
    {
      time: 0.5,
      type: "rotation",
      fighter: "defender",
      rotation: 90,
      duration: 0.35,
    },
  ]),
  move("high_block", "High Block", "Defense", 0.65, [
    { time: 0, type: "pose", pose: "block_high" },
    { time: 0.5, type: "pose", pose: "fight_guard" },
  ]),
  move("low_block", "Low Block", "Defense", 0.65, [
    { time: 0, type: "pose", pose: "block_low" },
    { time: 0.5, type: "pose", pose: "fight_guard" },
  ]),
  move("dodge_back", "Dodge Back", "Defense", 0.8, [
    { time: 0, type: "action", action: "Step Back" },
    { time: 0.65, type: "pose", pose: "fight_guard" },
  ]),
  move("head_hit", "Head Hit", "Reaction", 0.7, [
    { time: 0, type: "impact", strength: 0.45 },
    {
      time: 0.05,
      type: "pose",
      fighter: "defender",
      pose: "head_hit_reaction",
    },
  ]),
  move("body_hit", "Body Hit", "Reaction", 0.7, [
    { time: 0, type: "impact", strength: 0.5 },
    {
      time: 0.05,
      type: "pose",
      fighter: "defender",
      pose: "body_hit_reaction",
    },
  ]),
  move("knockback", "Knockback", "Reaction", 1, [
    { time: 0, type: "impact", strength: 0.85 },
    {
      time: 0.03,
      type: "launch",
      fighter: "defender",
      x: 180,
      y: -20,
      duration: 0.5,
    },
  ]),
  move("fall_get_up", "Fall / Get Up", "Reaction", 1.8, [
    { time: 0, type: "pose", fighter: "defender", pose: "fall_backward" },
    { time: 1.15, type: "pose", fighter: "defender", pose: "stand_recovery" },
  ]),
  move("jab_cross_hook", "Jab → Cross → Hook", "Combo", 1.8, [
    { time: 0, type: "action", action: "Straight Punch", scale: 0.55 },
    { time: 0.48, type: "impact", strength: 0.35 },
    { time: 0.58, type: "action", action: "Straight Punch", scale: 0.55 },
    { time: 1, type: "impact", strength: 0.45 },
    { time: 1.08, type: "action", action: "Hook", scale: 0.65 },
    { time: 1.45, type: "impact", strength: 0.75 },
    {
      time: 1.47,
      type: "launch",
      fighter: "defender",
      x: 130,
      y: -20,
      duration: 0.4,
    },
  ]),
  move("punch_roundhouse", "Punch → Roundhouse", "Combo", 1.55, [
    { time: 0, type: "action", action: "Straight Punch", scale: 0.65 },
    { time: 0.4, type: "impact", strength: 0.4 },
    { time: 0.65, type: "action", action: "High Kick", scale: 0.75 },
    { time: 1.05, type: "impact", strength: 0.8 },
  ]),
  move("grab_throw", "Grab → Throw", "Grapple", 1.65, [
    { time: 0, type: "action", action: "Step Forward", scale: 0.5 },
    { time: 0.3, type: "grab" },
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
  ]),
  move("flying_kick", "Flying Kick", "Aerial", 1.45, [
    { time: 0, type: "launch", x: 130, y: -150, duration: 0.45 },
    { time: 0.35, type: "pose", pose: "jump_side_kick_extension" },
    { time: 0.72, type: "impact", strength: 0.8 },
    {
      time: 0.75,
      type: "launch",
      fighter: "defender",
      x: 160,
      y: -20,
      duration: 0.45,
    },
  ]),
  move(
    "chain_pull",
    "Chain Pull",
    "Special",
    2.1,
    [
      { time: 0, type: "pose", pose: "fight_guard" },
      { time: 0.25, type: "tether", duration: 1.05, style: "chain" },
      { time: 0.7, type: "impact", strength: 0.4 },
      {
        time: 0.72,
        type: "pull",
        fighter: "defender",
        x: -240,
        duration: 0.55,
      },
      { time: 1.25, type: "camera", preset: "push_in" },
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
      {
        time: 0.67,
        type: "status",
        fighter: "defender",
        target: "frozen",
        duration: 0.8,
      },
      { time: 0.7, type: "camera", preset: "push_in" },
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
  ...specialMoves.map((s) => ({
    ...s,
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
    contactTime:
      s.events.find((e) => e.type === "impact")?.time ?? s.duration * 0.55,
    packages: [s.category],
    importance: "SPECIAL" as const,
    cinematicPreset: "special_attack",
  })),
  ...swordMoves.map(s=>({
    ...s,
    category:(s.kind==="defense"?"Defense":s.kind==="combo"?"Combo":"Special") as FightCategory,
    description:`${s.strength.toLowerCase()} sword choreography with anticipation, contact and recovery.`,
    tags:["weapon","sword",s.kind,s.strength.toLowerCase()],packages:["Sword Duel"],
    importance:(s.strength==="SPECIAL"?"SPECIAL":s.strength==="HEAVY"?"STRONG":"NORMAL") as FightMoveDefinition["importance"],
    cooldown:s.kind==="combo"?3:s.strength==="HEAVY"?2:1,
    cinematicPreset:s.strength==="SPECIAL"?"special_attack":s.strength==="HEAVY"?"heavy_impact":undefined,
    weaponFXPreset:s.trail,
    impactFXPreset:s.kind==="clash"?"weapon_clash":s.strength==="HEAVY"?"heavy_flash":"small_flash",
  })),
];
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
const styleWeights: Record<
  FightStyle,
  Partial<Record<FightCategory, number>>
> = {
  Balanced: { Basic: 3, Defense: 2, Combo: 2, Special: 1 },
  Fast: { Basic: 4, Combo: 4, Defense: 1 },
  Technical: { Defense: 5, Basic: 3, Grapple: 2, Reaction: 2 },
  Acrobatic: { Aerial: 5, Acrobatic: 5, Combo: 2 },
  Arcade: { Special: 5, Elemental: 4, Projectile: 3, Teleport: 3, Combo: 2 },
  Heavy: { Grapple: 4, Combo: 3, Basic: 2, Reaction: 2 },
};
const rangeDistance = { Close: 150, Mid: 245, Long: 360 };
function shiftedAt(p: Project, id: string, time: number, dx: number) {
  const pose = clonePose(poseAt(p.tracks[id], time));
  Object.values(pose).forEach((j) => (j.x += dx));
  p.tracks[id].push({ id: uid(), time, pose, easing: "ease-in-out" });
  p.tracks[id].sort((a, b) => a.time - b.time);
}
function prepareRange(
  p: Project,
  attacker: string,
  target: string,
  time: number,
  range: FightMoveDefinition["range"],
) {
  const a = poseAt(p.tracks[attacker], time).root,
    b = poseAt(p.tracks[target], time).root,
    desired = rangeDistance[range],
    sign = b.x >= a.x ? 1 : -1,
    distance = Math.abs(b.x - a.x),
    delta = distance - desired;
  if (Math.abs(delta) > 35) shiftedAt(p, attacker, time, delta * sign);
  const ac = p.characters.find((c) => c.id === attacker),
    tc = p.characters.find((c) => c.id === target);
  if (ac) ac.flip = sign < 0;
  if (tc) tc.flip = sign > 0;
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
          !["Special", "Elemental", "Teleport"].includes(m.category)) &&
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
    prepareRange(p, attacker, target, cursor, move.range);
    p = insertSpecialMove(p, move, attacker, cursor, target);
    p = addContactFx(
      p,
      attacker,
      target,
      cursor + move.contactTime,
      move.importance,
      {
        trail: settings.weaponTrail===false?undefined:move.weaponFXPreset,
        impact: move.impactFXPreset,
        particles: move.hitParticlePreset,
        afterimage: move.afterimagePreset,
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
        p = applyCinematic(p, preset, cursor + move.contactTime);
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
    cursor += move.duration + baseGap + pause;
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
    prepareRange(p, winner, loser, finishAt, finish.range);
    p = insertSpecialMove(p, finish, winner, finishAt, loser);
    p = addContactFx(
      p,
      winner,
      loser,
      finishAt + finish.contactTime,
      "FINISH",
      { impact: "heavy_flash", particles: "medium_red_hit" },
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
