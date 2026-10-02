import { useEffect, useRef, useState } from "react";
import { basePose, clonePose, uid } from "./animation";
import { drawCharacterPreview } from "./CanvasView";
import { createCharacterAsset, duplicateCharacterAsset, loadCharacterLibrary, saveCharacterLibrary } from "./characterAssets";
import type { BodyProfile, CharacterAsset, Project } from "./types";
import "./characterSelect.css";

const profileScale:Record<BodyProfile,number>={standard:1,male:1.04,female:.96,child:.7,large:1.24,small:.82};
const label=(x:string)=>x==="none"?"None":x.replace("-"," ").replace(/\b\w/g,c=>c.toUpperCase());

function previewProject(asset:CharacterAsset):Project{
  const pose=basePose(360,570,false), lean=clonePose(pose), settle=clonePose(pose), scale=profileScale[asset.bodyProfile];
  lean.torso.x+=7;lean.neck.x+=5;lean.head.x+=8;lean.leftWrist.y+=7;lean.rightWrist.y-=5;lean.leftKnee.x-=4;lean.rightHip.x+=3;
  settle.head.x-=4;settle.leftWrist.x-=3;settle.rightWrist.x+=3;
  const actor={id:"preview",name:asset.name,type:"stick_character" as const,preset:asset.bodyProfile,color:asset.appearance.primaryColor,pose,flip:false,scale,rotation:0,visible:true,characterAssetId:asset.id,appearance:structuredClone(asset.appearance),equipment:asset.equipment};
  const project:Project={version:1,name:"Character Preview",duration:2.4,fps:24,format:{label:"1:1",width:720,height:720},characters:[actor],tracks:{preview:[{id:uid(),time:0,pose:clonePose(pose),easing:"ease-in-out",scaleX:scale,scaleY:scale},{id:uid(),time:.8,pose:lean,easing:"ease-in-out",scaleX:scale,scaleY:scale},{id:uid(),time:1.55,pose:settle,easing:"ease-in-out",scaleX:scale,scaleY:scale},{id:uid(),time:2.4,pose:clonePose(pose),easing:"ease-in-out",scaleX:scale,scaleY:scale}]},props:[],propTracks:{},camera:[{id:uid(),time:0,x:360,y:390,zoom:.92,rotation:0,easing:"linear"}],speed:[{id:uid(),time:0,speed:100}],effects:[],background:{top:"#17233c",bottom:"#080d18",grid:true},savedPoses:{},trail:0,dance:{bpm:120,beatGrid:false,snapToBeat:false}};
  if(asset.equipment!=="none"){
    const id="preview_equipment";project.props!.push({id,name:label(asset.equipment),type:asset.equipment,color:asset.appearance.accentColor,visible:true,locked:false,layer:30});
    project.propTracks![id]=[{id:uid(),time:0,x:0,y:0,rotation:0,scaleX:.72,scaleY:.72,flipH:false,opacity:1,attachment:{actorId:"preview",joint:"rightWrist",offsetX:0,offsetY:0,rotation:0},easing:"linear"}];
  }
  return project;
}

function LivePreview({asset}:{asset:CharacterAsset}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let frame=0,start=performance.now();const canvas=ref.current;if(!canvas)return;canvas.width=720;canvas.height=720;const ctx=canvas.getContext("2d")!;const character=previewProject(asset).characters[0];const render=(stamp:number)=>{drawCharacterPreview(ctx,character,(stamp-start)/1000,720,720);frame=requestAnimationFrame(render)};render(start);return()=>cancelAnimationFrame(frame)},[asset]);
  return <div className="character-live-wrap" aria-label={`${asset.name} animated preview`}>
    <canvas className="character-live-canvas" ref={ref} width={720} height={720}/>
  </div>;
}

