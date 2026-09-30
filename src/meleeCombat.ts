import { uid } from "./animation";
import type { Project, PropKeyframe, SpecialEvent, WeaponHand } from "./types";

export interface SwordMoveSpec {
  id:string; name:string; duration:number; contactTime:number;
  kind:"attack"|"defense"|"clash"|"combo";
  strength:"LIGHT"|"MEDIUM"|"HEAVY"|"SPECIAL";
  range:"Close"|"Mid"|"Long"; trail:string; events:SpecialEvent[];
}
const phase=(a:string,c:string,f:string,r="sword_recovery",contact=.42,duration=1):SpecialEvent[]=>[
  {time:0,type:"pose",pose:a},{time:contact,type:"pose",pose:c},{time:contact+.18,type:"pose",pose:f},
  {time:duration-.16,type:"pose",pose:r},{time:contact,type:"impact",strength:.72},
  {time:contact+.03,type:"pose",fighter:"defender",pose:"sword_hit_reaction"},
  {time:Math.min(duration-.08,contact+.38),type:"pose",fighter:"defender",pose:"sword_defensive_guard"},
];
export const swordMoves:SwordMoveSpec[]=[
  {id:"sword_horizontal",name:"Horizontal Slash",duration:1,contactTime:.42,kind:"attack",strength:"MEDIUM",range:"Mid",trail:"wide_white_arc",events:phase("sword_ready_side","sword_slash_horizontal_contact","sword_slash_horizontal_follow")},
  {id:"sword_diagonal",name:"Diagonal Slash",duration:.95,contactTime:.4,kind:"attack",strength:"MEDIUM",range:"Mid",trail:"classic_slash",events:phase("sword_guard_high","sword_slash_diagonal_contact","sword_slash_horizontal_follow","sword_recovery",.4,.95)},
  {id:"sword_overhead",name:"Overhead Slash",duration:1.15,contactTime:.52,kind:"attack",strength:"HEAVY",range:"Mid",trail:"heavy_slash",events:phase("sword_ready_overhead","sword_slash_diagonal_contact","sword_guard_low","sword_recovery",.52,1.15)},
  {id:"sword_low",name:"Low Slash",duration:1,contactTime:.46,kind:"attack",strength:"MEDIUM",range:"Mid",trail:"sharp_blade",events:phase("sword_guard_low","sword_slash_low_contact","sword_slash_horizontal_follow","sword_recovery",.46,1)},
  {id:"sword_thrust",name:"Forward Thrust",duration:.9,contactTime:.4,kind:"attack",strength:"MEDIUM",range:"Long",trail:"thrust_trail",events:phase("sword_thrust_anticipation","sword_thrust_contact","sword_guard_mid","sword_neutral",.4,.9)},
  {id:"sword_lunge",name:"Lunge Slash",duration:1.15,contactTime:.5,kind:"attack",strength:"HEAVY",range:"Long",trail:"speed_slash",events:[...phase("sword_ready_side","sword_lunge_contact","sword_slash_horizontal_follow","sword_recovery",.5,1.15),{time:.15,type:"moveRoot",x:135,y:0,duration:.35}]},
  {id:"sword_spin",name:"Spinning Slash",duration:1.35,contactTime:.7,kind:"attack",strength:"SPECIAL",range:"Mid",trail:"anime_slash",events:[...phase("sword_ready_side","sword_spin_contact","sword_slash_horizontal_contact","sword_recovery",.7,1.35),{time:.18,type:"rotation",rotation:360,duration:.68}]},
  {id:"sword_rising",name:"Rising Slash",duration:1.1,contactTime:.5,kind:"attack",strength:"HEAVY",range:"Close",trail:"energy_slash",events:[...phase("sword_guard_low","sword_slash_diagonal_contact","sword_guard_high","sword_recovery",.5,1.1),{time:.52,type:"launch",fighter:"defender",x:30,y:-115,duration:.3}]},
  {id:"sword_parry",name:"Parry",duration:.72,contactTime:.34,kind:"defense",strength:"LIGHT",range:"Close",trail:"sharp_blade",events:[{time:0,type:"pose",pose:"sword_defensive_guard"},{time:.3,type:"pose",pose:"sword_parry_left"},{time:.34,type:"effect",target:"clash",strength:.7},{time:.58,type:"pose",pose:"sword_guard_mid"}]},
  {id:"sword_block",name:"Weapon Block",duration:.8,contactTime:.38,kind:"defense",strength:"MEDIUM",range:"Close",trail:"classic_slash",events:[{time:0,type:"pose",pose:"sword_guard_mid"},{time:.3,type:"pose",pose:"sword_clash"},{time:.38,type:"effect",target:"clash",strength:1},{time:.65,type:"pose",pose:"sword_defensive_guard"}]},
  {id:"sword_clash_move",name:"Weapon Clash",duration:.95,contactTime:.42,kind:"clash",strength:"HEAVY",range:"Close",trail:"heavy_slash",events:[{time:0,type:"pose",pose:"sword_ready_side"},{time:.4,type:"pose",pose:"sword_clash"},{time:.4,type:"pose",fighter:"defender",pose:"sword_clash"},{time:.42,type:"effect",target:"clash",strength:1.25},{time:.7,type:"pose",pose:"sword_recovery"},{time:.7,type:"pose",fighter:"defender",pose:"sword_recovery"}]},
  {id:"sword_three_hit",name:"Three Slash Combination",duration:2.05,contactTime:.42,kind:"combo",strength:"SPECIAL",range:"Mid",trail:"anime_slash",events:[...phase("sword_ready_side","sword_slash_horizontal_contact","sword_slash_horizontal_follow","sword_guard_high",.42,.85),{time:.86,type:"pose",pose:"sword_slash_diagonal_contact"},{time:.88,type:"impact",strength:.68},{time:1.2,type:"pose",pose:"sword_ready_overhead"},{time:1.52,type:"pose",pose:"sword_slash_low_contact"},{time:1.54,type:"impact",strength:1.05},{time:1.88,type:"pose",pose:"sword_recovery"}]},
  {id:"sword_parry_riposte",name:"Parry → Riposte",duration:1.35,contactTime:.82,kind:"combo",strength:"HEAVY",range:"Close",trail:"sharp_blade",events:[{time:0,type:"pose",pose:"sword_defensive_guard"},{time:.3,type:"pose",pose:"sword_parry_left"},{time:.32,type:"effect",target:"clash",strength:.8},{time:.52,type:"pose",pose:"sword_thrust_anticipation"},{time:.82,type:"pose",pose:"sword_thrust_contact"},{time:.83,type:"impact",strength:.9},{time:.86,type:"pose",fighter:"defender",pose:"sword_hit_reaction"},{time:1.18,type:"pose",pose:"sword_guard_mid"}]},
  {id:"sword_block_counter",name:"Block → Counter Slash",duration:1.45,contactTime:.88,kind:"combo",strength:"HEAVY",range:"Close",trail:"heavy_slash",events:[{time:0,type:"pose",pose:"sword_clash"},{time:.25,type:"effect",target:"clash",strength:1},{time:.48,type:"pose",pose:"sword_ready_overhead"},{time:.88,type:"pose",pose:"sword_slash_diagonal_contact"},{time:.9,type:"impact",strength:1},{time:.94,type:"pose",fighter:"defender",pose:"sword_hit_reaction"},{time:1.25,type:"pose",pose:"sword_recovery"}]},
  {id:"sword_spin_combo",name:"Spin → Slash → Thrust",duration:2.15,contactTime:.72,kind:"combo",strength:"SPECIAL",range:"Mid",trail:"anime_slash",events:[{time:0,type:"pose",pose:"sword_ready_side"},{time:.12,type:"rotation",rotation:360,duration:.62},{time:.7,type:"pose",pose:"sword_spin_contact"},{time:.72,type:"impact",strength:.75},{time:1.05,type:"pose",pose:"sword_thrust_anticipation"},{time:1.48,type:"pose",pose:"sword_thrust_contact"},{time:1.5,type:"impact",strength:1.1},{time:1.54,type:"pose",fighter:"defender",pose:"sword_hit_reaction"},{time:1.92,type:"pose",pose:"sword_recovery"}]},
  {id:"sword_lunge_finisher",name:"Heavy Lunge Finisher",duration:1.7,contactTime:.82,kind:"combo",strength:"SPECIAL",range:"Long",trail:"energy_slash",events:[{time:0,type:"pose",pose:"sword_guard_low"},{time:.28,type:"pose",pose:"sword_ready_side"},{time:.38,type:"moveRoot",x:165,y:0,duration:.42},{time:.8,type:"pose",pose:"sword_lunge_contact"},{time:.82,type:"impact",strength:1.25},{time:.85,type:"launch",fighter:"defender",x:150,y:-30,duration:.38},{time:1.2,type:"pose",pose:"sword_slash_horizontal_follow"},{time:1.5,type:"pose",pose:"sword_recovery"}]},
];

export function swordPropId(actorId:string){return `sword-${actorId}`}
export function ensureSword(project:Project,actorId:string,hand:WeaponHand="right",time=0){
  const p=structuredClone(project), id=swordPropId(actorId);
  p.props??=[]; p.propTracks??={};
  if(!p.props.some(x=>x.id===id))p.props.push({id,name:`${p.characters.find(c=>c.id===actorId)?.name??"Actor"} Sword`,type:"sword",color:"#dcecff",visible:true,locked:false,layer:12});
  const current=p.propTracks[id]?.[0];
  const key:PropKeyframe={id:uid(),time,easing:"linear",x:0,y:0,rotation:0,scaleX:1,scaleY:1,flipH:false,opacity:1,attachment:{actorId,joint:hand==="left"?"leftWrist":"rightWrist",offsetX:0,offsetY:0,rotation:0}};
  if(!current)p.propTracks[id]=[key];
  return p;
}
