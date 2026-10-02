# Codex Timeline Control

This is the supported way for Codex to change the timeline in the currently open development project. Do not edit LocalStorage, project JSON, or click UI controls with browser automation.

## Apply from Codex

Keep `npm run dev` and the Studio browser tab open. Create a JSON sequence, then run:

```powershell
npm run sequence -- sequences/my-sequence.json
```

Before generating a sequence, Codex can read the open Project name, actor IDs, displayed names and current keyframe counts with:

```powershell
npm run sequence -- --status
```

The CLI sends the definition to the Studio dev bridge. The open app validates it against its current Project, compiles it through `src/timelineCommands.ts`, commits the returned Project once, and reports success or the complete validation error back to the CLI. A sequence is therefore one Undo/Redo transaction.

For a server at another address:

```powershell
$env:STUDIO_URL='http://127.0.0.1:5174'; npm run sequence -- sequences/my-sequence.json
```

## Sequence schema

Top level:

```json
{"duration": 4, "commands": []}
```

`durationMs` is also accepted. Commands require exactly one of `time` (seconds) or `timeMs` (milliseconds). Canonical internal time is seconds.

Supported command types:

- `POSE`: `actor`, `name`, optional `orientation`
- `ACTION`: `actor`, `name`
- `FIGHT_MOVE`: `attacker`, optional `target`, `name`, `execution`
- `REACTION`: `actor`, `name`
- `CAMERA`: registry `name` and/or `values`, optional `actor` focus
- `EFFECT`: registry `name`, optional `actor`, `x`, `y`
- `MOVE_ACTOR`: `actor` plus absolute `x`/`y` or relative `dx`/`dy`
- `SET_FACING`: `actor`, `facing` (`LEFT` or `RIGHT`), optional `target`

Actors resolve case-insensitively by exact ID or displayed name. Pose, Action, Fight Move, Reaction, Camera and Effect names resolve only against their real registries. Invalid values fail the complete sequence before any mutation and include closest matches.

Pose orientation values:

- `FRONT`
- `THREE_QUARTER_LEFT`
- `SIDE_LEFT`
- `THREE_QUARTER_RIGHT`
- `SIDE_RIGHT`

`ATTACKER_ONLY` modifies only the attacker. A target may be supplied solely for automatic facing. `PAIRED` requires a target and compiles both participants.

## Insert, replace and safety

The default is INSERT and preserves existing work. Replacement must be explicit:

```json
{"replaceRange":{"startMs":500,"endMs":2500},"commands":[]}
```

The app validates before applying anything. One successful sequence application calls the normal project replacement path exactly once, so Undo removes the whole sequence and Redo restores it. All generated data is ordinary editable Timeline keyframes, cameras and effects, and survives project save/load.

## Manual fallback

Use the `⌁` button in the top toolbar (**Import / Apply Timeline Sequence**) and select the same JSON file. This uses the identical validation and compiler path.

## Example

See `sequences/acceptance-attacker-only.json`. Adapt actor names to the names currently displayed in the Scene panel before running it.
