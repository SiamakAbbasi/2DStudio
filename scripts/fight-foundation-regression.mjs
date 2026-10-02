import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
const fail = (message) => { throw new Error(message); };
try {
  const { blankProject } = await server.ssrLoadModule("/src/project.ts");
  const { applyFightMoveSequence, fightMoves } = await server.ssrLoadModule("/src/fightDirector.ts");
  const { poseAt, transformAt } = await server.ssrLoadModule("/src/animation.ts");
  const settings = { duration: 3, style: "Balanced", intensity: .7, specials: false, grapples: false, aerial: false, projectiles: false, autoCamera: false, winner: "No Winner", seed: 19 };
  const moveIds = ["jab", "hook", "uppercut", "roundhouse", "knockback"];
  const starts = [110, "correct", 325, 700];
  const shift = (track, dx) => track.forEach((key) => Object.values(key.pose).forEach((joint) => joint.x += dx));
  const targetPoint = (pose, target) => target === "body" ? pose.torso
    : target === "upperTorso" ? { x: (pose.neck.x + pose.torso.x) / 2, y: (pose.neck.y + pose.torso.y) / 2 }
    : target === "chin" ? { x: pose.head.x * .35 + pose.neck.x * .65, y: pose.head.y * .35 + pose.neck.y * .65 }
    : pose.head;
  let cases = 0;
  for (const id of moveIds) for (const direction of [1, -1]) for (const requested of starts) {
    const move = fightMoves.find((candidate) => candidate.id === id);
    const project = blankProject({ label: "QA", width: 1280, height: 720 });
    const distance = requested === "correct" ? (move.contact?.desiredRootDistance ?? 175) : requested;
    const ax = poseAt(project.tracks.a, 0).root.x, bx = poseAt(project.tracks.b, 0).root.x;
    shift(project.tracks.b, ax + direction * distance - bx);
    const out = applyFightMoveSequence(project, "a", "b", 0, settings, [id]);
    const contactKey = out.tracks.a.find((key) => key.easing === "snap");
    const contactTime = contactKey?.time ?? move.contactTime;
    const attacker = poseAt(out.tracks.a, contactTime), defender = poseAt(out.tracks.b, contactTime);
    const resolvedDirection = Math.sign(defender.root.x - attacker.root.x) || direction;
    if (resolvedDirection !== direction) fail(`${id}: cross-through in direction ${direction}`);
    if ((out.characters.find((c) => c.id === "a")?.flip ?? false) !== (direction < 0)) fail(`${id}: attacker facing mismatch`);
    if ((out.characters.find((c) => c.id === "b")?.flip ?? false) !== (direction > 0)) fail(`${id}: defender facing mismatch`);
    for (const actor of ["a", "b"]) {
      for (const key of out.tracks[actor].filter((key) => key.time <= contactTime + move.duration)) {
        if (key.flipH === true || transformAt(out.tracks[actor], key.time).flipH) fail(`${id}: renderer mirror leaked into fight track`);
        if (Math.hypot(key.pose.head.x - key.pose.neck.x, key.pose.head.y - key.pose.neck.y) > 62.01) fail(`${id}: detached head/neck`);
      }
    }
    if (move.contact && move.contact.endpoint !== "weapon") {
      const endpoint = attacker[move.contact.endpoint], target = targetPoint(defender, move.contact.target);
      const gap = Math.hypot(endpoint.x - target.x, endpoint.y - target.y);
      if (gap > 105) fail(`${id}: contact gap ${gap.toFixed(1)}`);
    }
    const reactionEnd = Math.min(out.duration, contactTime + .55), endRoot = poseAt(out.tracks.b, reactionEnd).root.x;
    if (id === "knockback" && Math.sign(endRoot - defender.root.x) !== direction) fail(`${id}: reverse knockback`);
    cases++;
  }
  console.log(`PASS: ${cases} facing/contact/range cases; mirrored transforms neutral; head/neck connected; reverse knockback verified`);
} finally { await server.close(); }
