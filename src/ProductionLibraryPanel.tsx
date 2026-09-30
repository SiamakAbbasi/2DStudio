import { useEffect, useRef, useState } from "react";
import {
  captureAction,
  exportAction,
  importAction,
  insertAction,
  loadActionAssets,
  saveActionAssets,
  type ActionAsset,
} from "./actionAssets";
import {
  addClip,
  clipOutputDuration,
  masterDuration,
  resolveMaster,
} from "./masterSequence";
import { exportMasterVideo } from "./masterExport";
import type { MasterClip, Project } from "./types";

interface Props {
  project: Project;
  time: number;
  onClose: () => void;
  onApply: (p: Project) => void;
  onPreview: (project: Project, sourceTime: number, masterTime: number) => void;
  onEditClip: (clipId: string) => void;
}

export function ProductionLibraryPanel({
  project,
  time,
  onClose,
  onApply,
  onPreview,
  onEditClip,
}: Props) {
  const [tab, setTab] = useState<"actions" | "master">("actions"),
    [assets, setAssets] = useState(loadActionAssets);
  const [start, setStart] = useState(Math.max(0, time - 1)),
    [end, setEnd] = useState(Math.min(project.duration, time + 1)),
    [name, setName] = useState("My Action");
  const [paired, setPaired] = useState(false),
    [actor, setActor] = useState(project.characters[0]?.id ?? ""),
    [target, setTarget] = useState(project.characters[1]?.id ?? "");
  const [mirror, setMirror] = useState(false),
    [rootMode, setRootMode] = useState<"preserve" | "remove">("preserve"),
    [cart, setCart] = useState<string[]>([]),
    [masterTime, setMasterTime] = useState(0);
  const [masterPlaying, setMasterPlaying] = useState(false),
    playback = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (playback.current !== null) cancelAnimationFrame(playback.current);
    },
    [],
  );
  const store = (next: ActionAsset[]) => {
    setAssets(next);
    saveActionAssets(next);
  };
  const save = () =>
    store([
      ...assets,
      captureAction(project, paired ? [actor, target] : [actor], start, end, {
        name,
        category: "Custom",
        tags: ["custom"],
        rootMotionMode: rootMode,
        facing: "auto",
        camera: false,
        effects: true,
        props: false,
        source: "manual",
      }),
    ]);
  const updateMaster = (fn: (clips: MasterClip[]) => MasterClip[]) => {
    const next = structuredClone(project),
      master = next.master ?? addClip(undefined, next);
    master.clips = fn(master.clips);
    next.master = master;
    onApply(next);
  };
  const previewMaster = (value: number) => {
    setMasterTime(value);
    if (!project.master) return;
    const resolved = resolveMaster(project.master, value);
    if (resolved) {
      onPreview(resolved.project, resolved.sourceTime, value);
    }
  };
  const toggleMasterPlayback = () => {
    if (playback.current !== null) {
      cancelAnimationFrame(playback.current);
      playback.current = null;
      setMasterPlaying(false);
      return;
    }
    if (!project.master) return;
    const master = project.master,
      total = masterDuration(master),
      startedAt = performance.now() - masterTime * 1000;
    setMasterPlaying(true);
    const frame = (now: number) => {
      const next = (now - startedAt) / 1000;
      if (next >= total) {
        previewMaster(total);
        playback.current = null;
        setMasterPlaying(false);
        return;
      }
      const resolved = resolveMaster(master, next);
      setMasterTime(next);
      if (resolved) {
        onPreview(resolved.project, resolved.sourceTime, next);
      }
      playback.current = requestAnimationFrame(frame);
    };
    playback.current = requestAnimationFrame(frame);
  };
  const splitMaster = () => {
    if (!project.master) return;
    const resolved=resolveMaster(project.master,masterTime);
    if(!resolved||resolved.sourceTime<=resolved.clip.in||resolved.sourceTime>=resolved.clip.out)return;
    const index=resolved.clipIndex,sourceTime=resolved.sourceTime;
    updateMaster((clips) => {
      const clip = clips[index];
      return [
        ...clips.slice(0, index),
        {
          ...structuredClone(clip),
          id: crypto.randomUUID(),
          out: sourceTime,
          name: clip.name + " A",
        },
        {
          ...structuredClone(clip),
          id: crypto.randomUUID(),
          in: sourceTime,
          name: clip.name + " B",
        },
        ...clips.slice(index + 1),
      ];
    });
  };
  const downloadAction = (asset: ActionAsset) => {
    const url = URL.createObjectURL(
        new Blob([exportAction(asset)], { type: "application/json" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = asset.name.replace(/[^a-z0-9]+/gi, "-") + ".flipaction";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="production-backdrop">
      <section className="production-workspace">
        <header>
          <div>
            <b>▦ PRODUCTION LIBRARY</b>
            <small>Create once · reuse · assemble · export</small>
          </div>
          <button onClick={onClose}>×</button>
        </header>
        <nav>
          <button
            className={tab === "actions" ? "active" : ""}
            onClick={() => setTab("actions")}
          >
            REUSABLE ACTIONS
          </button>
          <button
            className={tab === "master" ? "active" : ""}
            onClick={() => setTab("master")}
          >
            MASTER MOVIE
          </button>
        </nav>
        {tab === "actions" ? (
          <main>
            <aside>
              <h2>Create Reusable Action</h2>
              <p className="production-help">Save the selected time range as an action you can apply again to any compatible character.</p>
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <div>
                <label>
                  IN
                  <input
                    type="number"
                    value={start}
                    onChange={(e) => setStart(+e.target.value)}
                  />
                </label>
                <label>
                  OUT
                  <input
                    type="number"
                    value={end}
                    onChange={(e) => setEnd(+e.target.value)}
                  />
                </label>
              </div>
              <label>
                Actor
                <select
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                >
                  {project.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fight-check">
                <input
                  type="checkbox"
                  checked={paired}
                  onChange={(e) => setPaired(e.target.checked)}
                />
                Paired
              </label>
              {paired && (
                <label>
                  Target
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    {project.characters
                      .filter((c) => c.id !== actor)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label>
                Facing
                <select
                  onChange={(e) => setMirror(e.target.value === "mirror")}
                >
                  <option value="original">Original</option>
                  <option value="mirror">Mirror</option>
                </select>
              </label>
              <label>
                Root
                <select
                  value={rootMode}
                  onChange={(e) =>
                    setRootMode(e.target.value as "preserve" | "remove")
                  }
                >
                  <option value="preserve">Preserve</option>
                  <option value="remove">Remove</option>
                </select>
              </label>
              <button onClick={save}>SAVE AS ACTION</button>
              <label>
                IMPORT .FLIPACTION
                <input
                  type="file"
                  accept=".flipaction,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      store([...assets, importAction(await file.text())]);
                    } catch (error) {
                      alert(
                        error instanceof Error
                          ? error.message
                          : "Invalid action file",
                      );
                    }
                  }}
                />
              </label>
              <b>Cart ({cart.length})</b>
              {cart.map((id, i) => (
                <button
                  key={i}
                  onClick={() => setCart((x) => x.filter((_, n) => n !== i))}
                >
                  {assets.find((a) => a.id === id)?.name} ×
                </button>
              ))}
              <button
                onClick={() => {
                  let next = project,
                    at = time;
                  for (const id of cart) {
                    const asset = assets.find((x) => x.id === id);
                    if (asset) {
                      next = insertAction(
                        next,
                        asset,
                        asset.actorCount > 1 ? [actor, target] : [actor],
                        at,
                        mirror,
                        rootMode,
                      );
                      at += asset.duration;
                    }
                  }
                  onApply(next);
                }}
              >
                ADD SEQUENCE
              </button>
            </aside>
            <section>
              <div className="production-section-heading">
                <div><h2>Saved Actions</h2><p>Apply one action at the current playhead, or add several to the Cart and build a sequence.</p></div>
                <b>{assets.length}</b>
              </div>
              {assets.length === 0 && <div className="production-empty"><b>No reusable actions yet</b><span>Choose an IN/OUT range on the left and press <strong>Save as Action</strong>. Your saved action cards will appear here.</span></div>}
              <div className="action-assets">
                {assets.map((asset) => (
                  <article key={asset.id}>
                    <div className="action-mini">
                      {asset.actorCount === 2 ? "● ⇄ ●" : "●╱"}
                    </div>
                    <input
                      value={asset.name}
                      onChange={(e) =>
                        store(
                          assets.map((x) =>
                            x.id === asset.id
                              ? { ...x, name: e.target.value }
                              : x,
                          ),
                        )
                      }
                    />
                    <small>
                      {asset.category} · {asset.duration.toFixed(2)}s
                    </small>
                    <div>
                      <button
                        onClick={() =>
                          onApply(
                            insertAction(
                              project,
                              asset,
                              asset.actorCount > 1 ? [actor, target] : [actor],
                              time,
                              mirror,
                              rootMode,
                            ),
                          )
                        }
                      >
                        ADD
                      </button>
                      <button onClick={() => setCart((x) => [...x, asset.id])}>
                        ＋Cart
                      </button>
                      <button
                        title="Export"
                        onClick={() => downloadAction(asset)}
                      >
                        ⇩
                      </button>
                      <button
                        onClick={() =>
                          store([
                            ...assets,
                            {
                              ...structuredClone(asset),
                              id: crypto.randomUUID(),
                              name: asset.name + " Copy",
                            },
                          ])
                        }
                      >
                        ⧉
                      </button>
                      <button
                        onClick={() =>
                          store(assets.filter((x) => x.id !== asset.id))
                        }
                      >
                        ×
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </main>
        ) : (
          <main className="master-editor">
            <aside>
              <h2>Build Master Movie</h2>
              <p className="production-help">Combine complete projects as clips, reorder or trim them, then preview and export the whole movie.</p>
              <button
                onClick={() => {
                  const next = structuredClone(project);
                  next.master = addClip(next.master, next);
                  onApply(next);
                }}
              >
                ＋ CURRENT CLIP
              </button>
              <label>
                IMPORT PROJECTS
                <input
                  type="file"
                  multiple
                  accept="application/json"
                  onChange={async (e) => {
                    const next = structuredClone(project);
                    for (const file of Array.from(e.target.files ?? [])) {
                      try {
                        next.master = addClip(
                          next.master,
                          JSON.parse(await file.text()),
                          file.name,
                        );
                      } catch {
                        /* invalid file */
                      }
                    }
                    onApply(next);
                  }}
                />
              </label>
              <b>
                {project.master?.clips.length ?? 0} clips ·{" "}
                {masterDuration(project.master).toFixed(2)}s
              </b>
              <label>
                Master Playhead
                <input
                  type="range"
                  min="0"
                  max={masterDuration(project.master)}
                  step=".01"
                  value={masterTime}
                  onChange={(e) => previewMaster(+e.target.value)}
                />
                {masterTime.toFixed(2)}s
              </label>
              <button onClick={toggleMasterPlayback}>
                {masterPlaying ? "■ STOP" : "▶ PLAY ALL"}
              </button>
              <button onClick={splitMaster}>✂ SPLIT AT PLAYHEAD</button>
              <button
                onClick={() =>
                  project.master && exportMasterVideo(project.master)
                }
              >
                🎬 EXPORT MASTER
              </button>
            </aside>
            <section className="master-clips">
              {!project.master?.clips.length && <div className="production-empty"><b>No clips in the Master Movie</b><span>Use <strong>Current Clip</strong> to add this project, or import saved project files from the left panel.</span></div>}
              {project.master?.clips.map((clip, i) => (
                <article
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", String(i))
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = +e.dataTransfer.getData("text/plain");
                    updateMaster((clips) => {
                      const next = [...clips],
                        moved = next.splice(from, 1)[0];
                      next.splice(i, 0, moved);
                      return next;
                    });
                  }}
                  key={clip.id}
                >
                  <header>
                    <b>
                      {i + 1}. {clip.name}
                    </b>
                    <small>{clipOutputDuration(clip).toFixed(2)}s</small>
                  </header>
                  <div>
                    <label>
                      IN
                      <input
                        type="number"
                        value={clip.in}
                        onChange={(e) =>
                          updateMaster((clips) =>
                            clips.map((x) =>
                              x.id === clip.id
                                ? { ...x, in: +e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      OUT
                      <input
                        type="number"
                        value={clip.out}
                        onChange={(e) =>
                          updateMaster((clips) =>
                            clips.map((x) =>
                              x.id === clip.id
                                ? { ...x, out: +e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <footer>
                    <button
                      onClick={() => onEditClip(clip.id)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        updateMaster((clips) => [
                          ...clips.slice(0, i + 1),
                          { ...structuredClone(clip), id: crypto.randomUUID() },
                          ...clips.slice(i + 1),
                        ])
                      }
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() =>
                        updateMaster((clips) =>
                          clips.filter((x) => x.id !== clip.id),
                        )
                      }
                    >
                      Remove
                    </button>
                  </footer>
                </article>
              ))}
            </section>
          </main>
        )}
      </section>
    </div>
  );
}
