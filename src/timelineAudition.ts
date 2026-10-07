import { applyFightMoveSequence, fightMoves, type FightExecutionMode, type FightSettings } from "./fightDirector";
import type { Project } from "./types";

export interface TimelineAuditionItem {
  moveId: string;
  attacker: string;
  target?: string;
  execution: FightExecutionMode;
  autoFaceTarget: boolean;
}

export interface TimelineAuditionSession {
  id: string;
  start: number;
  duration: number;
  naturalDuration: number;
  items: TimelineAuditionItem[];
  settings: FightSettings;
}

export interface TimelineAuditionClip {
  id: string;
  label: string;
  start: number;
  end: number;
  attacker: string;
}

export interface TimelineAuditionResult {
  project: Project;
  clips: TimelineAuditionClip[];
  end: number;
}

export const auditionNaturalDuration = (items: TimelineAuditionItem[]) =>
  items.reduce((total, item, index) => total + (fightMoves.find(move => move.id === item.moveId)?.duration ?? 0) + (index < items.length - 1 ? .3 : 0), 0);

export function createTimelineAudition(items: TimelineAuditionItem[], start: number, settings: FightSettings): TimelineAuditionSession {
  const naturalDuration = Math.max(.05, auditionNaturalDuration(items));
  return { id: crypto.randomUUID(), start, duration: naturalDuration, naturalDuration, items: structuredClone(items), settings: structuredClone(settings) };
}

const ids = (values: {id:string}[] | undefined) => new Set((values ?? []).map(value => value.id));
const scaleNewTimes = (before: Project, next: Project, origin: number, scale: number) => {
  const scaleTime = (value:number) => origin + (value-origin)*scale;
  for (const [actor, track] of Object.entries(next.tracks)) {
    const prior=ids(before.tracks[actor]);
    track.forEach(key=>{if(!prior.has(key.id))key.time=scaleTime(key.time)});
    track.sort((a,b)=>a.time-b.time);
  }
  for (const [prop, track] of Object.entries(next.propTracks ?? {})) {
    const prior=ids(before.propTracks?.[prop]);
    track.forEach(key=>{if(!prior.has(key.id))key.time=scaleTime(key.time)});
    track.sort((a,b)=>a.time-b.time);
  }
  for (const field of ["camera","speed","effects"] as const) {
    const prior=ids(before[field]);
    next[field].forEach(key=>{if(!prior.has(key.id))key.time=scaleTime(key.time)});
    next[field].sort((a,b)=>a.time-b.time);
  }
  const priorFights=ids(before.fights);
  next.fights?.forEach(fight=>{if(!priorFights.has(fight.id)){fight.startTime=scaleTime(fight.startTime);fight.endTime=scaleTime(fight.endTime)}});
};

/** Builds a disposable render project. The source project is never mutated and
 * no audition metadata is written into serializable project data. */
export function evaluateTimelineAudition(source: Project, session: TimelineAuditionSession): TimelineAuditionResult {
  let project=structuredClone(source), cursor=session.start;
  const ratio=session.duration/session.naturalDuration, clips:TimelineAuditionClip[]=[];
  session.items.forEach((item,index)=>{
    const move=fightMoves.find(candidate=>candidate.id===item.moveId);
    if(!move)return;
    const itemDuration=move.duration*ratio, before=project;
    project=applyFightMoveSequence(project,item.attacker,item.target,cursor,session.settings,[item.moveId],item.execution,item.autoFaceTarget);
    scaleNewTimes(before,project,cursor,ratio);
    clips.push({id:`${session.id}:${index}`,label:move.name,start:cursor,end:cursor+itemDuration,attacker:item.attacker});
    cursor=Math.round((cursor+itemDuration+(index < session.items.length-1 ? .3*ratio : 0))*1000)/1000;
  });
  project.duration=Math.max(source.duration,cursor);
  return {project,clips,end:cursor};
}

export const auditionWindow = (project:Project, session:TimelineAuditionSession) => {
  const end=session.start+session.duration;
  return {start:Math.max(0,session.start-.6),end:Math.min(Math.max(project.duration,end),end+.5)};
};
