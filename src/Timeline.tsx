import { useMemo, useRef, useState } from "react";
import type { Project } from "./types";
import { outputDuration } from "./animation";

export type TimelineKeyRef = { track: string; id: string };
type SelectionMode = "replace" | "toggle" | "add";

export function Timeline({p,time,setTime,selected,onMoveKeys,selectedKeys,onSelectionChange,collapsed=false,onToggleCollapsed,onIssue}:{
  p:Project;time:number;setTime:(n:number)=>void;selected:string;
  onMoveKeys:(keys:TimelineKeyRef[],delta:number)=>void;
  selectedKeys:TimelineKeyRef[];
  onSelectionChange:(keys:TimelineKeyRef[],mode:SelectionMode)=>void;
  collapsed?:boolean;onToggleCollapsed?:()=>void;onIssue?:(id:string)=>void;
}) {
  const [zoom,setZoom]=useState(1),[box,setBox]=useState<{x1:number;y1:number;x2:number;y2:number}|null>(null),[drag,setDrag]=useState<{ids:Set<string>;dx:number}|null>(null);
  const root=useRef<HTMLDivElement>(null);
  const beatDuration=60/(p.dance?.bpm??120),snap=(value:number)=>p.dance?.snapToBeat?Math.round(value/beatDuration)*beatDuration:value;
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
  return <div className="timeline-shell">
    <div className="timeline-toolbar"><b>Timeline</b>{selectedKeys.length>0&&<span className="timeline-selection-count">{selectedKeys.length} selected</span>}<span>{p.duration.toFixed(1)}s source · {outputDuration(p.speed,p.duration).toFixed(1)}s output</span><button onClick={()=>setZoom(z=>Math.max(1,z-.5))}>−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(6,z+.5))}>＋</button><button onClick={onToggleCollapsed}>{collapsed?"▲":"▼"}</button></div>
    {!collapsed&&<div className="timeline-scroll"><div ref={root} className="timeline" style={{width:`${zoom*100}%`,minWidth:"100%"}} onPointerDown={startBox}>
      <div className="ruler" onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();setTime(snap(Math.max(0,Math.min(p.duration,(e.clientX-r.left)/r.width*p.duration))))}}>
        {Array.from({length:Math.floor(p.duration)+1},(_,i)=><span key={i} style={{left:`${i/p.duration*100}%`}}>{i}s</span>)}
        {p.dance?.beatGrid&&Array.from({length:Math.floor(p.duration/beatDuration)+1},(_,i)=><em className={`beat-marker ${i%4===0?"downbeat":""}`} key={i} style={{left:`${i*beatDuration/p.duration*100}%`}}><small>{i%4+1}</small></em>)}
        <i style={{left:`${time/p.duration*100}%`}}/>
      </div>
      {tracks.map(([name,items,label])=><div className={`track ${selected===name?"active":""}`} key={name}><label title={label}>{label}</label><div>
        {items.map((k:any)=>{const token=`${name}:${k.id}`,chosen=selectedSet.has(token);return <button key={k.id} data-track={name} data-id={k.id} className={`timeline-key ${chosen?"selected":""}`} title={`${k.time.toFixed(2)}s`} style={{left:`${k.time/p.duration*100}%`,transform:drag?.ids.has(token)?`translateX(calc(-50% + ${drag.dx}px)) rotate(45deg)`:undefined}} onPointerDown={e=>{
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
      {box&&<div className="timeline-selection-box" style={{left:Math.min(box.x1,box.x2),top:Math.min(box.y1,box.y2),width:Math.abs(box.x2-box.x1),height:Math.abs(box.y2-box.y1)}}/>}
    </div></div>}
  </div>;
}
