export type AuthoringEntry={track:string;key:any};
/** Manual copies are ordinary authored keys and never remain generator-owned. */
export function detachManualKey<T extends Record<string,any>>(source:T):T{const copy=structuredClone(source);delete copy.source;delete copy.autoMotionGroupId;delete copy.autoMotionAnchorStartId;delete copy.autoMotionAnchorEndId;delete copy.motionPathId;return copy}
export function duplicateEntries(entries:AuthoringEntry[],base:number,idFactory:()=>string){if(!entries.length)return[];const first=Math.min(...entries.map(entry=>entry.key.time));return entries.map(entry=>({track:entry.track,key:{...detachManualKey(entry.key),id:idFactory(),time:+(base+entry.key.time-first).toFixed(4)}}))}

export type SelectionRetimePlan={anchor:number;speed:number;changes:{track:string;id:string;from:number;to:number}[]};
/** Plans a timestamp-only retime. A plan is returned only when the whole
 * selection can be applied atomically without bounds errors or collisions. */
export function planSelectionRetime(entries:AuthoringEntry[],allByTrack:Record<string,any[]>,speed:number,duration:number):SelectionRetimePlan{
  if(!Number.isFinite(speed)||speed<=0)throw new Error("Speed must be greater than 0.");
  const valid=entries.filter(entry=>entry.key&&Number.isFinite(entry.key.time));
  if(valid.length<2)throw new Error("Select at least two keyframes.");
  const anchor=Math.min(...valid.map(entry=>entry.key.time));
  if(new Set(valid.map(entry=>entry.key.time)).size<2)throw new Error("The selection needs a meaningful time range.");
  const selected=new Set(valid.map(entry=>`${entry.track}:${entry.key.id}`));
  const changes=valid.map(entry=>({track:entry.track,id:entry.key.id as string,from:entry.key.time as number,to:+(anchor+(entry.key.time-anchor)/speed).toFixed(3)}));
  if(changes.some(change=>change.to<0||change.to>duration+.0005))throw new Error("Retimed keyframes would fall outside the Timeline duration.");
  for(const change of changes){
    const collision=(allByTrack[change.track]??[]).find(key=>!selected.has(`${change.track}:${key.id}`)&&Math.abs(key.time-change.to)<.0005);
    if(collision)throw new Error(`Collision on ${change.track} at ${change.to.toFixed(3)}s. Move the selection or existing keyframe first.`);
  }
  return {anchor,speed,changes};
}

export function applySelectionRetimePlan(allByTrack:Record<string,any[]>,plan:SelectionRetimePlan){
  for(const change of plan.changes){const key=(allByTrack[change.track]??[]).find(item=>item.id===change.id);if(key)key.time=change.to}
  for(const track of new Set(plan.changes.map(change=>change.track)))allByTrack[track]?.sort((a,b)=>a.time-b.time);
}
