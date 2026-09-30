export type V = { x: number; y: number };
export type ActorId = string;
export type EntityId = string;
export type JointName =
  | "root"
  | "torso"
  | "neck"
  | "head"
  | "leftShoulder"
  | "leftElbow"
  | "leftWrist"
  | "rightShoulder"
  | "rightElbow"
  | "rightWrist"
  | "leftHip"
  | "leftKnee"
  | "leftAnkle"
  | "rightHip"
  | "rightKnee"
  | "rightAnkle";
export type Pose = Record<JointName, V>;
export type Ease =
  "linear" | "ease-in" | "ease-out" | "ease-in-out" | "snap" | "hold";
export interface Character {
  id: ActorId;
  name: string;
  type?: "stick_character";
  preset?: "standard" | "male" | "female" | "child" | "large" | "small";
  color: string;
  pose: Pose;
  flip: boolean;
  scale: number;
  rotation: number;
  visible: boolean;
  locked?: boolean;
  layer?: number;
}
export interface PoseKeyframe {
  id: string;
  time: number;
  pose: Pose;
  easing: Ease;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  flipH?: boolean;
  flipV?: boolean;
}
export interface MotionReviewIssue {
  id: string;
  actorId: ActorId;
  time: number;
  sourceTime?: number;
  joints: JointName[];
  reason: string;
  severity: "low" | "medium" | "high";
  status: "reconstructed" | "review" | "resolved";
}
export interface CharacterTransform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  flipH: boolean;
  flipV: boolean;
}
export type PropType =
  | "chair"
  | "table"
  | "sofa"
  | "bed"
  | "bench"
  | "phone"
  | "cup"
  | "book"
  | "bag"
  | "umbrella"
  | "flower"
  | "gift"
  | "letter"
  | "sword"
  | "staff"
  | "shield"
  | "flashlight"
  | "radio"
  | "ball"
  | "rectangle"
  | "circle"
  | "line"
  | "image";
export interface PropAttachment {
  actorId: ActorId;
  joint: JointName;
  offsetX: number;
  offsetY: number;
  rotation: number;
}
export interface PropTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  flipH: boolean;
  opacity: number;
  attachment: PropAttachment | null;
}
export interface Prop {
  id: EntityId;
  name: string;
  type: PropType;
  color: string;
  visible: boolean;
  locked: boolean;
  layer: number;
  image?: string;
}
export interface PropKeyframe extends PropTransform {
  id: string;
  time: number;
  easing: Ease;
}
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}
export interface CameraKeyframe extends CameraState {
  id: string;
  time: number;
  easing: Ease;
}
export interface SpeedKeyframe {
  id: string;
  time: number;
  speed: number;
  easing?: Ease;
}
export interface CinematicRegion { id:string;preset:string;start:number;impact:number;end:number }
export interface MasterClip {id:string;name:string;source:Project;in:number;out:number;transition:"cut"|"fade"}
export interface MasterSequence {id:string;name:string;clips:MasterClip[];format?:Project["format"]}
export type EffectType =
  | "flash"
  | "shockwave"
  | "lines"
  | "dust"
  | "shake"
  | "tether"
  | "frozen"
  | "stunned"
  | "motionTrail" | "afterimage" | "sparks" | "hitParticles" | "clash";
export interface Effect {
  id: string;
  time: number;
  duration: number;
  type: EffectType;
  x: number;
  y: number;
  strength: number;
  style?: "line" | "rope" | "chain" | "energy";
  sourceFighter?: ActorId;
  targetFighter?: ActorId;
  layer?: "behind" | "between" | "front";
  preset?: string;
  trackedJoint?: JointName;
  /** Prop used by a real weapon trail. The renderer samples its blade base/tip. */
  trackedProp?: EntityId;
  directionX?: number;
  directionY?: number;
  trackedPoint?: "weapon" | "hand" | "fist" | "foot" | "body" | "projectile";
  width?: number;
  sampleCount?: number;
  minimumVelocity?: number;
  maximumTrailAge?: number;
  opacity?: number;
  glow?: number;
  color?: string;
  autoTrail?: boolean;
}
export interface CombatFxSettings {
  intensity: "OFF" | "LOW" | "MEDIUM" | "HIGH" | "ARCADE";
  hitParticles: boolean;
  autoWeaponTrail: boolean;
}
export interface FightInstance {
  id: string;
  seed: number;
  settings: Record<string, unknown>;
  packageId?: string;
  fighterAssignments: { attacker: ActorId; target: ActorId; winner?: ActorId };
  startTime: number;
  endTime: number;
  generatedMoveIds: string[];
}
export type CombatType = "UNARMED" | "SWORD" | "MIXED";
export type WeaponHand = "right" | "left";
export interface SpecialEvent {
  time: number;
  type: string;
  fighter?: "attacker" | "defender";
  pose?: string;
  action?: string;
  duration?: number;
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  strength?: number;
  target?: string;
  style?: "line" | "rope" | "chain" | "energy";
  preset?: string;
  speed?: number;
  easing?: Ease;
}
export interface SpecialMove {
  id: string;
  name: string;
  category: string;
  duration: number;
  description: string;
  events: SpecialEvent[];
}
export interface ActionKeyframe {
  time: number;
  pose: string;
  easing: Ease;
  dx?: number;
  dy?: number;
  rootRotation?: number;
}
export interface Action {
  id?: string;
  name: string;
  categories?: string[];
  subcategory?: string;
  tags?: string[];
  participants?: ("actor" | "prop")[];
  style?: string;
  beats?: number;
  bars?: number;
  intensity?: "Low" | "Medium" | "High" | "Acrobatic";
  loopable?: boolean;
  entryPose?: string;
  mainPose?: string;
  exitPose?: string;
  duration: number;
  keyframes: ActionKeyframe[];
}
export interface Project {
  version: 1;
  name: string;
  duration: number;
  fps: number;
  format: { label: string; width: number; height: number };
  characters: Character[];
  tracks: Record<ActorId, PoseKeyframe[]>;
  props?: Prop[];
  propTracks?: Record<EntityId, PropKeyframe[]>;
  camera: CameraKeyframe[];
  speed: SpeedKeyframe[];
  cinematics?: CinematicRegion[];
  master?: MasterSequence;
  effects: Effect[];
  background: { top: string; bottom: string; grid: boolean; image?: string };
  savedPoses: Record<string, Pose>;
  trail: 0 | 1 | 2 | 3;
  dance?: { bpm: number; beatGrid: boolean; snapToBeat: boolean };
  motionReviews?: MotionReviewIssue[];
  director?: import("./autoDirector").AutoDirectorState;
  combatFx?: CombatFxSettings;
  fights?: FightInstance[];
}
