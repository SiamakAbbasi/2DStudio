import { uid } from "./animation";
import type { Effect, EffectAnimationKey } from "./types";

export interface ResolvedEffectParams {
  scale:number; arc:number; spread:number; range:number; scatterRadius:number; density:number; opacity:number;
}
export const baseEffectParams=(effect:Effect):ResolvedEffectParams=>({
  scale:effect.userScale??effect.strength??1,
  arc:effect.arcDegrees??360,
  spread:(effect.particleSpread??Math.PI)*180/Math.PI,
  range:(effect.particleSpeed??1)*100,
  scatterRadius:effect.scatterRadius??18,
  density:effect.particleCount??10,
  opacity:(effect.opacity??1)*100,
});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const keyParams=(key:EffectAnimationKey):ResolvedEffectParams=>({scale:key.scale,arc:key.arc,spread:key.spread,range:key.range,scatterRadius:key.scatterRadius,density:key.density,opacity:key.opacity});
export function effectParamsAt(effect:Effect,time:number):ResolvedEffectParams{
  const keys=[...(effect.animationKeys??[])].sort((a,b)=>a.time-b.time),base=baseEffectParams(effect);
  if(!keys.length)return base;
  if(time<=keys[0].time)return keyParams(keys[0]);
  if(time>=keys[keys.length-1].time)return keyParams(keys[keys.length-1]);
  const right=keys.findIndex(key=>key.time>=time),a=keys[right-1],b=keys[right],t=(time-a.time)/Math.max(.001,b.time-a.time);
  return {scale:mix(a.scale,b.scale,t),arc:mix(a.arc,b.arc,t),spread:mix(a.spread,b.spread,t),range:mix(a.range,b.range,t),scatterRadius:mix(a.scatterRadius,b.scatterRadius,t),density:mix(a.density,b.density,t),opacity:mix(a.opacity,b.opacity,t)};
}
export function upsertEffectKey(effect:Effect,time:number,patch:Partial<ResolvedEffectParams>={}){
  const values={...effectParamsAt(effect,time),...patch},keys=effect.animationKeys??(effect.animationKeys=[]);
  let key=keys.find(item=>Math.abs(item.time-time)<.02);
  if(key)Object.assign(key,values,{time});
  else {key={id:uid(),time,...values} as EffectAnimationKey;keys.push(key)}
  keys.sort((a,b)=>a.time-b.time);
  effect.duration=Math.max(effect.duration,time-effect.time+.05);
  return key;
}
