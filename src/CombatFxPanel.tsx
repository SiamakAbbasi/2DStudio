import { useState } from "react";
import {
  addCombatFx,
  combatFxPresets,
  defaultCombatFxSettings,
} from "./combatFx";
import type { CombatFxSettings, Project } from "./types";

export function CombatFxPanel({
  project,
  actor,
  time,
  onClose,
  onApply,
}: {
  project: Project;
  actor: string;
  time: number;
  onClose: () => void;
  onApply: (p: Project) => void;
}) {
  const [category, setCategory] = useState("All"),
    [selectedActor, setSelectedActor] = useState(
      actor || project.characters[0]?.id || "",
    ),
    [applied, setApplied] = useState("");
  const settings = project.combatFx ?? defaultCombatFxSettings,
    categories = ["All", ...new Set(combatFxPresets.map((p) => p.category))];
  const updateSettings = (patch: Partial<CombatFxSettings>) =>
    onApply({
      ...structuredClone(project),
      combatFx: { ...settings, ...patch },
    });
  return (
    <div className="combat-backdrop">
      <section className="combat-workspace">
        <header>
          <div>
            <b>✦ COMBAT FX</b>
            <small>
              Add a visual effect to an actor at the current playhead
            </small>
          </div>
          <button onClick={onClose}>×</button>
        </header>
        <div className="combat-howto" aria-label="Combat FX workflow">
          <div><b>1</b><span><strong>Choose Actor</strong><small>The fighter that owns the effect</small></span></div>
          <i>→</i>
          <div><b>2</b><span><strong>Choose Effect</strong><small>Trail, impact, particles or clash</small></span></div>
          <i>→</i>
          <div><b>3</b><span><strong>Apply</strong><small>Creates an Effect key at {time.toFixed(2)}s</small></span></div>
        </div>
        <div className="combat-settings">
          <label>
            Actor
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
            >
              {project.characters.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            FX Intensity
            <select
              value={settings.intensity}
              onChange={(e) =>
                updateSettings({
                  intensity: e.target.value as CombatFxSettings["intensity"],
                })
              }
            >
              {["OFF", "LOW", "MEDIUM", "HIGH", "ARCADE"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="combat-check"><input
              type="checkbox"
              checked={settings.hitParticles}
              onChange={(e) =>
                updateSettings({ hitParticles: e.target.checked })
              }
            /><span><b>Hit Particles</b><small>Show stylized particles on contact</small></span></span>
          </label>
          <label>
            <span className="combat-check"><input
              type="checkbox"
              checked={settings.autoWeaponTrail}
              onChange={(e) =>
                updateSettings({ autoWeaponTrail: e.target.checked })
              }
            /><span><b>Auto Weapon Trail</b><small>Only shows while the weapon moves fast enough</small></span></span>
          </label>
        </div>
        <div className="combat-browser-head"><div><b>Effect Library</b><small>Select a category, then apply a preset</small></div><output>{applied ? `✓ ${applied} added at ${time.toFixed(2)}s` : `Playhead ${time.toFixed(2)}s`}</output></div>
        <nav className="combat-categories">
          {categories.map((c) => (
            <button
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </nav>
        <main className="combat-grid">
          {combatFxPresets
            .filter((p) => category === "All" || p.category === category)
            .map((p) => (
              <article key={p.id}>
                <div
                  className={`fx-preview ${p.type}`}
                  style={{ color: p.color }}
                >
                  ╲ ✦ ╱
                </div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <small>
                  {p.category} · {p.duration}s
                  {p.minimumVelocity ? ` · velocity ${p.minimumVelocity}+` : ""}
                </small>
                <button
                  onClick={() => {onApply(addCombatFx(project, p, selectedActor, time));setApplied(p.name)}}
                >
                  ＋ Add at {time.toFixed(2)}s
                </button>
              </article>
            ))}
        </main>
      </section>
    </div>
  );
}
