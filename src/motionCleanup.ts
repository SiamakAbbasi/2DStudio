import type { JointName } from "./types";
import type { MotionFrame, MotionLandmark } from "./motionCapture";

export type MotionIssueReason = "LOW_CONFIDENCE"|"MISSING_DETECTION"|"REPAIRED_SHORT_GAP"|"ISOLATED_JUMP"|"POSSIBLE_LEFT_RIGHT_INSTABILITY"|"LONG_UNRESOLVED_GAP"|"ROOT_DISCONTINUITY"|"RECONSTRUCTED_SEGMENT"|"MANUAL_REVIEW_REQUIRED";
export type SuspiciousMotionEvent = { timestamp:number; joints:JointName[]; reason:MotionIssueReason; severity:"low"|"medium"|"high" };
export type MotionCleanupMetrics = { shortGapsRepaired:number; lowConfidenceJointsRepaired:number; outlierSpikesDetected:number; outlierSpikesRepaired:number; badSegmentsDetected:number; segmentsRepaired:number; limbsRepaired:number; segmentsRequiringManualReview:number; unresolvedSuspiciousEvents:number; majorJumpsBefore:number; majorJumpsAfter:number; cleanupMilliseconds:number };
export type MotionCleanupResult = { rawSamples:MotionFrame[]; cleanSamples:MotionFrame[]; suspicious:SuspiciousMotionEvent[]; metrics:MotionCleanupMetrics };

const names:JointName[]=["head","leftShoulder","rightShoulder","leftElbow","rightElbow","leftWrist","rightWrist","leftHip","rightHip","leftKnee","rightKnee","leftAnkle","rightAnkle","root","torso","neck"];
const parent:Partial<Record<JointName,JointName>>={leftWrist:"leftElbow",rightWrist:"rightElbow",leftElbow:"leftShoulder",rightElbow:"rightShoulder",leftAnkle:"leftKnee",rightAnkle:"rightKnee",leftKnee:"leftHip",rightKnee:"rightHip",head:"neck",root:"torso"};
const clone=(f:MotionFrame):MotionFrame=>({time:f.time,confidence:f.confidence,discontinuity:f.discontinuity,joints:Object.fromEntries(Object.entries(f.joints).map(([k,v])=>[k,v&&{...v}]))});
const dist=(a:MotionLandmark,b:MotionLandmark)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a:MotionLandmark,b:MotionLandmark,t:number):MotionLandmark=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,confidence:Math.min(a.confidence,b.confidence)*.9});
const countJumps=(f:MotionFrame[])=>{let n=0;for(let i=1;i<f.length;i++)for(const j of names){const a=f[i-1].joints[j],b=f[i].joints[j];if(a&&b&&dist(a,b)>.12)n++;}return n;};
const hermite=(a:MotionLandmark,b:MotionLandmark,va:MotionLandmark|undefined,vb:MotionLandmark|undefined,t:number):MotionLandmark=>{const t2=t*t,t3=t2*t,h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;return{x:h00*a.x+h10*(va?.x??0)+h01*b.x+h11*(vb?.x??0),y:h00*a.y+h10*(va?.y??0)+h01*b.y+h11*(vb?.y??0),z:h00*a.z+h10*(va?.z??0)+h01*b.z+h11*(vb?.z??0),confidence:Math.min(a.confidence,b.confidence)*.85};};
const velocity=(a:MotionLandmark|undefined,b:MotionLandmark|undefined)=>a&&b?{x:b.x-a.x,y:b.y-a.y,z:b.z-a.z,confidence:1}:undefined;
const limbs:{name:string;joints:JointName[];base:JointName;tip:JointName}[]=[
  {name:"leftArm",joints:["leftElbow","leftWrist"],base:"leftShoulder",tip:"leftWrist"},{name:"rightArm",joints:["rightElbow","rightWrist"],base:"rightShoulder",tip:"rightWrist"},
  {name:"leftLeg",joints:["leftKnee","leftAnkle"],base:"leftHip",tip:"leftAnkle"},{name:"rightLeg",joints:["rightKnee","rightAnkle"],base:"rightHip",tip:"rightAnkle"},
];

