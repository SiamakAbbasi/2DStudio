import { basePose } from "./animation";
import type { Action, JointName, Pose, V } from "./types";
import { danceActions } from "./danceData";
const walkPose=(edit:Partial<Record<JointName,V>>):Pose=>{
  const pose=basePose(360,720);
  for(const [joint,value] of Object.entries(edit))pose[joint as JointName]={...value!};
  return pose;
};
const walkContactLeft=walkPose({
  torso:{x:368,y:625},neck:{x:374,y:565},head:{x:388,y:522},leftShoulder:{x:362,y:570},rightShoulder:{x:372,y:568},
  leftElbow:{x:340,y:620},leftWrist:{x:322,y:665},rightElbow:{x:397,y:616},rightWrist:{x:418,y:658},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:385,y:810},leftAnkle:{x:415,y:900},leftToe:{x:438,y:900},
  rightKnee:{x:335,y:808},rightAnkle:{x:305,y:896},rightToe:{x:329,y:900},
});
const walkDownLeft=walkPose({
  torso:{x:369,y:633},neck:{x:375,y:573},head:{x:389,y:530},leftShoulder:{x:363,y:578},rightShoulder:{x:373,y:576},
  leftElbow:{x:345,y:625},leftWrist:{x:331,y:667},rightElbow:{x:393,y:623},rightWrist:{x:409,y:664},
  leftHip:{x:356,y:724},rightHip:{x:364,y:726},leftKnee:{x:380,y:818},leftAnkle:{x:392.5,y:900},leftToe:{x:416,y:900},
  rightKnee:{x:340,y:818},rightAnkle:{x:326,y:887},rightToe:{x:348,y:891},
});
const walkPassingLeft=walkPose({
  torso:{x:369,y:625},neck:{x:375,y:565},head:{x:389,y:522},leftShoulder:{x:363,y:570},rightShoulder:{x:373,y:568},
  leftElbow:{x:355,y:623},leftWrist:{x:349,y:664},rightElbow:{x:382,y:621},rightWrist:{x:388,y:662},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:371,y:808},leftAnkle:{x:370,y:900},leftToe:{x:394,y:900},
  rightKnee:{x:378,y:790},rightAnkle:{x:371,y:856},rightToe:{x:391,y:862},
});
const walkUpLeft=walkPose({
  torso:{x:370,y:618},neck:{x:376,y:558},head:{x:390,y:515},leftShoulder:{x:364,y:563},rightShoulder:{x:374,y:561},
  leftElbow:{x:368,y:618},leftWrist:{x:371,y:659},rightElbow:{x:370,y:617},rightWrist:{x:369,y:658},
  leftHip:{x:356,y:709},rightHip:{x:364,y:711},leftKnee:{x:354,y:805},leftAnkle:{x:347.5,y:889},leftToe:{x:370.5,y:900},
  rightKnee:{x:399,y:786},rightAnkle:{x:406,y:862},rightToe:{x:427,y:869},
});
const swapWalkSides=(source:Pose):Pose=>{
  const result=structuredClone(source);
  for(const part of ["Shoulder","Elbow","Wrist","Hip","Knee","Ankle","Toe"] as const){
    const left=`left${part}` as JointName,right=`right${part}` as JointName,temp=result[left];result[left]=result[right];result[right]=temp;
  }
  return result;
};
const walkContactRight=swapWalkSides(walkContactLeft),walkDownRight=swapWalkSides(walkDownLeft),walkPassingRight=swapWalkSides(walkPassingLeft),walkUpRight=swapWalkSides(walkUpLeft);
const a = (
  name: string,
  duration: number,
  keyframes: Action["keyframes"],
  categories = ["Fight"],
  participants: ("actor" | "prop")[] = ["actor"],
  interactionEvents: Action["interactionEvents"] = undefined,
): Action => ({
  id: name.toLowerCase().replaceAll(" ", "_"),
  name,
  duration,
  keyframes,
  categories,
  tags: [...categories, name.toLowerCase()],
  participants,
  interactionEvents,
});
const pose = (
  name: string,
  end: string = "neutral_stand",
  categories = ["Lifestyle"],
  participants: ("actor" | "prop")[] = ["actor"],
): Action =>
  a(
    name,
    0.7,
    [
      { time: 0, pose: "neutral_stand", easing: "ease-in-out" },
      { time: 0.7, pose: end, easing: "linear" },
    ],
    categories,
    participants,
  );
