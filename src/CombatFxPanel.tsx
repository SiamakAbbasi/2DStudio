import { useEffect, useRef, useState } from "react";
import {
  addCombatFx,
  combatFxPresets,
  defaultCombatFxSettings,
} from "./combatFx";
import { poseAt } from "./animation";
import type { CombatFxPreset } from "./combatFx";
import type { CombatFxSettings, Project } from "./types";

function FxAnimatedPreview({preset,size,spread,amount,distance,opacity,arc,scatter}:{preset:CombatFxPreset;size:number;spread:number;amount:number;distance:number;opacity:number;arc:number;scatter:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let frame=0,raf=0;const draw=()=>{const c=ref.current;if(!c)return;const x=c.getContext("2d");if(!x)return;const w=c.width,h=c.height,t=(frame++%72)/72,p=Math.sin(t*Math.PI),scale=size/100,range=distance/100;x.clearRect(0,0,w,h);x.fillStyle="#09111b";x.fillRect(0,0,w,h);x.save();x.translate(w/2,h/2);x.globalAlpha=(.3+.7*p)*opacity/100;x.strokeStyle=preset.color??"#fff";x.fillStyle=preset.color??"#fff";x.shadowColor=preset.color??"#fff";x.shadowBlur=12*p*scale;
    if(preset.type==="aura"){const sweep=arc*Math.PI/180,rad=(22+scatter*.35)*scale*range;x.lineWidth=Math.max(2,4*scale);x.rotate(t*Math.PI*.45);if(preset.auraStyle==="ring"||preset.auraStyle==="vortex"){for(let j=0;j<(preset.auraStyle==="vortex"?3:1);j++){x.beginPath();x.arc(0,0,rad+j*7*scale,-sweep/2,sweep/2);x.stroke()}}else{const count=Math.max(5,Math.min(28,amount));for(let i=0;i<count;i++){const a=-sweep/2+i/Math.max(1,count-1)*sweep,r=rad+(i%3)*scatter*.12,x1=Math.cos(a)*r*.45,y1=Math.sin(a)*r*.72,len=(8+scatter*.35*(.5+p))*range;x.beginPath();x.moveTo(x1,y1);x.lineTo(Math.cos(a)*(r+len),Math.sin(a)*(r+len));x.stroke()}}}
    else if(preset.type==="motionTrail"){x.lineCap="round";x.lineWidth=Math.max(3,(preset.width??35)/5*scale);x.beginPath();x.arc(-8,8,35*scale,-2.4,-2.4+3.8*t);x.stroke();if(preset.secondaryColor){x.strokeStyle=preset.secondaryColor;x.lineWidth=3*scale;x.stroke()}}
    else if(preset.type==="flash"||preset.type==="shockwave"||preset.type==="clash"){x.lineWidth=3*scale;x.beginPath();x.arc(0,0,(8+36*t)*scale,0,Math.PI*2);x.stroke();for(let i=0;i<Math.min(24,amount);i++){const a=i*Math.PI*2/Math.max(1,amount),l=(12+30*p)*distance/100*scale;x.beginPath();x.moveTo(Math.cos(a)*8,Math.sin(a)*8);x.lineTo(Math.cos(a)*l,Math.sin(a)*l);x.stroke()}}
    else {const count=amount,arc=spread*Math.PI/180,range=distance/100;for(let i=0;i<count;i++){const a=-arc/2+(i/Math.max(1,count-1))*arc,d=(18+i%4*8)*t*range;x.beginPath();x.arc(Math.cos(a)*d,Math.sin(a)*d+20*t*t,Math.max(1,(2+i%3)*scale),0,Math.PI*2);x.fill()}}
    x.restore();raf=requestAnimationFrame(draw)};draw();return()=>cancelAnimationFrame(raf)},[preset,size,spread,amount,distance,opacity,arc,scatter]);
  return <canvas ref={ref} width={180} height={82} aria-label={`${preset.name} animated preview`}/>;
}

