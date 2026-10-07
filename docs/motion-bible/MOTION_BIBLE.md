# 2D Flip Studio — Motion Bible

**Version:** 1.0  
**Status:** Living Document  
**Scope:** Action Authoring Only

---

## 1. Purpose

This document is the living motion-authoring guide for creating and
reauthoring Actions in 2D Flip Studio.

It defines how an Action should be:

- designed
- posed
- timed
- structured
- visually evaluated
- implemented as editable animation

This document is NOT a specification for the Studio itself.

It does NOT define UI, project management, database behavior, camera,
effects, Path, Auto Motion, authentication, or other Studio features.

This document is expected to evolve.

As Actions are authored and tested, new motion rules may be discovered.
When that happens, update this document so future Actions benefit from
what was learned.

---

# 2. Source of Truth

When creating or reauthoring an Action, use this priority:

1. Approved Action Motion Sheet
2. This Motion Bible
3. Existing approved Actions when useful as secondary reference
4. Existing implementation only when it is already known to be correct

An existing Action must NOT be treated as visually correct merely because
it already exists in the project.

Many existing Actions are placeholders or require motion-quality
improvements.

When an approved Motion Sheet exists, it is the primary visual reference.

Do not silently replace its choreography with a generic animation.

---

# 3. Action Authoring Principle

Build Actions from meaningful poses.

Do NOT attempt to improve motion by simply adding many intermediate
keyframes.

The basic authoring process is:

KEY POSES
→ TIMING
→ TRANSITIONS
→ POLISH

The key poses must communicate the Action even before interpolation is
added.

If the important poses are wrong, adding more frames will not fix the
Action.

---

# 4. Every Action Needs Clear Motion Phases

Actions should be divided into meaningful phases appropriate to the
motion.

A strike may use:

READY
→ ANTICIPATION
→ ACCELERATION
→ CONTACT
→ FOLLOW-THROUGH
→ RECOVERY

A reaction may use:

NEUTRAL
→ IMPACT
→ PRIMARY REACTION
→ BODY FOLLOW-THROUGH
→ BALANCE BREAK
→ RECOVERY / FALL

A jump may use:

READY
→ COMPRESSION
→ TAKEOFF
→ AIRBORNE
→ DESCENT
→ LANDING
→ RECOVERY

A walk uses locomotion phases rather than the generic strike structure.

Do not force every Action into exactly the same phase model.

---

# 5. Use the Minimum Useful Number of Key Poses

Use enough authored poses to clearly define the movement, but avoid
unnecessary keyframe density.

Every authored key pose should have a purpose.

Good reasons for a key pose include:

- change of support foot
- anticipation extreme
- contact
- direction change
- maximum compression
- maximum extension
- balance break
- recovery
- weapon direction change
- important silhouette change

Do not add keyframes merely to make the Timeline look detailed.

---

# 6. Silhouette Readability

The Action must remain understandable as a stick figure.

At important poses, avoid unnecessary visual overlap.

Pay particular attention to:

- arms crossing directly through the torso
- hands disappearing into the body
- legs visually merging
- unclear attacking limb
- unclear support leg
- weapon overlapping the body without purpose

The viewer should be able to identify the motion from the silhouette.

Cinematic exaggeration is allowed when it improves readability.

---

# 7. The Body Moves as a Connected System

Avoid animating isolated limbs while the rest of the body remains
unnaturally static.

Important motion should propagate through the body.

Depending on the Action, consider:

HEAD
SHOULDERS
CHEST
PELVIS
LEGS
ARMS
HANDS
WEAPON

For example, a powerful punch should not be:

ARM MOVES → DONE

It may involve:

FOOT
→ LEG
→ PELVIS
→ TORSO
→ SHOULDER
→ ARM
→ FIST

The exact chain depends on the Action.

---

# 8. Center of Mass and Balance

Always consider where the character's body weight is located.

The pose should communicate:

- which leg supports the body
- where the pelvis is moving
- whether the character is balanced
- whether the character is intentionally losing balance
- whether momentum is carrying the character forward/backward

The pelvis must participate in meaningful full-body motion.

Avoid the appearance of limbs moving around a frozen central body.

---

# 9. Ground Contact

Foot contact is a major quality rule.

When a foot is planted, it should visually remain planted unless the
motion intentionally contains:

- pivoting
- sliding
- dragging
- knockback
- slipping

Unintentional foot sliding makes an Action feel weightless.

