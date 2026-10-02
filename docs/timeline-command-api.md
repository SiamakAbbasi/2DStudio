# Timeline Command API V1

`src/timelineCommands.ts` is the programmatic entry point for Codex and future Auto Director planning. It is a compiler layer over the existing project tracks; it has no playback state and no AI logic.

## Workflow

1. Convert the request or `ProjectPlan` into a `TimelineSequence`.
2. Call `validateTimelineSequence(currentProject, sequence)`. Stop on any result other than `VALID`.
3. Call `applyTimelineSequence(currentProject, sequence)` once.
4. Commit `result.project` through the same top-level project replacement function used by the UI. One replacement is one Undo transaction.

The input project is never mutated. Generated poses, actions, fights, reactions, cameras and effects become ordinary IDs and keyframes in `Project`, so Timeline editing, deletion, save/load and Undo/Redo keep working normally.

```ts
const sequence = {
  duration: 5,
  commands: [
    {timeMs: 0, type: "POSE", actor: "Character 1", name: "Combat Stance"},
    {timeMs: 400, type: "ACTION", actor: "Character 1", name: "Step Forward"},
    {timeMs: 800, type: "FIGHT_MOVE", attacker: "Character 1", target: "Character 2", name: "Jab", execution: "ATTACKER_ONLY"},
    {timeMs: 1500, type: "FIGHT_MOVE", attacker: "Character 1", target: "Character 2", name: "Roundhouse", execution: "PAIRED"},
  ],
};
const validation = validateTimelineSequence(project, sequence);
if (validation !== "VALID") throw new Error(validation);
const {project: nextProject} = applyTimelineSequence(project, sequence);
replaceProjectKeepingView(nextProject); // exactly one UI Undo entry
```

Single-command helpers are also exported: `addPose`, `addAction`, `addFightMove`, `addReaction`, `addCamera`, `addEffect`, `moveActor`, and `setFacing`.

## Script format

`parseTimelineScript(script, project)` produces the same `TimelineSequence`; it does not execute through a separate path.

```text
@0ms Character 1 POSE Combat Stance
@400ms Character 1 ACTION Step Forward
@800ms Character 1 FIGHT Jab -> Character 2 ATTACKER_ONLY
@1000ms Character 2 REACTION Head Hit
@2200ms CAMERA Impact Push
@2200ms EFFECT Blood Spray — Medium
```

Times are canonical seconds internally. Commands accept exactly one of `time` or `timeMs`. By default all commands insert. `replaceRange` must be supplied explicitly to remove keys/effects in a bounded interval before insertion.

Names resolve only against the real Pose, Action, Fight Move, Reaction, Camera and Combat FX registries. Validation is atomic and includes closest-match suggestions.
