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
  leftElbow:{x:350,y:621},leftWrist:{x:322,y:665},rightElbow:{x:388,y:620},rightWrist:{x:418,y:658},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:395,y:810},leftAnkle:{x:415,y:900},leftToe:{x:433,y:892},
  rightKnee:{x:350,y:805},rightAnkle:{x:305,y:878},rightToe:{x:323,y:900},
});
const walkToeOffLeft=walkPose({
  torso:{x:369,y:630},neck:{x:375,y:570},head:{x:389,y:527},leftShoulder:{x:363,y:575},rightShoulder:{x:373,y:573},
  leftElbow:{x:353,y:623},leftWrist:{x:329,y:666},rightElbow:{x:385,y:621},rightWrist:{x:412,y:661},
  leftHip:{x:356,y:721},rightHip:{x:364,y:723},leftKnee:{x:388,y:825},leftAnkle:{x:403.75,y:900},leftToe:{x:421.75,y:900},
  rightKnee:{x:365,y:790},rightAnkle:{x:293.75,y:860},rightToe:{x:311.75,y:900},
});
const walkDownLeft=walkPose({
  torso:{x:369,y:633},neck:{x:375,y:573},head:{x:389,y:530},leftShoulder:{x:363,y:578},rightShoulder:{x:373,y:576},
  leftElbow:{x:356,y:625},leftWrist:{x:335,y:666},rightElbow:{x:383,y:622},rightWrist:{x:405,y:663},
  leftHip:{x:356,y:724},rightHip:{x:364,y:726},leftKnee:{x:390,y:830},leftAnkle:{x:392.5,y:900},leftToe:{x:410.5,y:900},
  rightKnee:{x:365,y:790},rightAnkle:{x:330,y:870},rightToe:{x:348,y:892},
});
const walkPassingLeft=walkPose({
  torso:{x:369,y:625},neck:{x:375,y:565},head:{x:389,y:522},leftShoulder:{x:363,y:570},rightShoulder:{x:373,y:568},
  leftElbow:{x:370,y:615},leftWrist:{x:354,y:661},rightElbow:{x:370,y:617},rightWrist:{x:383,y:659},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:365,y:805},leftAnkle:{x:370,y:898},leftToe:{x:388,y:900},
  rightKnee:{x:390,y:780},rightAnkle:{x:372,y:835},rightToe:{x:389,y:870},
});
const walkUpLeft=walkPose({
  torso:{x:370,y:618},neck:{x:376,y:558},head:{x:390,y:515},leftShoulder:{x:364,y:563},rightShoulder:{x:374,y:561},
  leftElbow:{x:374,y:616},leftWrist:{x:397,y:654},rightElbow:{x:365,y:617},rightWrist:{x:334,y:656},
  leftHip:{x:356,y:709},rightHip:{x:364,y:711},leftKnee:{x:352,y:800},leftAnkle:{x:347.5,y:880},leftToe:{x:365.5,y:900},
  rightKnee:{x:405,y:790},rightAnkle:{x:430,y:850},rightToe:{x:448,y:842},
});
const swapWalkSides=(source:Pose):Pose=>{
  const result=structuredClone(source);
  for(const part of ["Shoulder","Elbow","Wrist","Hip","Knee","Ankle","Toe"] as const){
    const left=`left${part}` as JointName,right=`right${part}` as JointName,temp=result[left];result[left]=result[right];result[right]=temp;
  }
  return result;
};
const walkContactRight=swapWalkSides(walkContactLeft),walkToeOffRight=swapWalkSides(walkToeOffLeft),walkDownRight=swapWalkSides(walkDownLeft),walkPassingRight=swapWalkSides(walkPassingLeft),walkUpRight=swapWalkSides(walkUpLeft);
const walkBackContactLeft=walkPose({
  torso:{x:368,y:625},neck:{x:374,y:565},head:{x:388,y:522},leftShoulder:{x:362,y:570},rightShoulder:{x:372,y:568},
  leftElbow:{x:388,y:620},leftWrist:{x:420,y:640},rightElbow:{x:350,y:621},rightWrist:{x:318,y:645},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:330,y:810},leftAnkle:{x:305,y:900},leftToe:{x:323,y:892},
  rightKnee:{x:390,y:805},rightAnkle:{x:415,y:878},rightToe:{x:433,y:900},
});
const walkBackToeOffLeft=walkPose({
  torso:{x:369,y:630},neck:{x:375,y:570},head:{x:389,y:527},leftShoulder:{x:363,y:575},rightShoulder:{x:373,y:573},
  leftElbow:{x:385,y:621},leftWrist:{x:415,y:645},rightElbow:{x:353,y:623},rightWrist:{x:323,y:647},
  leftHip:{x:356,y:721},rightHip:{x:364,y:723},leftKnee:{x:332,y:825},leftAnkle:{x:316.25,y:900},leftToe:{x:334.25,y:900},
  rightKnee:{x:355,y:790},rightAnkle:{x:426.25,y:860},rightToe:{x:444.25,y:900},
});
const walkBackDownLeft=walkPose({
  torso:{x:369,y:633},neck:{x:375,y:573},head:{x:389,y:530},leftShoulder:{x:363,y:578},rightShoulder:{x:373,y:576},
  leftElbow:{x:383,y:622},leftWrist:{x:413,y:648},rightElbow:{x:356,y:625},rightWrist:{x:326,y:650},
  leftHip:{x:356,y:724},rightHip:{x:364,y:726},leftKnee:{x:318,y:830},leftAnkle:{x:327.5,y:900},leftToe:{x:345.5,y:900},
  rightKnee:{x:350,y:790},rightAnkle:{x:407.5,y:870},rightToe:{x:425.5,y:892},
});
const walkBackPassingLeft=walkPose({
  torso:{x:369,y:625},neck:{x:375,y:565},head:{x:389,y:522},leftShoulder:{x:363,y:570},rightShoulder:{x:373,y:568},
  leftElbow:{x:370,y:617},leftWrist:{x:390,y:645},rightElbow:{x:370,y:615},rightWrist:{x:340,y:638},
  leftHip:{x:356,y:716},rightHip:{x:364,y:718},leftKnee:{x:340,y:805},leftAnkle:{x:350,y:898},leftToe:{x:368,y:900},
  rightKnee:{x:365,y:790},rightAnkle:{x:300,y:835},rightToe:{x:318,y:870},
});
const walkBackUpLeft=walkPose({
  torso:{x:370,y:618},neck:{x:376,y:558},head:{x:390,y:515},leftShoulder:{x:364,y:563},rightShoulder:{x:374,y:561},
  leftElbow:{x:365,y:617},leftWrist:{x:334,y:656},rightElbow:{x:374,y:616},rightWrist:{x:397,y:654},
  leftHip:{x:356,y:709},rightHip:{x:364,y:711},leftKnee:{x:365,y:800},leftAnkle:{x:372.5,y:880},leftToe:{x:390.5,y:900},
  rightKnee:{x:315,y:790},rightAnkle:{x:232.5,y:850},rightToe:{x:250.5,y:842},
});
const walkBackContactRight=swapWalkSides(walkBackContactLeft),walkBackToeOffRight=swapWalkSides(walkBackToeOffLeft),walkBackDownRight=swapWalkSides(walkBackDownLeft),walkBackPassingRight=swapWalkSides(walkBackPassingLeft),walkBackUpRight=swapWalkSides(walkBackUpLeft);
const runContactLeft=walkPose({
  torso:{x:376,y:622},neck:{x:389,y:565},head:{x:407,y:523},leftShoulder:{x:377,y:568},rightShoulder:{x:387,y:566},
  leftElbow:{x:348,y:610},leftWrist:{x:324,y:654},rightElbow:{x:417,y:598},rightWrist:{x:454,y:570},
  leftHip:{x:354,y:715},rightHip:{x:364,y:717},leftKnee:{x:408,y:806},leftAnkle:{x:430,y:900},leftToe:{x:448,y:896},
  rightKnee:{x:326,y:796},rightAnkle:{x:275,y:870},rightToe:{x:293,y:888},
});
const runDownLeft=walkPose({
  torso:{x:379,y:638},neck:{x:392,y:581},head:{x:410,y:539},leftShoulder:{x:380,y:584},rightShoulder:{x:390,y:582},
  leftElbow:{x:354,y:620},leftWrist:{x:329,y:661},rightElbow:{x:416,y:609},rightWrist:{x:453,y:581},
  leftHip:{x:358,y:733},rightHip:{x:368,y:735},leftKnee:{x:416,y:816},leftAnkle:{x:397,y:900},leftToe:{x:415,y:900},
  rightKnee:{x:340,y:818},rightAnkle:{x:282,y:760},rightToe:{x:300,y:782},
});
const runHeelRiseLeft=walkPose({
  torso:{x:380,y:626},neck:{x:393,y:569},head:{x:411,y:527},leftShoulder:{x:381,y:572},rightShoulder:{x:391,y:570},
  leftElbow:{x:365,y:604},leftWrist:{x:350,y:644},rightElbow:{x:409,y:602},rightWrist:{x:429,y:637},
  leftHip:{x:355,y:719},rightHip:{x:365,y:721},leftKnee:{x:384,y:798},leftAnkle:{x:358,y:870},leftToe:{x:376,y:900},
  rightKnee:{x:408,y:773},rightAnkle:{x:365,y:800},rightToe:{x:383,y:822},
});
const runToeOffLeft=walkPose({
  torso:{x:383,y:612},neck:{x:396,y:555},head:{x:414,y:513},leftShoulder:{x:384,y:558},rightShoulder:{x:394,y:556},
  leftElbow:{x:400,y:586},leftWrist:{x:435,y:565},rightElbow:{x:373,y:604},rightWrist:{x:349,y:645},
  leftHip:{x:356,y:705},rightHip:{x:366,y:707},leftKnee:{x:351,y:785},leftAnkle:{x:331,y:850},leftToe:{x:349,y:900},
  rightKnee:{x:416,y:764},rightAnkle:{x:370,y:790},rightToe:{x:388,y:812},
});
const runFlightLeft=walkPose({
  torso:{x:384,y:603},neck:{x:397,y:546},head:{x:415,y:504},leftShoulder:{x:385,y:549},rightShoulder:{x:395,y:547},
  leftElbow:{x:414,y:578},leftWrist:{x:449,y:555},rightElbow:{x:365,y:592},rightWrist:{x:340,y:634},
  leftHip:{x:356,y:696},rightHip:{x:366,y:698},leftKnee:{x:323,y:769},leftAnkle:{x:270,y:810},leftToe:{x:288,y:832},
  rightKnee:{x:431,y:761},rightAnkle:{x:400,y:842},rightToe:{x:418,y:860},
});
const runContactRight=swapWalkSides(runContactLeft),runDownRight=swapWalkSides(runDownLeft),runHeelRiseRight=swapWalkSides(runHeelRiseLeft),runToeOffRight=swapWalkSides(runToeOffLeft),runFlightRight=swapWalkSides(runFlightLeft);
const sprintContactLeft=walkPose({
  torso:{x:390,y:620},neck:{x:405,y:565},head:{x:430,y:525},leftShoulder:{x:392,y:568},rightShoulder:{x:402,y:566},
  leftElbow:{x:350,y:600},leftWrist:{x:305,y:575},rightElbow:{x:445,y:600},rightWrist:{x:490,y:570},
  leftHip:{x:350,y:715},rightHip:{x:360,y:717},leftKnee:{x:420,y:805},leftAnkle:{x:447,y:895},leftToe:{x:465,y:900},
  rightKnee:{x:315,y:790},rightAnkle:{x:250,y:870},rightToe:{x:268,y:888},
});
const sprintDownLeft=walkPose({
  torso:{x:392,y:635},neck:{x:407,y:580},head:{x:432,y:540},leftShoulder:{x:394,y:583},rightShoulder:{x:404,y:581},
  leftElbow:{x:354,y:608},leftWrist:{x:312,y:580},rightElbow:{x:442,y:608},rightWrist:{x:484,y:578},
  leftHip:{x:352,y:733},rightHip:{x:362,y:735},leftKnee:{x:420,y:815},leftAnkle:{x:407,y:900},leftToe:{x:425,y:900},
  rightKnee:{x:335,y:815},rightAnkle:{x:275,y:760},rightToe:{x:293,y:782},
});
const sprintHeelRiseLeft=walkPose({
  torso:{x:396,y:618},neck:{x:411,y:563},head:{x:436,y:523},leftShoulder:{x:398,y:566},rightShoulder:{x:408,y:564},
  leftElbow:{x:374,y:602},leftWrist:{x:350,y:570},rightElbow:{x:422,y:600},rightWrist:{x:446,y:568},
  leftHip:{x:350,y:714},rightHip:{x:360,y:716},leftKnee:{x:382,y:792},leftAnkle:{x:357,y:870},leftToe:{x:375,y:900},
  rightKnee:{x:425,y:765},rightAnkle:{x:370,y:795},rightToe:{x:388,y:817},
});
const sprintToePushLeft=walkPose({
  torso:{x:401,y:603},neck:{x:416,y:548},head:{x:441,y:508},leftShoulder:{x:403,y:551},rightShoulder:{x:413,y:549},
  leftElbow:{x:440,y:584},leftWrist:{x:480,y:552},rightElbow:{x:375,y:590},rightWrist:{x:335,y:558},
  leftHip:{x:350,y:700},rightHip:{x:360,y:702},leftKnee:{x:335,y:780},leftAnkle:{x:317,y:850},leftToe:{x:335,y:900},
  rightKnee:{x:430,y:755},rightAnkle:{x:380,y:790},rightToe:{x:398,y:812},
});
const sprintFlightLeft=walkPose({
  torso:{x:404,y:596},neck:{x:419,y:541},head:{x:444,y:501},leftShoulder:{x:406,y:544},rightShoulder:{x:416,y:542},
  leftElbow:{x:447,y:574},leftWrist:{x:490,y:540},rightElbow:{x:368,y:584},rightWrist:{x:325,y:550},
  leftHip:{x:350,y:694},rightHip:{x:360,y:696},leftKnee:{x:310,y:755},leftAnkle:{x:255,y:790},leftToe:{x:273,y:812},
  rightKnee:{x:440,y:750},rightAnkle:{x:405,y:825},rightToe:{x:423,y:845},
});
const sprintContactRight=swapWalkSides(sprintContactLeft),sprintDownRight=swapWalkSides(sprintDownLeft),sprintHeelRiseRight=swapWalkSides(sprintHeelRiseLeft),sprintToePushRight=swapWalkSides(sprintToePushLeft),sprintFlightRight=swapWalkSides(sprintFlightLeft);
const jumpPreparation=walkPose({
  torso:{x:360,y:625},neck:{x:362,y:565},head:{x:374,y:523},leftShoulder:{x:342,y:570},rightShoulder:{x:382,y:568},
  leftElbow:{x:330,y:625},leftWrist:{x:350,y:670},rightElbow:{x:394,y:623},rightWrist:{x:370,y:660},
  leftHip:{x:342,y:716},rightHip:{x:378,y:716},leftKnee:{x:350,y:810},rightKnee:{x:400,y:810},
  leftAnkle:{x:330,y:900},leftToe:{x:348,y:900},rightAnkle:{x:390,y:900},rightToe:{x:408,y:900},
});
const jumpCrouch=walkPose({
  torso:{x:378,y:666},neck:{x:390,y:612},head:{x:407,y:574},leftShoulder:{x:365,y:618},rightShoulder:{x:388,y:615},
  leftElbow:{x:330,y:646},leftWrist:{x:290,y:620},rightElbow:{x:350,y:642},rightWrist:{x:310,y:616},
  leftHip:{x:342,y:752},rightHip:{x:378,y:752},leftKnee:{x:400,y:825},rightKnee:{x:440,y:825},
  leftAnkle:{x:330,y:900},leftToe:{x:348,y:900},rightAnkle:{x:390,y:900},rightToe:{x:408,y:900},
});
const jumpTakeoffStart=walkPose({
  torso:{x:375,y:642},neck:{x:386,y:586},head:{x:403,y:547},leftShoulder:{x:363,y:590},rightShoulder:{x:388,y:587},
  leftElbow:{x:380,y:550},leftWrist:{x:425,y:545},rightElbow:{x:405,y:547},rightWrist:{x:450,y:542},
  leftHip:{x:342,y:735},rightHip:{x:378,y:735},leftKnee:{x:326,y:816},rightKnee:{x:398,y:816},
  leftAnkle:{x:326,y:885},leftToe:{x:344,y:900},rightAnkle:{x:386,y:885},rightToe:{x:404,y:900},
});
const jumpToeOff=walkPose({
  torso:{x:375,y:610},neck:{x:382,y:551},head:{x:397,y:510},leftShoulder:{x:360,y:557},rightShoulder:{x:386,y:554},
  leftElbow:{x:375,y:510},leftWrist:{x:420,y:500},rightElbow:{x:400,y:505},rightWrist:{x:445,y:495},
  leftHip:{x:342,y:705},rightHip:{x:378,y:705},leftKnee:{x:338,y:798},rightKnee:{x:390,y:798},
  leftAnkle:{x:322,y:865},leftToe:{x:340,y:900},rightAnkle:{x:382,y:865},rightToe:{x:400,y:900},
});
const jumpAscent=walkPose({
  torso:{x:370,y:618},neck:{x:376,y:559},head:{x:390,y:517},leftShoulder:{x:355,y:565},rightShoulder:{x:381,y:562},
  leftElbow:{x:375,y:518},leftWrist:{x:420,y:510},rightElbow:{x:400,y:513},rightWrist:{x:445,y:505},
  leftHip:{x:342,y:710},rightHip:{x:378,y:710},leftKnee:{x:390,y:775},rightKnee:{x:430,y:775},
  leftAnkle:{x:340,y:840},leftToe:{x:358,y:855},rightAnkle:{x:380,y:840},rightToe:{x:398,y:855},
});
const jumpApex=walkPose({
  torso:{x:368,y:622},neck:{x:374,y:563},head:{x:388,y:521},leftShoulder:{x:353,y:569},rightShoulder:{x:379,y:566},
  leftElbow:{x:382,y:530},leftWrist:{x:422,y:520},rightElbow:{x:407,y:527},rightWrist:{x:447,y:517},
  leftHip:{x:342,y:712},rightHip:{x:378,y:712},leftKnee:{x:395,y:775},rightKnee:{x:435,y:775},
  leftAnkle:{x:350,y:830},leftToe:{x:368,y:846},rightAnkle:{x:390,y:830},rightToe:{x:408,y:846},
});
const jumpDescent=walkPose({
  torso:{x:370,y:630},neck:{x:376,y:571},head:{x:390,y:529},leftShoulder:{x:355,y:577},rightShoulder:{x:381,y:574},
  leftElbow:{x:395,y:590},leftWrist:{x:418,y:630},rightElbow:{x:420,y:587},rightWrist:{x:443,y:627},
  leftHip:{x:342,y:718},rightHip:{x:378,y:718},leftKnee:{x:390,y:795},rightKnee:{x:430,y:795},
  leftAnkle:{x:345,y:850},leftToe:{x:363,y:870},rightAnkle:{x:385,y:850},rightToe:{x:403,y:870},
});
const jumpLandingPrep=walkPose({
  torso:{x:380,y:670},neck:{x:392,y:615},head:{x:410,y:576},leftShoulder:{x:366,y:621},rightShoulder:{x:392,y:618},
  leftElbow:{x:405,y:600},leftWrist:{x:445,y:620},rightElbow:{x:430,y:597},rightWrist:{x:470,y:617},
  leftHip:{x:342,y:752},rightHip:{x:378,y:752},leftKnee:{x:395,y:835},rightKnee:{x:435,y:835},
  leftAnkle:{x:328,y:920},leftToe:{x:346,y:925},rightAnkle:{x:392,y:920},rightToe:{x:410,y:925},
});
const jumpBeforeContact=walkPose({
  torso:{x:382,y:682},neck:{x:394,y:627},head:{x:412,y:588},leftShoulder:{x:368,y:633},rightShoulder:{x:394,y:630},
  leftElbow:{x:407,y:612},leftWrist:{x:447,y:632},rightElbow:{x:432,y:609},rightWrist:{x:472,y:629},
  leftHip:{x:342,y:760},rightHip:{x:378,y:760},leftKnee:{x:390,y:835},rightKnee:{x:430,y:835},
  leftAnkle:{x:328,y:904},leftToe:{x:346,y:903},rightAnkle:{x:392,y:904},rightToe:{x:410,y:903},
});
const WALK_CYCLE_DURATION=.8;
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
const builtInActions: Action[] = [
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
  {...a("Walk",WALK_CYCLE_DURATION,[
    {time:0,pose:"__walk_contact_left__",inlinePose:walkContactLeft,easing:"linear",dx:0,dy:0},
    {time:.05,pose:"__walk_toe_off_left__",inlinePose:walkToeOffLeft,easing:"ease-out",dx:11.25},
    {time:.1,pose:"__walk_down_left__",inlinePose:walkDownLeft,easing:"ease-out",dx:22.5},
    {time:.2,pose:"__walk_passing_left__",inlinePose:walkPassingLeft,easing:"ease-in-out",dx:45},
    {time:.3,pose:"__walk_up_left__",inlinePose:walkUpLeft,easing:"ease-out",dx:67.5},
    {time:.4,pose:"__walk_contact_right__",inlinePose:walkContactRight,easing:"linear",dx:90},
    {time:.45,pose:"__walk_toe_off_right__",inlinePose:walkToeOffRight,easing:"ease-out",dx:101.25},
    {time:.5,pose:"__walk_down_right__",inlinePose:walkDownRight,easing:"ease-out",dx:112.5},
    {time:.6,pose:"__walk_passing_right__",inlinePose:walkPassingRight,easing:"ease-in-out",dx:135},
    {time:.7,pose:"__walk_up_right__",inlinePose:walkUpRight,easing:"ease-out",dx:157.5},
    {time:.8,pose:"__walk_contact_left__",inlinePose:walkContactLeft,easing:"linear",dx:180},
  ],["Lifestyle","Movement"]),description:"Natural forward walk cycle with articulated weight acceptance, toe-off and relaxed limb recovery.",rootMotion:"relative",loopable:true,supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
  {...a("Walk Backward",WALK_CYCLE_DURATION,[
    {time:0,pose:"__walk_back_contact_left__",inlinePose:walkBackContactLeft,easing:"linear",dx:0},
    {time:.05,pose:"__walk_back_toe_off_left__",inlinePose:walkBackToeOffLeft,easing:"ease-out",dx:-11.25},
    {time:.1,pose:"__walk_back_down_left__",inlinePose:walkBackDownLeft,easing:"ease-out",dx:-22.5},
    {time:.2,pose:"__walk_back_passing_left__",inlinePose:walkBackPassingLeft,easing:"ease-in-out",dx:-45},
    {time:.3,pose:"__walk_back_up_left__",inlinePose:walkBackUpLeft,easing:"ease-out",dx:-67.5},
    {time:.4,pose:"__walk_back_contact_right__",inlinePose:walkBackContactRight,easing:"linear",dx:-90},
    {time:.45,pose:"__walk_back_toe_off_right__",inlinePose:walkBackToeOffRight,easing:"ease-out",dx:-101.25},
    {time:.5,pose:"__walk_back_down_right__",inlinePose:walkBackDownRight,easing:"ease-out",dx:-112.5},
    {time:.6,pose:"__walk_back_passing_right__",inlinePose:walkBackPassingRight,easing:"ease-in-out",dx:-135},
    {time:.7,pose:"__walk_back_up_right__",inlinePose:walkBackUpRight,easing:"ease-out",dx:-157.5},
    {time:.8,pose:"__walk_back_contact_left__",inlinePose:walkBackContactLeft,easing:"linear",dx:-180},
  ],["Movement"]),description:"Natural backward walk with rearward contact, articulated toe-off and backward swing-foot recovery.",rootMotion:"relative",loopable:true,supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
  a("Walk Slowly",1.8,[{time:0,pose:"walk_contact_a",easing:"linear"},{time:.25,pose:"walk_down_a",easing:"ease-in-out",dx:20},{time:.5,pose:"walk_passing_a",easing:"ease-in-out",dx:42},{time:.7,pose:"walk_up_a",easing:"ease-in-out",dx:62},{time:.9,pose:"walk_contact_b",easing:"linear",dx:70},{time:1.15,pose:"walk_down_b",easing:"ease-in-out",dx:88},{time:1.4,pose:"walk_passing_b",easing:"ease-in-out",dx:108},{time:1.6,pose:"walk_up_b",easing:"ease-in-out",dx:122},{time:1.8,pose:"walk_contact_a",easing:"linear",dx:130}], ["Lifestyle","Movement"]),
  a("Walk Fast",.9,[{time:0,pose:"walk_contact_a",easing:"linear"},{time:.12,pose:"walk_down_a",easing:"ease-in-out",dx:32},{time:.23,pose:"walk_passing_a",easing:"ease-out",dx:65},{time:.34,pose:"walk_up_a",easing:"ease-out",dx:98},{time:.45,pose:"walk_contact_b",easing:"linear",dx:125},{time:.57,pose:"walk_down_b",easing:"ease-in-out",dx:158},{time:.68,pose:"walk_passing_b",easing:"ease-out",dx:190},{time:.79,pose:"walk_up_b",easing:"ease-out",dx:222},{time:.9,pose:"walk_contact_a",easing:"linear",dx:250}], ["Lifestyle","Movement"]),
  {...a("Run",.7,[
    {time:0,pose:"__run_contact_left__",inlinePose:runContactLeft,easing:"linear",dx:0},
    {time:.06,pose:"__run_down_left__",inlinePose:runDownLeft,easing:"ease-out",dx:33},
    {time:.13,pose:"__run_heel_rise_left__",inlinePose:runHeelRiseLeft,easing:"ease-in-out",dx:72},
    {time:.2,pose:"__run_toe_off_left__",inlinePose:runToeOffLeft,easing:"ease-in",dx:99},
    {time:.26,pose:"__run_flight_left__",inlinePose:runFlightLeft,easing:"ease-out",dx:127},
    {time:.35,pose:"__run_contact_right__",inlinePose:runContactRight,easing:"linear",dx:165},
    {time:.41,pose:"__run_down_right__",inlinePose:runDownRight,easing:"ease-out",dx:198},
    {time:.48,pose:"__run_heel_rise_right__",inlinePose:runHeelRiseRight,easing:"ease-in-out",dx:237},
    {time:.55,pose:"__run_toe_off_right__",inlinePose:runToeOffRight,easing:"ease-in",dx:264},
    {time:.61,pose:"__run_flight_right__",inlinePose:runFlightRight,easing:"ease-out",dx:292},
    {time:.7,pose:"__run_contact_left__",inlinePose:runContactLeft,easing:"linear",dx:330},
  ],["Movement","Cinematic Action"]),description:"Dynamic forward run with impact absorption, articulated push-off, active arm drive and a clear airborne phase.",rootMotion:"relative",loopable:true,supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
  {...a("Sprint",.6,[
    {time:0,pose:"__sprint_contact_left__",inlinePose:sprintContactLeft,easing:"linear",dx:0},
    {time:.055,pose:"__sprint_down_left__",inlinePose:sprintDownLeft,easing:"ease-out",dx:40},
    {time:.105,pose:"__sprint_heel_rise_left__",inlinePose:sprintHeelRiseLeft,easing:"ease-in-out",dx:90},
    {time:.15,pose:"__sprint_toe_push_left__",inlinePose:sprintToePushLeft,easing:"ease-in",dx:130},
    {time:.225,pose:"__sprint_flight_left__",inlinePose:sprintFlightLeft,easing:"ease-out",dx:170},
    {time:.3,pose:"__sprint_contact_right__",inlinePose:sprintContactRight,easing:"linear",dx:210},
    {time:.355,pose:"__sprint_down_right__",inlinePose:sprintDownRight,easing:"ease-out",dx:250},
    {time:.405,pose:"__sprint_heel_rise_right__",inlinePose:sprintHeelRiseRight,easing:"ease-in-out",dx:300},
    {time:.45,pose:"__sprint_toe_push_right__",inlinePose:sprintToePushRight,easing:"ease-in",dx:340},
    {time:.525,pose:"__sprint_flight_right__",inlinePose:sprintFlightRight,easing:"ease-out",dx:380},
    {time:.6,pose:"__sprint_contact_left__",inlinePose:sprintContactLeft,easing:"linear",dx:420},
  ],["Movement","Cinematic Action"]),description:"Explosive maximum-effort sprint with deep absorption, forceful toe push, long flight and aggressive knee and arm drive.",rootMotion:"relative",loopable:true,supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
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
  {...a("Jump",.8,[
    {time:0,pose:"__jump_preparation__",inlinePose:jumpPreparation,easing:"ease-in-out",dx:0,dy:0},
    {time:.12,pose:"__jump_crouch__",inlinePose:jumpCrouch,easing:"ease-in",dx:0,dy:0},
    {time:.2,pose:"__jump_takeoff_start__",inlinePose:jumpTakeoffStart,easing:"ease-out",dx:4,dy:0},
    {time:.27,pose:"__jump_toe_off__",inlinePose:jumpToeOff,easing:"ease-out",dx:8,dy:0},
    {time:.36,pose:"__jump_ascent__",inlinePose:jumpAscent,easing:"ease-out",dx:14,dy:-100},
    {time:.46,pose:"__jump_apex__",inlinePose:jumpApex,easing:"ease-in-out",dx:20,dy:-180},
    {time:.58,pose:"__jump_descent__",inlinePose:jumpDescent,easing:"ease-in",dx:25,dy:-125},
    {time:.7,pose:"__jump_landing_prep__",inlinePose:jumpLandingPrep,easing:"ease-in",dx:28,dy:-35},
    {time:.8,pose:"__jump_before_contact__",inlinePose:jumpBeforeContact,easing:"ease-out",dx:30,dy:-6},
  ],["Movement","Cinematic Action","Fight"]),description:"Athletic standing jump with deep loading, articulated arm drive, toe push-off, ballistic airborne arc and a landing-ready finish.",rootMotion:"relative",loopable:false,supportedOrientations:["SIDE_RIGHT","SIDE_LEFT"]},
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

// The motion-sheet reauthoring pass is intentionally incremental. Keep the
// approved actions in their useful production categories and isolate every
// untouched legacy action so it cannot be mistaken for newly authored work.
const reauthoredActionIds = new Set(["walk", "walk_backward", "run", "sprint", "jump"]);
export const actions: Action[] = builtInActions.map((action) =>
  reauthoredActionIds.has(action.id ?? "")
    ? action
    : {...action, categories:["Old Actions"], tags:Array.from(new Set([...(action.tags ?? []), "Old Actions"]))},
);