For locomotion and strikes, explicitly understand:

PLANTED FOOT
MOVING FOOT
WEIGHT TRANSFER

before finalizing the Action.

### Foot Lock Must Be Verified in World Space

A visually plausible local pose does not guarantee planted-foot contact.

During support phases, verify the planted ankle/toe in world space after
root displacement and all pose offsets are applied.

---

# 10. Root Motion

If an Action travels through space, the character's root/body translation
must support the pose animation.

Do not fake significant travel only by extending the legs.

Examples that may contain root movement:

- Walk
- Run
- Sprint
- Dodge
- Jump
- Takedown
- Knockback
- Lunging attacks

Pose animation and spatial travel should make sense together.

Do not introduce unnecessary root movement into Actions that should
remain mostly in place.

---

# 11. Head and Pelvis Trajectories

For important Actions, observe the trajectories of:

- head
- pelvis / center of mass

These trajectories often reveal whether motion feels believable.

Avoid random vertical bouncing.

Avoid perfectly rigid horizontal travel when natural body mechanics
require rise/fall.

Motion Sheets may explicitly show these trajectories with guide lines
or arrows.

### Avoid Double-Authoring Vertical Motion

If vertical head/pelvis/body motion is already authored into the poses,
do not apply an additional global vertical offset for the same motion.

Always inspect the combined world-space result.

---

# 12. Arcs

Organic movement usually follows arcs rather than arbitrary straight
joint changes.

Consider useful arcs for:

- hands
- feet
- head
- elbows
- knees
- weapons

This is especially important for:

- punches
- kicks
- rolls
- weapon swings
- reactions
- wrestling throws

Do not force an arc where the real motion should be direct.

---

# 13. Timing and Spacing

Timing is part of motion design.

Do not automatically distribute all key poses evenly.

Different phases may require different timing.

For example, a cinematic strike may have:

readable anticipation
→ rapid acceleration
→ brief contact
→ follow-through
→ controlled recovery

A heavy reaction may use slower body follow-through than the initial
impact response.

Timing should communicate:

- speed
- weight
- power
- hesitation
- acceleration
- impact

Pose design and timing must remain separable so the Action can later be
retimed without destroying its poses.

### Reference Frame Count Does Not Define Required Playback Cadence

A Motion Sheet's frame count primarily describes pose progression.

Do not automatically derive the final Action duration from
reference-frame-count / reference-FPS.

Choose Action cadence based on visual motion quality while preserving
the approved phase structure.

---

# 14. Facing and Direction

Actions must remain conceptually valid in both directions:

LEFT → RIGHT

and

RIGHT → LEFT

Do not author asymmetric mistakes that only work in one direction unless
the Action intentionally requires a specific side.

Always inspect both directions during Action QA.

---

# 15. Locomotion Rules

Walk and Run are NOT simply alternating leg poses.

They require understandable locomotion mechanics.

A standard walk may use:

CONTACT
→ DOWN
→ PASSING
→ UP
→ OPPOSITE CONTACT

and then continue with the opposite side.

During locomotion consider:

- support foot
- heel/toe contact
- knee compression
- passing leg
- pelvis movement
- head movement
- arm counter-swing
- stride length
- root displacement

Avoid robotic equal-angle limb swapping.

Avoid unnecessary vertical bouncing.

Avoid foot sliding.

---

# 16. Running and Sprinting

Run is not merely a faster Walk.

Running introduces different mechanics, including an airborne phase.

Sprint may further change:

- torso lean
- stride length
- arm drive
- knee lift
- recovery speed
- airborne timing

Walk, Run and Sprint must therefore be authored as distinct motions.

---

# 17. Jumping

Jump motion should clearly communicate force generation.

Typical structure:

READY
→ COMPRESSION
→ TAKEOFF
→ AIRBORNE
→ DESCENT
→ LANDING

Takeoff should involve the body, not only the legs.

Landing should absorb impact through appropriate body compression.

Avoid:

instant upward translation
→ floating
→ instant stop

unless intentionally stylized.

---

# 18. Punches

Punches should communicate a kinetic chain.

Depending on the punch, consider:

- stance
- weight transfer
- foot pressure/pivot
- pelvis rotation
- torso rotation
- shoulder travel
- elbow path
- fist trajectory
- contact alignment
- follow-through
- recovery

Different punches must have different mechanics.

Jab, Cross, Hook and Uppercut must not look like the same arm animation
rotated into different directions.

---

# 19. Kicks