const travel = (
  name: string,
  dx: number,
  duration: number,
  categories = ["Movement"],
): Action =>
  a(
    name,
    duration,
    [
      { time: 0, pose: "step_forward_start", easing: "ease-in-out" },
      { time: duration, pose: "step_forward_contact", easing: "linear", dx },
    ],
    categories,
  );
export const actions: Action[] = [
  a(
    "Idle",
    0.6,
    [
      { time: 0, pose: "idle", easing: "ease-in-out" },
      { time: 0.6, pose: "idle", easing: "linear" },
    ],
    ["Lifestyle", "Fight"],
  ),
  a("Fight Stance", 0.35, [
    { time: 0, pose: "Fight Stance", easing: "ease-out" },
    { time: 0.35, pose: "Fight Stance", easing: "linear" },
  ]),
  a("Step Forward",.8,[{time:0,pose:"step_weight",easing:"ease-in"},{time:.18,pose:"step_lift",easing:"ease-out",dx:8},{time:.42,pose:"step_plant",easing:"ease-in",dx:58},{time:.62,pose:"walk_down_a",easing:"ease-out",dx:80},{time:.8,pose:"idle",easing:"ease-in-out",dx:80}],["Movement","Fight"]),
  a("Step Back",.85,[{time:0,pose:"step_weight",easing:"ease-in"},{time:.2,pose:"step_back_lift",easing:"ease-out",dx:-8},{time:.45,pose:"step_back_plant",easing:"ease-in",dx:-58},{time:.66,pose:"walk_down_a",easing:"ease-out",dx:-80},{time:.85,pose:"idle",easing:"ease-in-out",dx:-80}],["Movement","Fight"]),
  {...a("Walk",1,[
    {time:0,pose:"__walk_contact_left__",inlinePose:walkContactLeft,easing:"linear",dx:0,dy:0},
    {time:.125,pose:"__walk_down_left__",inlinePose:walkDownLeft,easing:"ease-in-out",dx:22.5,dy:8},
    {time:.25,pose:"__walk_passing_left__",inlinePose:walkPassingLeft,easing:"ease-in-out",dx:45,dy:0},
    {time:.375,pose:"__walk_up_left__",inlinePose:walkUpLeft,easing:"ease-in-out",dx:67.5,dy:-7},
    {time:.5,pose:"__walk_contact_right__",inlinePose:walkContactRight,easing:"linear",dx:90,dy:0},
    {time:.625,pose:"__walk_down_right__",inlinePose:walkDownRight,easing:"ease-in-out",dx:112.5,dy:8},
    {time:.75,pose:"__walk_passing_right__",inlinePose:walkPassingRight,easing:"ease-in-out",dx:135,dy:0},
    {time:.875,pose:"__walk_up_right__",inlinePose:walkUpRight,easing:"ease-in-out",dx:157.5,dy:-7},
    {time:1,pose:"__walk_contact_left__",inlinePose:walkContactLeft,easing:"linear",dx:180,dy:0},
  ],["Lifestyle","Movement"]),supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
  a("Walk Slowly",1.8,[{time:0,pose:"walk_contact_a",easing:"linear"},{time:.25,pose:"walk_down_a",easing:"ease-in-out",dx:20},{time:.5,pose:"walk_passing_a",easing:"ease-in-out",dx:42},{time:.7,pose:"walk_up_a",easing:"ease-in-out",dx:62},{time:.9,pose:"walk_contact_b",easing:"linear",dx:70},{time:1.15,pose:"walk_down_b",easing:"ease-in-out",dx:88},{time:1.4,pose:"walk_passing_b",easing:"ease-in-out",dx:108},{time:1.6,pose:"walk_up_b",easing:"ease-in-out",dx:122},{time:1.8,pose:"walk_contact_a",easing:"linear",dx:130}], ["Lifestyle","Movement"]),
  a("Walk Fast",.9,[{time:0,pose:"walk_contact_a",easing:"linear"},{time:.12,pose:"walk_down_a",easing:"ease-in-out",dx:32},{time:.23,pose:"walk_passing_a",easing:"ease-out",dx:65},{time:.34,pose:"walk_up_a",easing:"ease-out",dx:98},{time:.45,pose:"walk_contact_b",easing:"linear",dx:125},{time:.57,pose:"walk_down_b",easing:"ease-in-out",dx:158},{time:.68,pose:"walk_passing_b",easing:"ease-out",dx:190},{time:.79,pose:"walk_up_b",easing:"ease-out",dx:222},{time:.9,pose:"walk_contact_a",easing:"linear",dx:250}], ["Lifestyle","Movement"]),
  a("Run",.8,[{time:0,pose:"run_contact_a",easing:"linear"},{time:.12,pose:"run_compress_a",easing:"ease-in",dx:43},{time:.25,pose:"run_flight_a",easing:"ease-out",dx:103,dy:-24},{time:.4,pose:"run_contact_b",easing:"ease-in",dx:165},{time:.52,pose:"run_compress_b",easing:"ease-in",dx:208},{time:.65,pose:"run_flight_b",easing:"ease-out",dx:268,dy:-24},{time:.8,pose:"run_contact_a",easing:"ease-in",dx:330}], ["Movement","Cinematic Action"]),
  a("Approach",1.7,[{time:0,pose:"idle",easing:"ease-in"},{time:.18,pose:"walk_contact_a",easing:"ease-out"},{time:.42,pose:"walk_down_a",easing:"ease-in-out",dx:28},{time:.68,pose:"walk_passing_a",easing:"ease-in-out",dx:62},{time:.94,pose:"walk_contact_b",easing:"linear",dx:98},{time:1.2,pose:"walk_passing_a",easing:"ease-out",dx:128},{time:1.45,pose:"idle_relaxed",easing:"ease-out",dx:150},{time:1.7,pose:"idle",easing:"ease-in-out",dx:150}], ["Social","Romance","Family"]),
  a("Step Away",1.05,[{time:0,pose:"idle_relaxed",easing:"ease-in"},{time:.2,pose:"step_weight",easing:"ease-in"},{time:.4,pose:"step_back_lift",easing:"ease-out",dx:-18},{time:.66,pose:"step_back_plant",easing:"ease-in",dx:-92},{time:.86,pose:"walk_down_a",easing:"ease-out",dx:-120},{time:1.05,pose:"idle_relaxed",easing:"ease-in-out",dx:-120}],["Social","Romance"]),
  a("Dash Forward", 0.35, [
    { time: 0, pose: "Fight Stance", easing: "snap" },
    { time: 0.35, pose: "Fight Stance", easing: "ease-out", dx: 180 },
  ]),
  a("Straight Punch", 0.68, [
    { time: 0, pose: "Fight Stance", easing: "ease-in" },
    { time: 0.2, pose: "strong_punch_load", easing: "ease-in" },
    { time: 0.34, pose: "strong_punch_contact", easing: "snap", dx: 22 },
    { time: 0.41, pose: "strong_punch_follow", easing: "ease-out", dx: 28 },
    { time: 0.52, pose: "strong_punch_load", easing: "ease-in", dx: 18 },
    { time: 0.68, pose: "Fight Stance", easing: "ease-out" },
  ]),
  a("Hook", 0.6, [
    { time: 0, pose: "Punch Anticipation", easing: "snap" },
    { time: 0.3, pose: "Punch Extension", easing: "ease-out" },
    { time: 0.6, pose: "Fight Stance", easing: "linear" },
  ]),
  a("Uppercut", 0.6, [
    { time: 0, pose: "Crouch", easing: "snap" },
    { time: 0.3, pose: "Punch Extension", easing: "ease-out" },
    { time: 0.6, pose: "Fight Stance", easing: "linear" },
  ]),
  a("Low Kick", 0.65, [
    { time: 0, pose: "Kick Anticipation", easing: "snap" },
    { time: 0.35, pose: "Kick Extension", easing: "hold" },
    { time: 0.65, pose: "Fight Stance", easing: "linear" },
  ]),
  a("High Kick", 0.75, [
    { time: 0, pose: "Kick Anticipation", easing: "snap" },
    { time: 0.4, pose: "Kick Extension", easing: "hold" },
    { time: 0.75, pose: "Fight Stance", easing: "linear" },
  ]),
  a(
    "Jump",
    0.8,
    [
      { time: 0, pose: "Jump Anticipation", easing: "snap" },
      { time: 0.35, pose: "idle", easing: "ease-out", dy: -220 },
      { time: 0.8, pose: "Fight Stance", easing: "linear" },
    ],
    ["Movement", "Cinematic Action", "Fight"],
  ),
  a("Sit Down",1.25,[{time:0,pose:"neutral_stand",easing:"ease-in"},{time:.22,pose:"sit_prepare",easing:"ease-in"},{time:.58,pose:"sit_lower",easing:"ease-in-out"},{time:.88,pose:"seated_settle",easing:"ease-out"},{time:1.25,pose:"seated_settle",easing:"hold"}],["Lifestyle","Family","Prop Interaction"]),
  a("Sit",1,[{time:0,pose:"seated_settle",easing:"ease-in-out"},{time:.35,pose:"seated_settle",easing:"hold"},{time:.68,pose:"read_hold",easing:"ease-in-out"},{time:1,pose:"seated_settle",easing:"ease-in-out"}],["Lifestyle","Family","Prop Interaction"]),
  a("Stand Up",1.2,[{time:0,pose:"seated_settle",easing:"ease-in"},{time:.25,pose:"stand_load",easing:"ease-in"},{time:.62,pose:"stand_rise",easing:"ease-out"},{time:.95,pose:"neutral_stand",easing:"ease-out"},{time:1.2,pose:"idle",easing:"ease-in-out"}],["Lifestyle"]),
  pose("Relaxed Stand", "idle_relaxed", ["Lifestyle"]),
  a("Wave",1.65,[{time:0,pose:"idle",easing:"ease-in"},{time:.2,pose:"wave_ready",easing:"ease-out"},{time:.45,pose:"wave_left",easing:"ease-in-out"},{time:.68,pose:"wave_right",easing:"ease-in-out"},{time:.9,pose:"wave_left",easing:"ease-in-out"},{time:1.12,pose:"wave_right",easing:"ease-in-out"},{time:1.38,pose:"wave_ready",easing:"ease-out"},{time:1.65,pose:"idle",easing:"ease-in-out"}],["Lifestyle","Social","Family"]),
  a("Point",1.35,[{time:0,pose:"idle",easing:"ease-in"},{time:.22,pose:"point_ready",easing:"ease-in"},{time:.48,pose:"point_extend",easing:"ease-out"},{time:.9,pose:"point_extend",easing:"hold"},{time:1.12,pose:"point_ready",easing:"ease-in"},{time:1.35,pose:"idle",easing:"ease-out"}],["Lifestyle","Social"]),
  a("Think",1.45,[{time:0,pose:"idle",easing:"ease-in"},{time:.3,pose:"think_shift",easing:"ease-in-out"},{time:.95,pose:"think_shift",easing:"hold"},{time:1.45,pose:"idle_relaxed",easing:"ease-out"}],["Lifestyle","Reactions"]),
  a("Check Phone",1.65,[{time:0,pose:"idle",easing:"ease-in"},{time:.25,pose:"drink_reach",easing:"ease-in-out"},{time:.5,pose:"phone_view",easing:"ease-out"},{time:1.08,pose:"phone_view",easing:"hold"},{time:1.38,pose:"drink_reach",easing:"ease-in"},{time:1.65,pose:"idle",easing:"ease-out"}],["Lifestyle","Prop Interaction"]),
  a("Drink",1.7,[{time:0,pose:"idle",easing:"ease-in"},{time:.25,pose:"drink_reach",easing:"ease-in-out"},{time:.55,pose:"drink_raise",easing:"ease-out"},{time:.82,pose:"drink_hold",easing:"ease-in-out"},{time:1.12,pose:"drink_hold",easing:"hold"},{time:1.42,pose:"drink_reach",easing:"ease-in-out"},{time:1.7,pose:"idle",easing:"ease-out"}],["Lifestyle","Prop Interaction"]),
  a("Read",1.8,[{time:0,pose:"carry_hold",easing:"ease-in"},{time:.3,pose:"read_hold",easing:"ease-out"},{time:.75,pose:"read_hold",easing:"hold"},{time:1.05,pose:"phone_view",easing:"ease-in-out"},{time:1.4,pose:"read_hold",easing:"ease-in-out"},{time:1.8,pose:"carry_hold",easing:"ease-out"}],["Lifestyle","Prop Interaction"]),
  pose("Handshake", "straight_punch_extension", ["Social"], ["actor", "actor"]),
  pose("High Five", "high_guard", ["Social", "Family"], ["actor", "actor"]),
  pose(
    "Hug",
    "guard_body",
    ["Social", "Romance", "Family"],
    ["actor", "actor"],
  ),
  pose(
    "Hold Hands",
    "straight_punch_extension",
    ["Romance", "Family"],
    ["actor", "actor"],
  ),
  pose("Kiss", "lean_back", ["Romance"], ["actor", "actor"]),
  pose(
    "Give Flower",
    "straight_punch_extension",
    ["Romance", "Prop Interaction"],
    ["actor", "actor", "prop"],
  ),
  pose(
    "Group Hug",
    "guard_body",
    ["Family", "Social"],
    ["actor", "actor", "actor"],
  ),
  pose(
    "Family Photo Pose",
    "neutral_stand",
    ["Family"],
    ["actor", "actor", "actor"],
  ),
  pose("Basic Groove", "fight_guard", ["Dance"]),
  pose("Step Left", "sidestep_left", ["Dance"]),
  pose("Step Right", "sidestep_right", ["Dance"]),
  pose("Spin", "spin_end", ["Dance", "Cinematic Action"]),
  pose("Partner Hold", "guard_body", ["Dance", "Romance"]),
  pose("Slow Dance", "bow_stance", ["Dance", "Romance"]),
  pose("Sword Ready", "sword_neutral", ["Sword / Melee"]),
  pose("Raise Sword", "sword_ready_overhead", ["Sword / Melee"]),
  a("Swing Horizontal",1,[{time:0,pose:"sword_ready_side",easing:"ease-in"},{time:.42,pose:"sword_slash_horizontal_contact",easing:"snap"},{time:.62,pose:"sword_slash_horizontal_follow",easing:"ease-out"},{time:1,pose:"sword_recovery",easing:"ease-in-out"}],["Sword / Melee"]),
  a("Swing Diagonal",.95,[{time:0,pose:"sword_guard_high",easing:"ease-in"},{time:.4,pose:"sword_slash_diagonal_contact",easing:"snap"},{time:.6,pose:"sword_slash_horizontal_follow",easing:"ease-out"},{time:.95,pose:"sword_recovery",easing:"ease-in-out"}],["Sword / Melee"]),
  a("Sword Thrust",.9,[{time:0,pose:"sword_thrust_anticipation",easing:"ease-in"},{time:.4,pose:"sword_thrust_contact",easing:"snap"},{time:.9,pose:"sword_guard_mid",easing:"ease-out"}],["Sword / Melee"]),
  pose("Weapon Block", "sword_clash", ["Sword / Melee"]),
  pose("Weapon Clash Pose", "sword_clash", ["Sword / Melee"]),
  a("Surprised",1.15,[{time:0,pose:"idle",easing:"ease-in"},{time:.16,pose:"surprised_open",easing:"snap"},{time:.58,pose:"surprised_open",easing:"hold"},{time:.84,pose:"wave_ready",easing:"ease-out"},{time:1.15,pose:"idle",easing:"ease-in-out"}],["Reactions"]),
  a("Happy",1.5,[{time:0,pose:"idle_relaxed",easing:"ease-in"},{time:.3,pose:"happy_open",easing:"ease-out",dy:-8},{time:.7,pose:"happy_open",easing:"hold"},{time:1.05,pose:"wave_ready",easing:"ease-in-out"},{time:1.5,pose:"idle_relaxed",easing:"ease-out"}],["Reactions"]),
  pose("Sad", "idle_relaxed", ["Reactions"]),
  a("Scared",1.35,[{time:0,pose:"idle",easing:"ease-in"},{time:.18,pose:"surprised_open",easing:"snap"},{time:.4,pose:"scared_compress",easing:"ease-in"},{time:.85,pose:"scared_compress",easing:"hold"},{time:1.12,pose:"step_back_plant",easing:"ease-out",dx:-25},{time:1.35,pose:"idle_relaxed",easing:"ease-in-out",dx:-25}],["Reactions"]),
  a("Facepalm",1.55,[{time:0,pose:"idle_relaxed",easing:"ease-in"},{time:.3,pose:"facepalm_reach",easing:"ease-in"},{time:.55,pose:"facepalm_hold",easing:"ease-out"},{time:1.05,pose:"facepalm_hold",easing:"hold"},{time:1.3,pose:"facepalm_reach",easing:"ease-in"},{time:1.55,pose:"idle_relaxed",easing:"ease-out"}],["Reactions"]),
  a("Pick Up",1.9,[{time:0,pose:"idle",easing:"ease-in"},{time:.25,pose:"pickup_locate",easing:"ease-in"},{time:.55,pose:"pickup_lower",easing:"ease-in-out"},{time:.88,pose:"pickup_grab",easing:"ease-out"},{time:1.05,pose:"pickup_grab",easing:"hold"},{time:1.35,pose:"stand_load",easing:"ease-out"},{time:1.65,pose:"carry_hold",easing:"ease-out"},{time:1.9,pose:"idle_relaxed",easing:"ease-in-out"}],["Prop Interaction"],["actor","prop"],[{time:1.05,type:"GRAB",actorIndex:0,joint:"rightWrist"}]),
  a("Put Down",1.9,[{time:0,pose:"carry_hold",easing:"ease-in"},{time:.3,pose:"pickup_lower",easing:"ease-in-out"},{time:.68,pose:"pickup_grab",easing:"ease-out"},{time:.95,pose:"pickup_grab",easing:"hold"},{time:1.08,pose:"pickup_lower",easing:"ease-in"},{time:1.42,pose:"stand_rise",easing:"ease-out"},{time:1.7,pose:"idle_relaxed",easing:"ease-out"},{time:1.9,pose:"idle",easing:"ease-in-out"}],["Prop Interaction"],["actor","prop"],[{time:.95,type:"RELEASE",actorIndex:0,joint:"rightWrist"}]),
  a("Hold",1.2,[{time:0,pose:"idle",easing:"ease-in"},{time:.25,pose:"drink_reach",easing:"ease-in"},{time:.5,pose:"carry_hold",easing:"ease-out"},{time:1,pose:"carry_hold",easing:"hold"},{time:1.2,pose:"carry_hold",easing:"ease-in-out"}],["Prop Interaction"],["actor","prop"],[{time:.5,type:"GRAB",actorIndex:0,joint:"rightWrist"}]),
  a("Give",1.8,[{actorIndex:0,time:0,pose:"carry_hold",easing:"ease-in"},{actorIndex:0,time:.28,pose:"point_ready",easing:"ease-in"},{actorIndex:0,time:.58,pose:"give_extend",easing:"ease-out"},{actorIndex:0,time:.98,pose:"give_extend",easing:"hold"},{actorIndex:0,time:1.22,pose:"point_ready",easing:"ease-in"},{actorIndex:0,time:1.55,pose:"idle_relaxed",easing:"ease-out"},{actorIndex:0,time:1.8,pose:"idle",easing:"ease-in-out"},{actorIndex:1,time:0,pose:"idle",easing:"ease-in"},{actorIndex:1,time:.35,pose:"point_ready",easing:"ease-in"},{actorIndex:1,time:.65,pose:"catch_ready",easing:"ease-out"},{actorIndex:1,time:.98,pose:"catch_ready",easing:"hold"},{actorIndex:1,time:1.2,pose:"carry_hold",easing:"ease-out"},{actorIndex:1,time:1.8,pose:"idle_relaxed",easing:"ease-in-out"}],["Prop Interaction"],["actor","actor","prop"],[{time:.98,type:"TRANSFER",actorIndex:0,toActorIndex:1,joint:"rightWrist"}]),
  a("Catch",1.45,[{time:0,pose:"point_ready",easing:"ease-in"},{time:.28,pose:"catch_ready",easing:"ease-in"},{time:.62,pose:"catch_ready",easing:"hold"},{time:.72,pose:"catch_absorb",easing:"snap"},{time:1.02,pose:"carry_hold",easing:"ease-out"},{time:1.45,pose:"idle_relaxed",easing:"ease-in-out"}],["Prop Interaction"],["actor","prop"],[{time:.72,type:"CATCH",actorIndex:0,joint:"rightWrist"}]),
  ...danceActions,
];
