import type { Project } from "./types";

export type DirectorSceneDocument = Omit<Project, "director" | "master">;
export const sceneDoc = (project: Project): DirectorSceneDocument => {
  const snapshot = structuredClone(project);
  delete snapshot.director;
  delete snapshot.master;
  return snapshot;
};
export function restoreSceneDoc(project: Project, snapshot: DirectorSceneDocument) {
  const director = project.director,
    master = project.master,
    restored = structuredClone(snapshot) as Project;
  if (director) restored.director = director;
  if (master) restored.master = master;
  return restored;
}