Kicks require deliberate support-leg behavior.

Consider:

- preparation
- support foot
- pivot
- chamber
- hip rotation
- extension
- contact
- follow-through
- retraction
- recovery

The pelvis should participate strongly.

Avoid kicks that appear to be only a lower-leg rotation.

Roundhouse, Front Kick, Side Kick and Spinning Kick must have distinct
body mechanics.

---

# 20. Hit Reactions

Hit Reactions are a major Action family and must receive the same
attention as attacks.

Do NOT create reactions by simply translating the entire character away
from the attacker.

The reaction should communicate how force travels through the body.

Possible components include:

- head snap
- neck movement
- shoulder displacement
- chest compression
- chest arch
- torso bend
- torso rotation
- pelvis lag
- arm lag / arm whip
- support-foot failure
- corrective step
- stagger
- spin
- fall

Not every reaction needs every component.

Reaction design depends on:

- impact location
- impact direction
- apparent force
- current stance
- desired cinematic result

---

# 21. Punch Recoil Reaction

An important cinematic reaction pattern is a heavy punch recoil.

Possible progression:

CONTACT
→ HEAD / UPPER CHEST DRIVEN BACK
→ CHEST ARCHES
→ TORSO BENDS BACKWARD
→ PELVIS LAGS BEHIND
→ ONE OR BOTH ARMS WHIP WITH MOMENTUM
→ SUPPORT BREAKS
→ STAGGER / RECOVERY / FALL

The body should not move as one rigid object.

The first response and the later body follow-through should be visually
distinguishable.

This reaction family will require multiple variations.

---

# 22. Rotational Hit Reaction

Side impacts such as hooks may create rotational reactions.

Possible progression:

CONTACT
→ HEAD ROTATION
→ SHOULDERS FOLLOW
→ CHEST ROTATES
→ PELVIS FOLLOWS WITH DELAY
→ FOOT ADJUSTMENT / PIVOT
→ STAGGER OR SPIN

Avoid rotating the entire character uniformly around one point.

---

# 23. Body Hit Reaction

Body impacts may produce compression rather than immediate knockback.

Possible progression:

CONTACT
→ ABDOMINAL / CHEST COMPRESSION
→ TORSO FOLDS
→ SHOULDERS COLLAPSE
→ ARMS REACT
→ KNEES COMPRESS
→ BALANCE CHANGES
→ RECOVERY / DROP

The reaction must clearly show where the force entered the body.

---

# 24. Wrestling and Grappling

Wrestling Actions should depict recognizable cinematic techniques rather
than generic overlapping characters.

Important considerations:

- entry
- contact
- grip relationship
- attacker stance
- target stance
- leverage
- balance break
- shared center-of-mass movement
- lift where applicable
- throw/takedown trajectory
- release

Paired characters must remain spatially synchronized.

Do not allow grips to visibly disconnect during the core technique unless
the technique intentionally releases.

Wrestling Actions in the Motion Library primarily define the execution
of techniques.

General hit reactions should remain part of the Hit Reaction family.

---

# 25. Weapon Actions

Weapon animation is authored around both:

BODY MOTION

and

WEAPON MOTION.

The weapon is not a decorative attachment.

Always consider:

- grip
- hand relationship
- weapon orientation
- weapon trajectory
- attack arc
- footwork
- torso rotation
- follow-through
- recovery

The body should support the weapon motion.

Do not animate a large weapon as if it has no weight.

---

# 26. Cinematic Cold Weapons

The Motion Library may include cinematic movements inspired by
traditional and film-based weapon choreography, including families such
as:

- Sword
- Long Sword
- Knife / Short Blade
- Spear
- Staff
- Polearm
- Glaive-like / curved-blade polearms
- other visually distinct cold-weapon families

The goal is readable cinematic choreography, not strict historical
reconstruction.

Movements may include:

READY
SLASH
DIAGONAL SLASH
OVERHEAD
THRUST
SWEEP
SPIN
BLOCK
PARRY
COUNTER
FLOURISH

Different weapons must preserve distinct motion characteristics.

A spear should not animate like a sword with a longer graphic.

---

# 27. Cinematic Exaggeration

The target is not purely clinical realism.

The target is:

READABLE
+ BELIEVABLE
+ CINEMATIC
+ EDITABLE

Moderate exaggeration is encouraged when it improves:

- silhouette
- force
- anticipation
- impact
- follow-through
- visual clarity

