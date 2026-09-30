import { outputTimeAtSource, sourceTimeAt, uid } from "./animation";
import type { MasterClip, MasterSequence, Project } from "./types";

export const cleanSource = (project: Project) => {
  const source = structuredClone(project);
  delete source.master;
  return source;
};
export const clipOutputRange = (clip: MasterClip) => {
  const start = outputTimeAtSource(clip.source.speed, Math.max(0, clip.in));
  const end = outputTimeAtSource(
    clip.source.speed,
    Math.max(clip.in, Math.min(clip.out, clip.source.duration)),
  );
  return { start, end, duration: Math.max(0, end - start) };
};
export const clipOutputDuration = (clip: MasterClip) =>
  clipOutputRange(clip).duration;
export const masterDuration = (master?: MasterSequence) =>
  master?.clips.reduce((sum, clip) => sum + clipOutputDuration(clip), 0) ?? 0;
export const addClip = (
  master: MasterSequence | undefined,
  project: Project,
  name = project.name,
): MasterSequence => ({
  id: master?.id ?? uid(),
  name: master?.name ?? "Master Sequence",
  format: master?.format ?? structuredClone(project.format),
  clips: [
    ...(master?.clips ?? []),
    {
      id: uid(),
      name,
      source: cleanSource(project),
      in: 0,
      out: project.duration,
      transition: "cut",
    },
  ],
});
export function resolveMaster(master: MasterSequence, masterTime: number) {
  const clamped = Math.max(0, Math.min(masterDuration(master), masterTime));
  let cursor = 0;
  for (let index = 0; index < master.clips.length; index++) {
    const clip = master.clips[index],
      range = clipOutputRange(clip),
      isLast = index === master.clips.length - 1;
    if (clamped < cursor + range.duration || isLast) {
      const clipOutputTime = Math.max(
        0,
        Math.min(range.duration, clamped - cursor),
      );
      const absoluteOutputTime = range.start + clipOutputTime;
      return {
        clip,
        clipIndex: index,
        project: clip.source,
        masterStart: cursor,
        clipOutputTime,
        absoluteOutputTime,
        sourceTime: Math.max(
          clip.in,
          Math.min(clip.out, sourceTimeAt(clip.source.speed, absoluteOutputTime)),
        ),
      };
    }
    cursor += range.duration;
  }
  return null;
}
export function commitMasterClipSource(
  host: Project,
  clipId: string,
  edited: Project,
) {
  const next = structuredClone(host),
    clip = next.master?.clips.find((item) => item.id === clipId);
  if (!clip) throw new Error(`Master clip ${clipId} was not found`);
  clip.source = cleanSource(edited);
  clip.in = Math.min(clip.in, clip.source.duration);
  clip.out = Math.max(clip.in, Math.min(clip.out, clip.source.duration));
  return next;
}