export function CharacterSelect({onClose,onAdd}:{onClose:()=>void;onAdd:(asset:CharacterAsset)=>void}){
  const [library,setLibrary]=useState(loadCharacterLibrary),[selectedId,setSelectedId]=useState(()=>loadCharacterLibrary()[0]?.id??""),[editing,setEditing]=useState<CharacterAsset|null>(null);
  const selected=library.find(x=>x.id===selectedId)??library[0];
  const persist=(items:CharacterAsset[])=>{setLibrary(items);saveCharacterLibrary(items)};
  const saveEdit=()=>{if(!editing)return;const asset={...editing,name:editing.name.trim()||"Untitled Character",updatedAt:new Date().toISOString()};const items=library.some(x=>x.id===asset.id)?library.map(x=>x.id===asset.id?asset:x):[...library,asset];persist(items);setSelectedId(asset.id);setEditing(null)};
  const startEdit=(asset:CharacterAsset)=>setEditing(asset.id.startsWith("starter_")?duplicateCharacterAsset(asset):structuredClone(asset));
  const draft=editing??selected;
  return <div className="character-select-backdrop" onClick={onClose}>
    <section className="character-select-workspace" onClick={e=>e.stopPropagation()} aria-label="Select Character">
      <header><div><small>CHARACTER LIBRARY</small><h2>{editing?"CREATE / EDIT CHARACTER":"SELECT CHARACTER"}</h2><p>Reusable identities for every kind of scene.</p></div><button className="character-close" onClick={onClose}>×</button></header>
      <div className="character-select-layout">
        <aside className="character-roster"><div className="character-roster-heading"><b>MY CHARACTERS</b><span>{library.length} available</span></div><div className="character-card-grid">
          {library.map(asset=><button key={asset.id} className={`character-card ${selected?.id===asset.id&&!editing?"active":""}`} onClick={()=>{setEditing(null);setSelectedId(asset.id)}}>
            <span className="character-card-figure" style={{color:asset.appearance.primaryColor,borderColor:asset.appearance.accentColor}}>○<i/><em/></span><b>{asset.name}</b><small>{label(asset.bodyProfile)} · {label(asset.appearance.body)}</small>
          </button>)}
          <button className="character-card character-create-card" onClick={()=>setEditing(createCharacterAsset())}><span>＋</span><b>Create Character</b><small>Build a reusable identity</small></button>
        </div></aside>
        <main className="character-detail">
          {draft&&<><div className="character-preview-stage"><LivePreview asset={draft}/><span className="preview-live-dot">● LIVE IDLE</span></div>
          {editing?<div className="character-editor">
            <label>Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
            <label>Body Profile<select value={editing.bodyProfile} onChange={e=>setEditing({...editing,bodyProfile:e.target.value as BodyProfile})}>{["standard","male","female","child","large","small"].map(x=><option key={x} value={x}>{label(x)}</option>)}</select></label>
            <div className="character-color-row"><label>Primary Color<input type="color" value={editing.appearance.primaryColor} onChange={e=>setEditing({...editing,appearance:{...editing.appearance,primaryColor:e.target.value}})}/></label><label>Accent Color<input type="color" value={editing.appearance.accentColor} onChange={e=>setEditing({...editing,appearance:{...editing.appearance,accentColor:e.target.value}})}/></label></div>
            {([["Head","head",["none","headband","hat","hood"]],["Face","face",["none","mask","ninja-mask","glasses"]],["Body","body",["none","scarf","cape"]]] as const).map(([title,key,values])=><label key={key}>{title} Accessory<select value={editing.appearance[key]} onChange={e=>setEditing({...editing,appearance:{...editing.appearance,[key]:e.target.value}})}>{values.map(x=><option key={x} value={x}>{label(x)}</option>)}</select></label>)}
            <label>Equipment<select value={editing.equipment} onChange={e=>setEditing({...editing,equipment:e.target.value as CharacterAsset["equipment"]})}>{["none","sword","knife","staff"].map(x=><option key={x} value={x}>{label(x)}</option>)}</select></label>
            <div className="character-editor-actions"><button onClick={()=>setEditing(null)}>Cancel</button><button className="character-primary" onClick={saveEdit}>Save Character</button></div>
          </div>:<div className="character-summary"><h3>{selected.name}</h3><p><b>{label(selected.bodyProfile)}</b> body profile</p><div className="character-swatches"><i style={{background:selected.appearance.primaryColor}}/><i style={{background:selected.appearance.accentColor}}/><span>{[selected.appearance.head,selected.appearance.face,selected.appearance.body].filter(x=>x!=="none").map(label).join(" · ")||"No accessories"}</span></div><p>Equipment: <b>{label(selected.equipment)}</b></p><div className="character-actions"><button onClick={()=>startEdit(selected)}>Edit Character</button><button onClick={()=>{const copy=duplicateCharacterAsset(selected);persist([...library,copy]);setSelectedId(copy.id)}}>Duplicate</button>{!selected.id.startsWith("starter_")&&<button onClick={()=>{const items=library.filter(x=>x.id!==selected.id);persist(items);setSelectedId(items[0]?.id??"")}}>Delete</button>}<button className="character-primary" onClick={()=>onAdd(selected)}>Add to Scene</button></div></div>}</>}
        </main>
      </div>
    </section>
  </div>;
}