Avoid exaggeration that destroys balance, anatomy or the intended motion.

---

# 28. Motion Sheets

Each important Action should ideally have an approved Motion Sheet.

A Motion Sheet may show:

- sequential key poses
- phase names
- direction of travel
- ground line
- planted foot
- head trajectory
- pelvis trajectory
- hand trajectory
- foot trajectory
- weapon trajectory
- impact/contact point
- useful arrows
- timing guidance

The Motion Sheet should communicate mechanics visually rather than rely
only on text.

When a Motion Sheet exists, implement its motion rather than inventing a
replacement.

---

# 29. Action Identity

When reauthoring an existing Action:

Improve the existing Action whenever practical.

Do not create:

Walk_New
Walk_v2
Walk_Final
Walk_Fixed

simply to avoid correcting the existing Action.

The Motion Library should remain clean.

One conceptual Action should normally have one canonical implementation.

Variations are allowed only when they represent intentionally different
motions.

Example:

Walk Forward
Walk Backward

are valid separate Actions.

Walk Fixed Final 2

is not.

---

# 30. Editability

The final Action must remain useful for animation authoring.

Its important poses should remain understandable and editable.

A user should be able to adjust:

- pose
- timing
- spacing
- position
- facing where supported
- individual keyframes

without having to rebuild the entire Action.

Avoid motion structures that make small manual adjustments impractical.

---

# 31. Visual Review Is Mandatory

Code correctness does NOT prove motion quality.

A successful build does NOT prove motion quality.

A passing unit test does NOT prove motion quality.

Every Action must be visually inspected in motion.

Where useful, inspect at:

1x speed

and

slow motion.

Also inspect important individual key poses.

---

# 32. Transition Review

An Action should not only look acceptable in isolation.

Where practical, inspect how it connects to other Actions.

Examples:

Idle → Walk

Walk → Run

Guard → Jab

Hook → Reaction

Reaction → Fall

The purpose is not to guarantee every possible Action combination.

The purpose is to avoid obvious transition problems in common usage.

---

# 33. Action Quality Checklist

Before considering an Action approved, review:

### Motion

- [ ] Motion is immediately understandable.
- [ ] Key poses are meaningful.
- [ ] Motion phases are correct.
- [ ] Body moves as a connected system.
- [ ] Weight transfer is believable.
- [ ] Center of mass makes sense.
- [ ] Ground contact is intentional.
- [ ] Root motion is appropriate.
- [ ] Important trajectories are clean.
- [ ] Silhouette is readable.
- [ ] Timing communicates the intended speed and weight.

### Direction

- [ ] LEFT → RIGHT looks correct.
- [ ] RIGHT → LEFT looks correct.

### Action-specific mechanics

- [ ] Locomotion has correct support/contact behavior.
- [ ] Strikes use appropriate kinetic chain.
- [ ] Kicks use correct support-leg/pelvis mechanics.
- [ ] Reactions show force propagation.
- [ ] Grappling maintains paired spatial relationships.
- [ ] Weapons follow readable arcs and body-supported mechanics.

Only evaluate the relevant items for the Action being reviewed.

---

# 34. Approval States

During Motion Bible production, think of Actions as:

DRAFT
→ REVIEW
→ APPROVED

DRAFT:
Initial implementation based on the Motion Sheet.

REVIEW:
Motion is being visually tested and corrected.

APPROVED:
Motion quality is accepted as the current canonical version.

Approved does NOT mean permanent.

An Action may be improved again later.

---

# 35. Learning Rule

This Motion Bible is intentionally a living document.

When authoring an Action reveals a useful general rule:

DO NOT keep that knowledge only inside one Action implementation.

Ask:

"Does this lesson apply to future Actions?"

If yes:

update this Motion Bible.

Examples:

- a better planted-foot rule discovered while fixing Walk
- a better pelvis-delay rule discovered while fixing Hit Reactions
- a better weapon-arc rule discovered while fixing Sword
- a better paired-contact rule discovered while fixing Wrestling

The Motion Bible should improve as the Motion Library improves.

---

# 36. Final Principle

Do not optimize for the number of Actions.

Optimize for the number of Actions that actually look good.

A small library of excellent, readable and editable motions is more
valuable than a large library of poor motions.

The Motion Library should grow gradually:

REFERENCE
→ AUTHOR
→ REVIEW
→ CORRECT
→ APPROVE
→ LEARN
→ UPDATE THE BIBLE
→ NEXT ACTION
