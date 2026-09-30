# 2D Flip Studio — Animation Director

Special Moves are JSON generators stored in `src/specialMoves/*.json`. Adding a valid JSON file and rebuilding makes it appear automatically under **SPECIAL**; no React source edit is required.

## SpecialMove schema

```json
{
  "id": "unique_snake_case_id",
  "name": "Readable Name",
  "category": "Featured | Combo | Throw | Tether | Elemental | Air | Acrobatic | Finisher",
  "duration": 2.4,
  "description": "Short hover description",
  "events": []
}
```

Times are seconds relative to the insertion playhead. `fighter` is `attacker` (default) or `defender`. The selected fighter is attacker and the other fighter is defender. Positive X movement follows authored screen direction; attacker movement is mirrored automatically when facing left.

## Event types

- `action`: `{ "time":0, "type":"action", "action":"Straight Punch", "scale":0.55 }`
- `pose`: `{ "time":0.2, "type":"pose", "pose":"kick_chamber_side", "easing":"ease-in" }`
- `moveRoot`: root translation with `x`, `y`, `duration`, `easing`.
- `grab` / `attach`: moves the attacker's active wrist to the defender neck anchor. Use before synchronized movement.
- `detach`: ends the authored grab phase; following defender events are independent.
- `tether`: visual tether with `style`: `line`, `rope`, `chain`, or `energy`.
- `pull`: real defender root translation toward the attacker.
- `launch`: curved authored launch using `x`, `y`, `duration`, and optional `rotation`.
- `rotation`: rotates the complete pose around its root. Use signed degrees such as `360`, `540`, or `-360`.
- `status`: target `frozen` or `stunned`, with `duration` and `strength` from 0–1.
- `wallBounce` / `groundBounce`: editable root trajectory keyframes.
- `effect`: target `flash`, `shockwave`, `lines`, `dust`, or `shake`.
- `impact`: centralized flash, shockwave and shake scaled by `strength` 0–1.
- `camera`: preset `wide_both`, `push_in`, `impact_zoom`, `airborne_follow`, or `shake_light|medium|heavy`.
- `speed`: global time-remap percentage, normally 10–250.

## Timing conventions

- Anticipation: 15–30% of a move.
- Contact: short SNAP transition followed by a 20–40 ms HOLD.
- Matrix impact: 100% → 20–35% pre-impact → 10–25% contact → 150–250% release → 100%.
- Rapid-combo action `scale`: commonly 0.35–0.65.
- Root Y is downward; negative Y launches upward.

## Example: simple launcher

```json
{"id":"my_launcher","name":"My Launcher","category":"Combo","duration":1.4,"description":"Punch and launch.","events":[
  {"time":0,"type":"action","action":"Uppercut","scale":0.7},
  {"time":0.3,"type":"impact","strength":0.8},
  {"time":0.32,"type":"launch","fighter":"defender","x":80,"y":-300,"duration":0.6}
]}
```

## Example: grab and throw

```json
{"id":"my_throw","name":"My Throw","category":"Throw","duration":2,"description":"Grab, spin and release.","events":[
  {"time":0.2,"type":"grab"},
  {"time":0.45,"type":"launch","y":-180,"duration":0.5},
  {"time":0.45,"type":"launch","fighter":"defender","y":-180,"duration":0.5},
  {"time":0.6,"type":"rotation","rotation":360,"duration":0.7},
  {"time":1.3,"type":"launch","fighter":"defender","x":220,"y":260,"duration":0.5},
  {"time":1.75,"type":"groundBounce","fighter":"defender","y":80,"duration":0.3}
]}
```

## Example: tether freeze finisher

```json
{"id":"my_tether_freeze","name":"Tether Freeze","category":"Elemental","duration":2.2,"description":"Pull, freeze and strike.","events":[
  {"time":0,"type":"tether","style":"energy","duration":1.1},
  {"time":0.3,"type":"pull","fighter":"defender","x":-220,"duration":0.5},
  {"time":0.75,"type":"status","fighter":"defender","target":"frozen","duration":0.7},
  {"time":1,"type":"action","action":"Straight Punch","scale":0.6},
  {"time":1.3,"type":"impact","strength":1}
]}
```

All generated Fighter, Camera, Speed and Effect keyframes remain editable on the normal timeline. One Undo removes an entire insertion.
# Generic Scene Architecture (v2)

## Dance library and timing

Dance is Action/Pose metadata on the same Actor timeline—not a separate engine.
Dance poses use `category: "Dance"`, a `style`, and reusable tags. Their visual
thumbnails are rendered directly from the same pose JSON used by the canvas.
Dance actions may define `beats`, `bars`, `intensity`, `loopable`, `entryPose`,
`mainPose`, and `exitPose`. At insertion, duration is derived from project BPM:
`seconds = beats * 60 / BPM`. Loop repetitions compile to ordinary editable
keyframes. Beat Grid and Snap to Beat use the same BPM value.

Combinations compile multiple actions sequentially while keeping every pose and
transform keyframe editable. Group synchronization targets arbitrary Actor IDs;
an optional stagger creates wave timing. Formations only author root-position
keyframes and therefore remain compatible with the standard transform system.
Continuous authored rotations (360/720/1080 degrees) are stored in the existing
character rotation field and are never reduced to a shortest angle.

2D FLIP STUDIO uses one scene engine for fight, lifestyle, social, romance,
family, dance, melee and cinematic animation. Categories are metadata; they do
not select separate engines.

## Actor schema

`Project.characters` is the backward-compatible storage name for an unlimited
array of Actors. Actor IDs are arbitrary strings (`anna`, `actor_01`, etc.).
Each actor has a single skeletal pose track in `Project.tracks[actorId]`.
Pose, root position, continuous `rotation`, scale and mirror values live in the
same keyframe. Legacy IDs `a` and `b` remain valid and are migrated to Actor A/B.

Actor presets (`standard`, `male`, `female`, `child`, `large`, `small`) only
change visual defaults/scale. They share the same skeleton and animation engine.

## Prop and attachment schema

`Project.props` contains independent scene entities. `Project.propTracks[id]`
animates position, rotation, scale, horizontal flip, opacity and attachment.
An attachment contains `actorId`, `joint`, offsets and rotation. Rendering
evaluates the actor pose and transform first, then places the prop on the
transformed joint. Attach/detach values are keyframeable, saved and exported.

## Actions and participants

Actions have stable IDs, tags, one or more category references and participant
type metadata. An implementation such as `hug` can appear under Social,
Romance and Family without duplication. Participant roles are generic Actor or
Prop references; scenario events use `actor`, `target`, `prop`, or a variable
length `participants` array. Special moves accept arbitrary actor IDs and pick
another scene actor as their target.

## Scenario V2

The local deterministic compiler accepts:

```json
{
  "duration": 10,
  "actors": [{ "id": "anna", "preset": "female" }],
  "props": [{ "id": "cup", "type": "cup" }],
  "events": [{ "time": 1, "actor": "anna", "action": "walk" }]
}
```

It creates all actors/props, resolves actions by generic ID, creates dynamic
timeline tracks, aligns multi-participant interactions with approach keys, and
uses prop attachment keyframes for pick-up/hold/drink/give events. The alias
`characters` is accepted for older scenario producers.

## Dynamic timeline and layers

Actor and Prop rows are derived from scene content. Camera, Effects and Speed
remain global. Props and Actors have layer values; prop layer ordering is
persisted. The Scene Outliner owns rename, visibility, lock, add, duplicate and
delete operations.
