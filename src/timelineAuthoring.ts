export type AuthoringEntry={track:string;key:any};
/** Manual copies are ordinary authored keys and never remain generator-owned. */
export function detachManualKey<T extends Record<string,any>>(source:T):T{const copy=structuredClone(source);delete copy.source;delete copy.autoMotionGroupId;delete copy.autoMotionAnchorStartId;delete copy.autoMotionAnchorEndId;delete copy.motionPathId;return copy}
export function duplicateEntries(entries:AuthoringEntry[],base:number,idFactory:()=>string){if(!entries.length)return[];const first=Math.min(...entries.map(entry=>entry.key.time));return entries.map(entry=>({track:entry.track,key:{...detachManualKey(entry.key),id:idFactory(),time:+(base+entry.key.time-first).toFixed(4)}}))}
