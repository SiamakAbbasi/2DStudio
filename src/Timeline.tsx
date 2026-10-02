import { useMemo, useRef, useState } from "react";
import type { Project } from "./types";
import { outputDuration } from "./animation";

export type TimelineKeyRef = { track: string; id: string };
export type TimelineSnap = "off"|".01"|".02"|".04"|".05"|".1"|"frame";
type SelectionMode = "replace" | "toggle" | "add";

export function Timeline({p,time,setTime,selected,playing,onTogglePlayback,onStopPlayback,activeActionName,onUpdateAction,onMoveKeys,selectedKeys,onSelectionChange,range,onRangeChange,onCreateAction,onAutoMotion,onClearAutoMotion,collapsed=false,onToggleCollapsed,onIssue,snapMode,onSnapMode,onDuplicate,onDuplicateAtPlayhead,onCopy,onPaste,onDelete,onEditPose,duplicateOffset,onDuplicateOffset,selectedPath,onSelectPath,onRetimePath}:{
  p:Project;time:number;setTime:(n:number)=>void;selected:string;
  playing:boolean;onTogglePlayback:()=>void;onStopPlayback:()=>void;
  activeActionName?:string;onUpdateAction?:()=>void;
  onMoveKeys:(keys:TimelineKeyRef[],delta:number)=>void;
  selectedKeys:TimelineKeyRef[];
  onSelectionChange:(keys:TimelineKeyRef[],mode:SelectionMode)=>void;
  range:{start:number;end:number}|null;onRangeChange:(range:{start:number;end:number}|null)=>void;
  onCreateAction:()=>void;
  onAutoMotion:()=>void;onClearAutoMotion:()=>void;
  collapsed?:boolean;onToggleCollapsed?:()=>void;onIssue?:(id:string)=>void;
  snapMode:TimelineSnap;onSnapMode:(value:TimelineSnap)=>void;onDuplicate:()=>void;onDuplicateAtPlayhead:()=>void;onCopy:()=>void;onPaste:()=>void;onDelete:()=>void;onEditPose:()=>void;duplicateOffset:number;onDuplicateOffset:(value:number)=>void;
  selectedPath:string|null;onSelectPath:(id:string)=>void;onRetimePath:(id:string,mode:"move"|"start"|"end",delta:number)=>void;
}) {
  const [zoom,setZoom]=useState(1),[box,setBox]=useState<{x1:number;y1:number;x2:number;y2:number}|null>(null),[drag,setDrag]=useState<{ids:Set<string>;dx:number}|null>(null),[rangeMode,setRangeMode]=useState(false),[menu,setMenu]=useState<{x:number;y:number}|null>(null);
  const root=useRef<HTMLDivElement>(null);
  const beatDuration=60/(p.dance?.bpm??120),snapStep=snapMode==="off"?0:snapMode==="frame"?1/p.fps:+snapMode,snap=(value:number)=>p.dance?.snapToBeat?Math.round(value/beatDuration)*beatDuration:snapStep?Math.round(value/snapStep)*snapStep:value;
  const tracks=[
    ...p.characters.map(a=>[a.id,p.tracks[a.id]??[],`♙ ${a.name}`] as const),
    ...(p.props??[]).map(x=>[`prop:${x.id}`,p.propTracks?.[x.id]??[],`⬡ ${x.name}`] as const),
    ["camera",p.camera,"Camera"],["effects",p.effects,"Effects"],["speed",p.speed,"Time Scale"],
  ] as const;
  const selectedSet=useMemo(()=>new Set(selectedKeys.map(k=>`${k.track}:${k.id}`)),[selectedKeys]);
  const startBox=(e:React.PointerEvent<HTMLDivElement>)=>{
    const target=e.target as HTMLElement;
    if(target.closest("button,label,.ruler"))return;
    const host=e.currentTarget,bounds=host.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top;
    let latest={x1:x,y1:y,x2:x,y2:y};setBox(latest);
    const move=(m:PointerEvent)=>{latest={...latest,x2:m.clientX-bounds.left,y2:m.clientY-bounds.top};setBox(latest)};
    const up=(u:PointerEvent)=>{
      removeEventListener("pointermove",move);removeEventListener("pointerup",up);setBox(null);
      const left=Math.min(latest.x1,latest.x2)+bounds.left,right=Math.max(latest.x1,latest.x2)+bounds.left,top=Math.min(latest.y1,latest.y2)+bounds.top,bottom=Math.max(latest.y1,latest.y2)+bounds.top;
      const refs=Array.from(host.querySelectorAll<HTMLButtonElement>(".timeline-key")).filter(el=>{const r=el.getBoundingClientRect();return r.right>=left&&r.left<=right&&r.bottom>=top&&r.top<=bottom}).map(el=>({track:el.dataset.track!,id:el.dataset.id!}));
      onSelectionChange(refs,u.shiftKey?"add":"replace");
    };
    addEventListener("pointermove",move);addEventListener("pointerup",up);
  };
  const rangePointer=(e:React.PointerEvent<HTMLDivElement>)=>{if(!rangeMode)return; e.stopPropagation();const r=e.currentTarget.getBoundingClientRect(),at=(x:number)=>Math.max(0,Math.min(p.duration,(x-r.left)/r.width*p.duration)),start=at(e.clientX);onRangeChange({start,end:start});const move=(m:PointerEvent)=>onRangeChange({start:Math.min(start,at(m.clientX)),end:Math.max(start,at(m.clientX))});const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)};
  const moveRangeBoundary=(which:"start"|"end",e:React.PointerEvent<HTMLButtonElement>)=>{e.stopPropagation();const r=e.currentTarget.parentElement!.getBoundingClientRect(),at=(x:number)=>Math.max(0,Math.min(p.duration,(x-r.left)/r.width*p.duration));const move=(m:PointerEvent)=>{if(!range)return;const value=at(m.clientX);onRangeChange(which==="start"?{start:Math.min(value,range.end),end:range.end}:{start:range.start,end:Math.max(value,range.start)})};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)};
  return <div className="timeline-shell">
    <div className="timeline-toolbar">
      <b>Timeline</b>
      <div className="timeline-tool-group playback-group" aria-label="Timeline playback">
        <button className={`timeline-play ${playing?"active":""}`} onClick={onTogglePlayback} aria-label={playing?"Pause":"Play"} title={`${playing?"Pause":"Play"} · Space`}>{playing?"Ⅱ":"▶"}</button>
        <button className="timeline-stop" onClick={onStopPlayback} aria-label="Stop and return to start" title="Stop and return to 0s">■</button>
      </div>
      {activeActionName&&<div className="timeline-tool-group linked-action-group"><span title={`Timeline is linked to ${activeActionName}`}>Action: <b>{activeActionName}</b></span><button className="timeline-update-action" onClick={onUpdateAction} title={`Replace ${activeActionName} with the edited poses and movement in this Timeline range`}>↻ Update Action</button></div>}
      <div className="timeline-tool-group selection-group">{selectedKeys.length>0?<span className="timeline-selection-count">{selectedKeys.length} selected</span>:<span className="timeline-selection-count quiet">No selection</span>}{selectedKeys.length>1&&<button className="timeline-create-action" onClick={onCreateAction} title="Create an Action from the selected keyframes">＋ Add Action</button>}</div>
      <div className="timeline-tool-group edit-group"><button disabled={!selectedKeys.length} onClick={onDuplicate} title="Duplicate selected · Ctrl+D">⧉ Duplicate</button><button disabled={!selectedKeys.length} onClick={onDuplicateAtPlayhead} title="Duplicate selected at playhead">◆→ Playhead</button><button disabled={!selectedKeys.length} onClick={onCopy} title="Copy · Ctrl+C">Copy</button><button onClick={onPaste} title="Paste · Ctrl+V">Paste</button></div>
      <div className="timeline-tool-group timing-group"><label className="timeline-compact">Offset<select value={duplicateOffset} onChange={e=>onDuplicateOffset(+e.target.value)}>{[.01,.02,.04,.05,.08,.1,.2].map(x=><option key={x} value={x}>{Math.round(x*1000)}ms</option>)}</select></label><label className="timeline-compact">Snap<select value={snapMode} onChange={e=>onSnapMode(e.target.value as TimelineSnap)}><option value="off">Off</option><option value=".01">10ms</option><option value=".02">20ms</option><option value=".04">40ms</option><option value=".05">50ms</option><option value=".1">100ms</option><option value="frame">Frame</option></select></label></div>
      <div className="timeline-tool-group motion-group"><button className="auto-motion-button" onClick={onAutoMotion}>✦ Auto Motion</button><button onClick={onClearAutoMotion} title="Remove eligible Auto Motion frames; authored and manually modified frames remain">Clear Generated</button></div>
      <div className="timeline-tool-group range-group"><button className={rangeMode?"active":""} onClick={()=>setRangeMode(v=>!v)}>↔ Range</button>{range&&<><span className="timeline-range-readout">IN {range.start.toFixed(3)} · OUT {range.end.toFixed(3)} · {(range.end-range.start).toFixed(3)}s</span><button className="icon-button" aria-label="Clear range" title="Clear range" onClick={()=>onRangeChange(null)}>×</button></>}</div>
      <div className="timeline-tool-group view-group"><span className="timeline-duration">{p.duration.toFixed(1)}s source · {outputDuration(p.speed,p.duration).toFixed(1)}s output</span><button className="icon-button" aria-label="Zoom out Timeline" title="Zoom out Timeline" onClick={()=>setZoom(z=>Math.max(1,z-.5))}>−</button><span>{Math.round(zoom*100)}%</span><button className="icon-button" aria-label="Zoom in Timeline" title="Zoom in Timeline" onClick={()=>setZoom(z=>Math.min(6,z+.5))}>＋</button><button className="icon-button" aria-label={collapsed?"Expand Timeline":"Collapse Timeline"} title={collapsed?"Expand Timeline":"Collapse Timeline"} onClick={onToggleCollapsed}>{collapsed?"▲":"▼"}</button></div>
    </div>
    {!collapsed&&<div className="timeline-scroll"><div ref={root} className="timeline" style={{width:`${zoom*100}%`,minWidth:"100%"}} onPointerDown={startBox}>
      <div className={`ruler ${rangeMode?"range-mode":""}`} onPointerDown={e=>{if(rangeMode){rangePointer(e);return}const r=e.currentTarget.getBoundingClientRect();setTime(snap(Math.max(0,Math.min(p.duration,(e.clientX-r.left)/r.width*p.duration))))}}>
        {Array.from({length:Math.floor(p.duration)+1},(_,i)=><span key={i} style={{left:`${i/p.duration*100}%`}}>{i}s</span>)}
        {p.dance?.beatGrid&&Array.from({length:Math.floor(p.duration/beatDuration)+1},(_,i)=><em className={`beat-marker ${i%4===0?"downbeat":""}`} key={i} style={{left:`${i*beatDuration/p.duration*100}%`}}><small>{i%4+1}</small></em>)}
        {range&&<i className="timeline-range" style={{left:`${range.start/p.duration*100}%`,width:`${(range.end-range.start)/p.duration*100}%`}}><b>IN</b><b>OUT</b></i>}
        {range&&<><button className="timeline-range-handle in" aria-label="Move range IN" style={{left:`${range.start/p.duration*100}%`}} onPointerDown={e=>moveRangeBoundary("start",e)}>IN</button><button className="timeline-range-handle out" aria-label="Move range OUT" style={{left:`${range.end/p.duration*100}%`}} onPointerDown={e=>moveRangeBoundary("end",e)}>OUT</button></>}
        <i style={{left:`${time/p.duration*100}%`}}/>
      </div>
      {tracks.map(([name,items,label])=><div className={`track ${selected===name?"active":""}`} key={name}><label title={label}>{label}</label><div>
        {items.map((k:any)=>{const token=`${name}:${k.id}`,chosen=selectedSet.has(token),auto=k.source==="AUTO_MOTION",modified=k.source==="AUTO_MOTION_MODIFIED";return <button key={k.id} data-track={name} data-id={k.id} className={`timeline-key ${chosen?"selected":""} ${auto?"auto-motion":""} ${modified?"auto-motion-modified":""}`} title={`${k.time.toFixed(3)}s${auto?" · Auto Motion":modified?" · Auto Motion · manually modified":""}`} style={{left:`${k.time/p.duration*100}%`,transform:drag?.ids.has(token)?`translateX(calc(-50% + ${drag.dx}px)) rotate(45deg)`:undefined}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();if(!chosen)onSelectionChange([{track:name,id:k.id}],"replace");setMenu({x:e.clientX,y:e.clientY})}} onPointerDown={e=>{
          e.stopPropagation();const ref={track:name,id:k.id};
          if(e.shiftKey){onSelectionChange([ref],"toggle");return}
          const active=chosen?selectedKeys:[ref];if(!chosen)onSelectionChange([ref],"replace");
          const el=e.currentTarget.parentElement!,start=e.clientX;let dx=0;
          const ids=new Set(active.map(x=>`${x.track}:${x.id}`));
          const move=(m:PointerEvent)=>{dx=m.clientX-start;setDrag({ids,dx})};
          const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up);setDrag(null);if(Math.abs(dx)>2)onMoveKeys(active,snap(k.time+dx/el.clientWidth*p.duration)-k.time)};
          addEventListener("pointermove",move);addEventListener("pointerup",up);
        }}/>})}
        {name!=="camera"&&name!=="effects"&&name!=="speed"&&(p.motionReviews??[]).filter(i=>i.actorId===name&&i.status!=="resolved").map(issue=><button key={issue.id} className={`motion-issue-marker ${issue.status}`} style={{left:`${issue.time/p.duration*100}%`}} onPointerDown={e=>{e.stopPropagation();onIssue?.(issue.id)}}>{issue.status==="review"?"!":"·"}</button>)}
      </div></div>)}
      <div className="track path-track"><label>〰 Paths</label><div>{(p.motionPaths??[]).map(path=><button key={path.id} title={`${path.name} · ${path.startTime.toFixed(2)}s → ${path.endTime.toFixed(2)}s`} className={`path-range-clip ${selectedPath===path.id?"selected":""}`} style={{left:`${path.startTime/p.duration*100}%`,width:`${Math.max(.4,(path.endTime-path.startTime)/p.duration*100)}%`}} onPointerDown={e=>{e.stopPropagation();onSelectPath(path.id);const host=e.currentTarget.parentElement!,start=e.clientX;let applied=0;const move=(m:PointerEvent)=>{const total=snap(path.startTime+(m.clientX-start)/host.clientWidth*p.duration)-path.startTime,increment=total-applied;if(Math.abs(increment)>.00001){applied=total;onRetimePath(path.id,"move",increment)}};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)}}><i onPointerDown={e=>{e.stopPropagation();const host=e.currentTarget.parentElement!.parentElement!,start=e.clientX;let applied=0;const move=(m:PointerEvent)=>{const total=snap(path.startTime+(m.clientX-start)/host.clientWidth*p.duration)-path.startTime,increment=total-applied;if(Math.abs(increment)>.00001){applied=total;onRetimePath(path.id,"start",increment)}};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)}}/><span><b>◆ {path.name}</b><small>{path.targetType==="character"?p.characters.find(x=>x.id===path.targetId)?.name:p.props?.find(x=>x.id===path.targetId)?.name} · {path.startTime.toFixed(2)} → {path.endTime.toFixed(2)}</small></span><i onPointerDown={e=>{e.stopPropagation();const host=e.currentTarget.parentElement!.parentElement!,start=e.clientX;let applied=0;const move=(m:PointerEvent)=>{const total=snap(path.endTime+(m.clientX-start)/host.clientWidth*p.duration)-path.endTime,increment=total-applied;if(Math.abs(increment)>.00001){applied=total;onRetimePath(path.id,"end",increment)}};const up=()=>{removeEventListener("pointermove",move);removeEventListener("pointerup",up)};addEventListener("pointermove",move);addEventListener("pointerup",up)}}/></button>)}</div></div>
      {box&&<div className="timeline-selection-box" style={{left:Math.min(box.x1,box.x2),top:Math.min(box.y1,box.y2),width:Math.abs(box.x2-box.x1),height:Math.abs(box.y2-box.y1)}}/>}
      {menu&&<div className="timeline-key-menu" style={{left:menu.x,top:menu.y}} onMouseLeave={()=>setMenu(null)}><button onClick={()=>{onEditPose();setMenu(null)}}>Edit Pose</button><button onClick={()=>{onDuplicate();setMenu(null)}}>Duplicate</button><button onClick={()=>{onDuplicateAtPlayhead();setMenu(null)}}>Duplicate at Playhead</button><button onClick={()=>{onCopy();setMenu(null)}}>Copy</button><button onClick={()=>{onPaste();setMenu(null)}}>Paste</button><button className="danger" onClick={()=>{onDelete();setMenu(null)}}>Delete</button></div>}
    </div></div>}
  </div>;
}