export function CombatFxPanel({
  project,
  actor,
  time,
  onClose,
  onApply,
  onSeek,
}: {
  project: Project;
  actor: string;
  time: number;
  onClose: () => void;
  onApply: (p: Project) => void;
  onSeek: (time:number) => void;
}) {
  const [category, setCategory] = useState("All"),
    [selectedActor, setSelectedActor] = useState(
      actor || project.characters[0]?.id || "",
    ),
    [applied, setApplied] = useState(""),[appliedId,setAppliedId]=useState(""),
    [attachment,setAttachment]=useState<"world"|"actor">("world"),
    [anchor,setAnchor]=useState<"preset"|"head"|"torso"|"custom">("custom"),
    [customX,setCustomX]=useState(()=>project.tracks[actor]?Math.round(poseAt(project.tracks[actor],time).root.x):Math.round(project.format.width/2)),
    [customY,setCustomY]=useState(()=>project.tracks[actor]?Math.round(poseAt(project.tracks[actor],time).root.y):Math.round(project.format.height/2)),
    [spacing,setSpacing]=useState(.15),[size,setSize]=useState(100),[spread,setSpread]=useState(55),[amount,setAmount]=useState(10),[distance,setDistance]=useState(100),[opacity,setOpacity]=useState(100),[arc,setArc]=useState(360),[scatter,setScatter]=useState(18);
  const settings = project.combatFx ?? defaultCombatFxSettings,
    categories = ["All", ...new Set(combatFxPresets.map((p) => p.category))];
  const updateSettings = (patch: Partial<CombatFxSettings>) =>
    onApply({
      ...structuredClone(project),
      combatFx: { ...settings, ...patch },
    });
  const pointFor=(preset:CombatFxPreset)=>{const track=project.tracks[selectedActor],pose=track?poseAt(track,time):undefined;if(attachment==="world"||anchor==="custom")return{x:customX,y:customY};if(anchor==="head"&&pose)return pose.head;if(anchor==="torso"&&pose)return pose.torso;if(anchor==="preset")return undefined;return pose?.root};
  const tune=(effect:Project["effects"][number])=>{const nextScale=size/100;effect.strength=nextScale;effect.userScale=nextScale;effect.opacity=opacity/100;effect.particleSpread=spread*Math.PI/180;effect.particleCount=amount;effect.particleSpeed=distance/100;effect.arcDegrees=arc;effect.scatterRadius=scatter;effect.x=customX;effect.y=customY;if(attachment==="world"){effect.targetFighter=undefined;effect.trackedProp=undefined}else effect.targetFighter=selectedActor};
  const applyPreset=(preset:CombatFxPreset,advance=false)=>{const next=addCombatFx(project,preset,attachment==="actor"?selectedActor:undefined,time,pointFor(preset));if(next.effects.length===project.effects.length){setApplied("FX Intensity is OFF — enable it first");return}const effect=next.effects[next.effects.length-1];tune(effect);onApply(next);setApplied(preset.name);setAppliedId(effect.id);if(advance)onSeek(Math.min(next.duration,time+spacing))};
  const updatePlaced=()=>{const next=structuredClone(project),effect=next.effects.find(e=>e.id===appliedId);if(!effect)return;tune(effect);onApply(next);setApplied("FX object updated")};
  const selectPlaced=(id:string)=>{setAppliedId(id);const e=project.effects.find(x=>x.id===id);if(!e)return;setCustomX(Math.round(e.x));setCustomY(Math.round(e.y));setSize(Math.round((e.userScale??1)*100));setSpread(Math.round((e.particleSpread??.96)*180/Math.PI));setAmount(e.particleCount??10);setDistance(Math.round((e.particleSpeed??1)*100));setOpacity(Math.round((e.opacity??1)*100));setArc(e.arcDegrees??360);setScatter(e.scatterRadius??18);setAttachment(e.targetFighter?"actor":"world");if(e.targetFighter)setSelectedActor(e.targetFighter)};
  return (
    <div className="combat-backdrop">
      <section className="combat-workspace">
        <header>
          <div>
            <b>✦ COMBAT FX</b>
            <small>Place independent World FX or attach effects to an actor</small>
          </div>
          <button onClick={onClose}>×</button>
        </header>
        <div className="combat-howto" aria-label="Combat FX workflow">
          <div><b>1</b><span><strong>Place Object</strong><small>World position or actor attachment</small></span></div>
          <i>→</i>
          <div><b>2</b><span><strong>Choose Effect</strong><small>Trail, impact, particles or clash</small></span></div>
          <i>→</i>
          <div><b>3</b><span><strong>Apply</strong><small>Creates an Effect key at {time.toFixed(2)}s</small></span></div>
        </div>
        <div className="fx-object-controls">
          <b>FX Object Controls</b>
          <label>Size <output>{size}%</output><input type="range" min="25" max="250" step="5" value={size} onChange={e=>setSize(+e.target.value)}/></label>
          <label>Spread <output>{spread}°</output><input type="range" min="10" max="180" step="5" value={spread} onChange={e=>setSpread(+e.target.value)}/></label>
          <label>Density <output>{amount}</output><input type="range" min="3" max="24" step="1" value={amount} onChange={e=>setAmount(+e.target.value)}/></label>
          <label>Range <output>{distance}%</output><input type="range" min="35" max="220" step="5" value={distance} onChange={e=>setDistance(+e.target.value)}/></label>
          <label>Arc <output>{arc}°</output><input type="range" min="10" max="360" step="5" value={arc} onChange={e=>setArc(+e.target.value)}/></label>
          <label>Scatter Radius <output>{scatter}</output><input type="range" min="0" max="160" step="2" value={scatter} onChange={e=>setScatter(+e.target.value)}/></label>
          <label>Opacity <output>{opacity}%</output><input type="range" min="10" max="100" step="5" value={opacity} onChange={e=>setOpacity(+e.target.value)}/></label>
          <div className="placed-fx-editor"><select aria-label="Placed FX Object" value={appliedId} onChange={e=>selectPlaced(e.target.value)}><option value="">New FX Object…</option>{project.effects.filter(e=>e.preset).map((e,i)=><option key={e.id} value={e.id}>{i+1}. {combatFxPresets.find(p=>p.id===e.preset)?.name??e.type} · {e.time.toFixed(2)}s</option>)}</select><button disabled={!appliedId} onClick={updatePlaced}>Update Selected FX</button></div>
        </div>
        <div className="combat-settings">
          <label>Object Mode<select value={attachment} onChange={e=>setAttachment(e.target.value as typeof attachment)}><option value="world">World Object (Independent)</option><option value="actor">Attached to Actor</option></select></label>
          {attachment==="actor"&&<label>
            Attached Actor
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
            >
              {project.characters.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>}
          {attachment==="actor"&&<label>Position Anchor<select value={anchor} onChange={e=>setAnchor(e.target.value as typeof anchor)}><option value="preset">Preset / Tracked Joint</option><option value="head">Actor Head</option><option value="torso">Actor Torso</option><option value="custom">Custom X / Y</option></select></label>}
          {(attachment==="world"||anchor==="custom")&&<><label>World X<input type="number" value={customX} onChange={e=>setCustomX(+e.target.value)}/></label><label>World Y<input type="number" value={customY} onChange={e=>setCustomY(+e.target.value)}/></label></>}
          <label>Advance After Add (s)<input type="number" min="0" step=".05" value={spacing} onChange={e=>setSpacing(Math.max(0,+e.target.value))}/></label>
          <label>
            FX Intensity
            <select
              value={settings.intensity}
              onChange={(e) =>
                updateSettings({
                  intensity: e.target.value as CombatFxSettings["intensity"],
                })
              }
            >
              {["OFF", "LOW", "MEDIUM", "HIGH", "ARCADE"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Blood
            <select
              value={settings.blood ?? "OFF"}
              onChange={(e) =>
                updateSettings({
                  blood: e.target.value as CombatFxSettings["blood"],
                })
              }
            >
              {["OFF", "LOW", "MEDIUM", "HIGH"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="combat-check"><input
              type="checkbox"
              checked={settings.hitParticles}
              onChange={(e) =>
                updateSettings({ hitParticles: e.target.checked })
              }
            /><span><b>Hit Particles</b><small>Show stylized particles on contact</small></span></span>
          </label>
          <label>
            <span className="combat-check"><input
              type="checkbox"
              checked={settings.autoWeaponTrail}
              onChange={(e) =>
                updateSettings({ autoWeaponTrail: e.target.checked })
              }
            /><span><b>Auto Weapon Trail</b><small>Only shows while the weapon moves fast enough</small></span></span>
          </label>
        </div>
        <div className="combat-browser-head"><div><b>Effect Library</b><small>Select a category, then apply a preset</small></div><output>{applied ? `✓ ${applied} added at ${time.toFixed(2)}s` : `Playhead ${time.toFixed(2)}s`}</output></div>
        <nav className="combat-categories">
          {categories.map((c) => (
            <button
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </nav>
        <main className="combat-grid">
          {combatFxPresets
            .filter((p) => category === "All" || p.category === category)
            .map((p) => (
              <article key={p.id}>
                <div className={`fx-preview ${p.type}`} style={{ color: p.color }}><FxAnimatedPreview preset={p} size={size} spread={spread} amount={amount} distance={distance} opacity={opacity} arc={arc} scatter={scatter}/></div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <small>
                  {p.category} · {p.duration}s
                  {p.minimumVelocity ? ` · velocity ${p.minimumVelocity}+` : ""}
                </small>
                <div className="fx-add-actions"><button onClick={()=>applyPreset(p)}>＋ Add at {time.toFixed(2)}s</button><button title={`Add and move ${spacing.toFixed(2)} seconds forward`} onClick={()=>applyPreset(p,true)}>＋ Next</button></div>
              </article>
            ))}
        </main>
      </section>
    </div>
  );
}