export function cleanupMotion(rawSamples:MotionFrame[], options:{maxGap?:number;confidence?:number}={}):MotionCleanupResult{
  const started=performance.now(), maxGap=options.maxGap??3, confidence=options.confidence??.48;
  const clean=rawSamples.map(clone), suspicious:SuspiciousMotionEvent[]=[];
  let shortGapsRepaired=0,lowConfidenceJointsRepaired=0,outlierSpikesDetected=0,outlierSpikesRepaired=0,badSegmentsDetected=0,segmentsRepaired=0,limbsRepaired=0,segmentsRequiringManualReview=0;
  for(const joint of names){
    let i=0;
    while(i<clean.length){
      const q=clean[i].joints[joint], unreliable=!q||q.confidence<confidence;
      if(!unreliable){i++;continue;} const start=i; while(i<clean.length){const x=clean[i].joints[joint];if(x&&x.confidence>=confidence)break;i++;} const end=i-1,len=end-start+1;
      const before=start>0?clean[start-1].joints[joint]:undefined, after=i<clean.length?clean[i].joints[joint]:undefined;
      if(len<=maxGap&&before&&after){for(let k=start;k<=end;k++){const was=clean[k].joints[joint];clean[k].joints[joint]=mix(before,after,(k-start+1)/(len+1));if(was)lowConfidenceJointsRepaired++;else shortGapsRepaired++;suspicious.push({timestamp:clean[k].time,joints:[joint],reason:"REPAIRED_SHORT_GAP",severity:"low"});}}
      else suspicious.push({timestamp:clean[start].time,joints:[joint],reason:len>maxGap?"LONG_UNRESOLVED_GAP":(q?"LOW_CONFIDENCE":"MISSING_DETECTION"),severity:"high"});
    }
  }
  for(let i=1;i<clean.length-1;i++)for(const joint of names){
    const a=clean[i-1].joints[joint],b=clean[i].joints[joint],c=clean[i+1].joints[joint];if(!a||!b||!c)continue;
    const expected=mix(a,c,.5), spike=dist(b,expected), continuation=dist(a,c), p=parent[joint], pa=p&&clean[i-1].joints[p],pb=p&&clean[i].joints[p],pc=p&&clean[i+1].joints[p];
    const coherent=pa&&pb&&pc?dist(pb,mix(pa,pc,.5))>.08:false;
    const boneNow=pb?dist(b,pb):0,boneBefore=pa?dist(a,pa):boneNow,boneAfter=pc?dist(c,pc):boneNow;
    const brokenBone=!!pb&&boneNow>Math.max(boneBefore,boneAfter)*2.2;
    if(spike>.16&&continuation<.20&&!coherent||brokenBone){outlierSpikesDetected++;clean[i].joints[joint]=expected;outlierSpikesRepaired++;suspicious.push({timestamp:clean[i].time,joints:[joint],reason:"ISOLATED_JUMP",severity:spike>.3?"high":"medium"});}
  }
  for(let i=1;i<clean.length-1;i++)for(const side of ["Wrist","Elbow","Knee","Ankle"] as const){
    const l=("left"+side) as JointName,r=("right"+side) as JointName,aL=clean[i-1].joints[l],aR=clean[i-1].joints[r],bL=clean[i].joints[l],bR=clean[i].joints[r],cL=clean[i+1].joints[l],cR=clean[i+1].joints[r];
    if(!aL||!aR||!bL||!bR||!cL||!cR)continue;const normal=dist(bL,mix(aL,cL,.5))+dist(bR,mix(aR,cR,.5)),swapped=dist(bR,mix(aL,cL,.5))+dist(bL,mix(aR,cR,.5));
    if(swapped<normal*.42&&normal>.25){clean[i].joints[l]=bR;clean[i].joints[r]=bL;suspicious.push({timestamp:clean[i].time,joints:[l,r],reason:"POSSIBLE_LEFT_RIGHT_INSTABILITY",severity:"medium"});}
  }
  // Multi-frame stabilization is deliberately limb-local. A valid torso or opposite limb is never replaced.
  for(const limb of limbs){
    const bad=rawSamples.map((raw,i)=>{
      if(limb.joints.some(j=>!raw.joints[j]||raw.joints[j]!.confidence<confidence))return true;
      if(i===0||i===rawSamples.length-1)return false;
      const tip=clean[i].joints[limb.tip],prev=clean[i-1].joints[limb.tip],next=clean[i+1].joints[limb.tip],base=clean[i].joints[limb.base],basePrev=clean[i-1].joints[limb.base],baseNext=clean[i+1].joints[limb.base];
      if(!tip||!prev||!next||!base||!basePrev||!baseNext)return true;
      const tipTravel=dist(prev,tip)+dist(tip,next),baseTravel=dist(basePrev,base)+dist(base,baseNext);
      const p=parent[limb.tip]!,mid=clean[i].joints[p],pm=clean[i-1].joints[p],pn=clean[i+1].joints[p];
      const bone=mid?dist(tip,mid):0,neighborBone=pm&&pn?(dist(prev,pm)+dist(next,pn))/2:bone;
      return (tipTravel>.38&&baseTravel<.10)||(neighborBone>0&&(bone>neighborBone*2.0||bone<neighborBone*.4));
    });
    for(let i=0;i<bad.length;){if(!bad[i]){i++;continue;}const start=i;while(i<bad.length&&bad[i])i++;const end=i-1,len=end-start+1;if(len<2)continue;badSegmentsDetected++;
      const before=start-1,after=end+1,anchored=before>=0&&after<clean.length&&limb.joints.every(j=>clean[before].joints[j]&&clean[after].joints[j]);
      if(len<=6&&anchored){
        for(const joint of limb.joints){const a=clean[before].joints[joint]!,b=clean[after].joints[joint]!,va=velocity(before>0?clean[before-1].joints[joint]:undefined,a),vb=velocity(b,after+1<clean.length?clean[after+1].joints[joint]:undefined);for(let k=start;k<=end;k++)clean[k].joints[joint]=hermite(a,b,va,vb,(k-start+1)/(len+1));}
        segmentsRepaired++;limbsRepaired++;suspicious.push({timestamp:clean[start].time,joints:[...limb.joints],reason:"RECONSTRUCTED_SEGMENT",severity:"medium"});
      }else{
        if(before>=0)for(let k=start;k<=end;k++)for(const joint of limb.joints){const safe=clean[before].joints[joint];if(safe)clean[k].joints[joint]={...safe,confidence:safe.confidence*.7};}
        segmentsRequiringManualReview++;suspicious.push({timestamp:clean[start].time,joints:[...limb.joints],reason:"MANUAL_REVIEW_REQUIRED",severity:"high"});
      }
    }
  }
  for(const f of clean){const vals=Object.values(f.joints).filter(Boolean) as MotionLandmark[];f.confidence=vals.length?vals.reduce((s,q)=>s+q.confidence,0)/vals.length:0;}
  for(let i=0;i<rawSamples.length;){if(rawSamples[i].joints.root){i++;continue;}const start=i;while(i<rawSamples.length&&!rawSamples[i].joints.root)i++;if(i-start>maxGap&&i<clean.length)clean[i].discontinuity=true;}
  const unresolved=suspicious.filter(x=>x.reason==="LONG_UNRESOLVED_GAP"||x.reason==="MISSING_DETECTION"||x.reason==="LOW_CONFIDENCE").length;
  return{rawSamples,cleanSamples:clean.filter(f=>f.joints.root),suspicious,metrics:{shortGapsRepaired,lowConfidenceJointsRepaired,outlierSpikesDetected,outlierSpikesRepaired,badSegmentsDetected,segmentsRepaired,limbsRepaired,segmentsRequiringManualReview,unresolvedSuspiciousEvents:unresolved,majorJumpsBefore:countJumps(rawSamples),majorJumpsAfter:countJumps(clean),cleanupMilliseconds:performance.now()-started}};
}
