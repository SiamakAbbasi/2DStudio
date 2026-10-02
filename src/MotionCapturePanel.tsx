import { useEffect, useRef, useState } from "react";
import { analyzeVideo, retargetMotion, type MotionFrame } from "./motionCapture";
import { cleanupMotion, type MotionCleanupResult } from "./motionCleanup";
import { poseAt } from "./animation";
import { drawStick } from "./CanvasView";
import type { Ease, MotionReviewIssue, Pose, PoseKeyframe, Project } from "./types";

function TargetPreview({pose}:{pose:Pose|null}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const canvas=ref.current;if(!canvas||!pose)return;const ctx=canvas.getContext("2d")!,values=Object.values(pose),minX=Math.min(...values.map(p=>p.x))-45,maxX=Math.max(...values.map(p=>p.x))+45,minY=Math.min(...values.map(p=>p.y))-45,maxY=Math.max(...values.map(p=>p.y))+45,scale=Math.min(180/(maxX-minX),240/(maxY-minY)),offsetX=100-(minX+maxX)*scale/2,offsetY=130-(minY+maxY)*scale/2;ctx.clearRect(0,0,200,260);ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);drawStick(ctx,pose,"#52aaff",1,false);ctx.restore()},[pose]);if(!pose)return <div className="motion-target-empty">Analyze to preview target</div>;return <canvas ref={ref} width="200" height="260" aria-label="Target character motion preview"/>}

