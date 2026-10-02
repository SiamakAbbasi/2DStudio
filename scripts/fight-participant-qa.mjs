import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const { blankProject } = await server.ssrLoadModule("/src/project.ts");
  const { applyFightMoveSequence } = await server.ssrLoadModule("/src/fightDirector.ts");
  const base = blankProject({ label: "QA", width: 1080, height: 1920 });
  const source = base.characters[1];
  base.characters.push({ ...structuredClone(source), id: "c", name: "Character C" });
  base.tracks.c = structuredClone(base.tracks.b);
  const settings = { duration: 3, style: "Arcade", intensity: .75, specials: true, grapples: true, aerial: true, projectiles: true, autoCamera: false, winner: "No Winner", seed: 17, combatType: "UNARMED" };
  const exchanges = [["a", "b"], ["b", "a"], ["c", "a"], ["a", "c"]];
  let project = base;
  exchanges.forEach(([attacker, target], index) => {
    const spectator = ["a", "b", "c"].find(id => id !== attacker && id !== target);
    const before = JSON.stringify(project.tracks[spectator]);
    project = applyFightMoveSequence(project, attacker, target, index * 3, settings, ["jab"]);
    if (JSON.stringify(project.tracks[spectator]) !== before) throw new Error(`Spectator ${spectator} changed in ${attacker} -> ${target}`);
  });
  const beforeB = JSON.stringify(project.tracks.b), beforeC = JSON.stringify(project.tracks.c);
  project = applyFightMoveSequence(project, "a", undefined, 12, settings, ["dodge_back"]);
  if (JSON.stringify(project.tracks.b) !== beforeB || JSON.stringify(project.tracks.c) !== beforeC) throw new Error("Solo move changed a non-participant");
  console.log(`PASS: ${exchanges.length} paired exchanges + 1 solo move; spectator tracks unchanged; fights=${project.fights?.length ?? 0}`);
} finally {
  await server.close();
}