export function MotionCapture({ project, playhead, selected, easing, onClose, onImport }: {
  project: Project; playhead: number; selected: string; easing: Ease;
  onClose: () => void; onImport: (actor: string, keys: PoseKeyframe[], issues:MotionReviewIssue[], conflict:"replace"|"merge"|"insert", source:{url:string;fileName:string;inTime:number;frames:MotionFrame[]}) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), abortRef = useRef<AbortController | null>(null), keepUrl=useRef(false);
  const [url, setUrl] = useState(""), [fileName, setFileName] = useState(""), [duration, setDuration] = useState(0),
    [inTime, setInTime] = useState(0), [outTime, setOutTime] = useState(0), [fps, setFps] = useState(12),
    [progress, setProgress] = useState(0), [status, setStatus] = useState("Choose a local MP4, WebM or MOV."),
    [frames, setFrames] = useState<MotionFrame[]>([]), [rawFrames,setRawFrames]=useState<MotionFrame[]>([]), [cleanup,setCleanup]=useState<MotionCleanupResult|null>(null), [latest, setLatest] = useState<MotionFrame | null>(null),
    [debugReport,setDebugReport]=useState<Record<string,unknown>|null>(null),
    [target, setTarget] = useState(selected), [rootMotion, setRootMotion] = useState(false), [showRaw,setShowRaw]=useState(false),
    [bodyMotion,setBodyMotion]=useState(true),[view,setView]=useState<"overlay"|"source"|"skeleton">("overlay"),[conflict,setConflict]=useState<"replace"|"merge"|"insert">("replace"),[rootScale, setRootScale] = useState(1), [smoothing, setSmoothing] = useState(35), [detail, setDetail] = useState(3);
  useEffect(() => () => { abortRef.current?.abort(); if (url&&!keepUrl.current) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => {
    const canvas = canvasRef.current, video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!latest) return;
    const pairs = [["leftShoulder","rightShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftWrist"],["rightShoulder","rightElbow"],["rightElbow","rightWrist"],["leftShoulder","leftHip"],["rightShoulder","rightHip"],["leftHip","rightHip"],["leftHip","leftKnee"],["leftKnee","leftAnkle"],["rightHip","rightKnee"],["rightKnee","rightAnkle"]] as const;
    ctx.strokeStyle="#67d4ff"; ctx.lineWidth=4; ctx.fillStyle="#fff";
    for (const [a,b] of pairs) { const x=latest.joints[a], y=latest.joints[b]; if(!x||!y) continue; ctx.beginPath(); ctx.moveTo(x.x*canvas.width,x.y*canvas.height); ctx.lineTo(y.x*canvas.width,y.y*canvas.height); ctx.stroke(); }
    for (const q of Object.values(latest.joints)) if(q){ctx.beginPath();ctx.arc(q.x*canvas.width,q.y*canvas.height,4,0,7);ctx.fill();}
    canvas.dataset.overlayJoints = String(Object.keys(latest.joints).length);
  }, [latest]);
  const pickFile = (file?: File) => {
    if (!file) return; if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(file)); setFileName(file.name); setFrames([]);setCleanup(null);setDebugReport(null); setLatest(null); setProgress(0); setStatus("Video ready. Set IN/OUT, then analyze locally.");
  };
  const analyze = async () => {
    const video=videoRef.current; if(!video||!url) return;
    const controller=new AbortController(); abortRef.current=controller; setFrames([]); setProgress(0); setStatus("Loading local MediaPipe model…");
    try {
      const result=await analyzeVideo(video,inTime,outTime,fps,(value,frame)=>{setProgress(value);setLatest(frame);setStatus(`Pose Estimation · ${Math.round(value*100)}%`);},controller.signal);
      const detected=result.filter(f=>f.joints.root), cleaned=cleanupMotion(result), averageConfidence=detected.length?detected.reduce((s,f)=>s+f.confidence,0)/detected.length:0;
      const lowConfidenceFrames = detected.filter((frame) => frame.confidence < .55).length;
      if (import.meta.env.DEV) (window as any).__motionPocReport = {
        frameCount: detected.length, requestedSamples:result.length, cleanup:cleaned.metrics, suspicious:cleaned.suspicious,
        averageConfidence,
        lowConfidenceFrames,
        landmarks: result[0] ? Object.keys(result[0].joints) : [],
      };
      setDebugReport({frameCount:detected.length,requestedSamples:result.length,averageConfidence,lowConfidenceFrames,cleanup:cleaned.metrics,suspicious:cleaned.suspicious});
      setRawFrames(result);setCleanup(cleaned);setFrames(cleaned.cleanSamples);setLatest(cleaned.cleanSamples.at(-1)??null);setStatus(detected.length ? `Complete · ${detected.length}/${result.length} raw detections · ${cleaned.cleanSamples.length} clean samples · ${cleaned.metrics.outlierSpikesRepaired} spikes repaired` : "No person was detected in this range.");
    } catch(error) { setStatus((error as DOMException).name==="AbortError"?"Analysis cancelled.":`Error: ${(error as Error).message}`); }
  };
  const importKeys = () => {
    const track=project.tracks[target]; if(!track||!frames.length) return;
    const importFrames=bodyMotion?frames:frames.map(f=>({...f,joints:{root:f.joints.root}}));
    const keys=retargetMotion(importFrames,poseAt(track,playhead),playhead,rootMotion,rootScale,smoothing,detail,easing);
    const grouped=new Map<string,MotionReviewIssue>();
    for(const event of (cleanup?.suspicious??[]).filter(event=>event.reason==="RECONSTRUCTED_SEGMENT"||event.reason==="MANUAL_REVIEW_REQUIRED"||event.severity==="high")){
      const status=event.reason==="RECONSTRUCTED_SEGMENT"?"reconstructed":"review",absolute=playhead+event.timestamp,key=`${absolute.toFixed(2)}:${status}`,existing=grouped.get(key);
      if(existing){existing.joints=[...new Set([...existing.joints,...event.joints])];if(event.reason==="MANUAL_REVIEW_REQUIRED")existing.reason=event.reason;if(event.severity==="high")existing.severity="high";}
      else grouped.set(key,{id:crypto.randomUUID(),actorId:target,time:absolute,sourceTime:inTime+event.timestamp,joints:[...event.joints],reason:event.reason,severity:event.severity,status});
    }
    const issues=[...grouped.values()].sort((a,b)=>a.time-b.time).reduce<MotionReviewIssue[]>((all,issue)=>{const previous=all.at(-1);if(previous&&previous.status===issue.status&&issue.time-previous.time<=.26){previous.joints=[...new Set([...previous.joints,...issue.joints])];previous.time=(previous.time+issue.time)/2;previous.sourceTime=((previous.sourceTime??previous.time)+(issue.sourceTime??issue.time))/2;if(issue.reason==="MANUAL_REVIEW_REQUIRED")previous.reason=issue.reason;if(issue.severity==="high")previous.severity="high";return all;}all.push(issue);return all;},[]);
    if (import.meta.env.DEV) (window as any).__motionPocReport = {
      ...((window as any).__motionPocReport ?? {}),
      bakedKeyframes: keys.length,
      firstTime: keys[0]?.time,
      lastTime: keys.at(-1)?.time,
    };
    keepUrl.current=true;onImport(target,keys,issues,conflict,{url,fileName,inTime,frames}); setStatus(`Imported ${keys.length} editable keyframes · ${issues.filter(i=>i.status==="review").length} review locations.`);
  };
  const targetPose=latest&&project.tracks[target]?retargetMotion([latest],poseAt(project.tracks[target],playhead),playhead,rootMotion,rootScale,smoothing,5,easing)[0]?.pose??null:null;
  return <div className="motion-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}>
    <section className="motion-workspace">
      <header><div><b>Video Motion Capture</b><small>Local / Offline · MediaPipe Pose</small></div><button onClick={onClose}>×</button></header>
      <div className="motion-body">
        <div className="motion-preview">
          {!url && <>
            <label className="motion-drop">＋ Import Local Video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e)=>pickFile(e.target.files?.[0])}/></label>
            {import.meta.env.DEV && <button onClick={async()=>{const blob=await (await fetch('/motion-test.mp4')).blob();pickFile(new File([blob],'motion-test.mp4',{type:'video/mp4'}));}}>Load Milestone Test Clip</button>}
          </>}
          {url && <><div className="motion-view-tabs"><button className={view==="source"?"active":""} onClick={()=>setView("source")}>Source</button><button className={view==="overlay"?"active":""} onClick={()=>setView("overlay")}>Source + Skeleton</button><button className={view==="skeleton"?"active":""} onClick={()=>setView("skeleton")}>Skeleton Only</button></div><div className={`motion-compare ${view}`}><div className="motion-video-wrap"><video ref={videoRef} src={url} controls onLoadedMetadata={(e)=>{const d=e.currentTarget.duration;setDuration(d);setInTime(0);setOutTime(Math.min(d,10));}}/><canvas ref={canvasRef}/></div><div className="motion-target"><b>Target Character</b><TargetPreview pose={targetPose}/></div></div></>}
          <strong>{fileName || "No source selected"}</strong>
          {url && <><div className="motion-range"><label>IN <input type="number" min="0" max={outTime} step=".01" value={inTime} onChange={(e)=>setInTime(+e.target.value)}/></label><label>OUT <input type="number" min={inTime} max={duration} step=".01" value={outTime} onChange={(e)=>setOutTime(+e.target.value)}/></label><span>{Math.max(0,outTime-inTime).toFixed(2)} sec</span><button onClick={()=>{if(url)URL.revokeObjectURL(url);setUrl("");setFileName("");setFrames([]);setCleanup(null);}}>Remove Source</button></div><input className="motion-scrub" type="range" min="0" max={duration||1} step=".01" onChange={(e)=>{const t=+e.target.value;if(videoRef.current)videoRef.current.currentTime=t;const f=frames.reduce((best,next)=>Math.abs((next.time+inTime)-t)<Math.abs((best.time+inTime)-t)?next:best,frames[0]);if(f)setLatest(f);}}/></>}
        </div>
        <aside>
          <label>Target<select value={target} onChange={(e)=>setTarget(e.target.value)}>{project.characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Analysis FPS<select value={fps} onChange={(e)=>setFps(+e.target.value)}><option value="8">Fast · 8</option><option value="12">Balanced · 12</option><option value="24">Detailed · 24</option></select></label>
          <label className="check-row"><input type="checkbox" checked={bodyMotion} onChange={(e)=>setBodyMotion(e.target.checked)}/> Body Motion</label>
          <label className="check-row"><input type="checkbox" checked={rootMotion} onChange={(e)=>setRootMotion(e.target.checked)}/> Root Motion</label>
          <label>Root Scale <input type="number" min="0" max="5" step=".1" value={rootScale} onChange={(e)=>setRootScale(+e.target.value)}/></label>
          <label>Smoothing {smoothing}%<input type="range" min="0" max="85" value={smoothing} onChange={(e)=>setSmoothing(+e.target.value)}/></label>
          <label>Motion Detail {detail}<input type="range" min="1" max="5" value={detail} onChange={(e)=>setDetail(+e.target.value)}/></label>
          {import.meta.env.DEV&&<label className="check-row"><input type="checkbox" checked={showRaw} onChange={(e)=>{const raw=e.target.checked;setShowRaw(raw);setFrames(raw?rawFrames.filter(f=>f.joints.root):(cleanup?.cleanSamples??[]));setLatest((raw?rawFrames.filter(f=>f.joints.root):cleanup?.cleanSamples)?.at(-1)??null);}}/> Debug: RAW motion</label>}
          <button className="motion-primary" disabled={!url||outTime<=inTime} onClick={analyze}>Analyze Selection</button>
          <label>Import Conflict<select value={conflict} onChange={e=>setConflict(e.target.value as typeof conflict)}><option value="replace">Replace keys in range</option><option value="merge">Merge / update matching times</option><option value="insert">Insert and shift later keys</option></select></label>
          <button disabled={!frames.length} onClick={importKeys}>Import as Editable Keyframes</button>
          {progress>0&&progress<1&&<button onClick={()=>abortRef.current?.abort()}>Cancel</button>}
          <progress value={progress} max="1"/><p>{status}</p>{import.meta.env.DEV&&debugReport&&<output hidden data-motion-cleanup-report={JSON.stringify(debugReport)}/>} 
          {cleanup&&<div className="motion-summary"><b>Analysis Summary</b><span>{cleanup.rawSamples.filter(f=>f.joints.root).length}/{cleanup.rawSamples.length} detected</span><span>{cleanup.metrics.segmentsRepaired} reconstructed segments</span><span>{cleanup.metrics.segmentsRequiringManualReview} needs review</span></div>}
          <small>Video frames stay on this device. Only baked skeleton keyframes are stored in the project.</small>
        </aside>
      </div>
    </section>
  </div>;
}
