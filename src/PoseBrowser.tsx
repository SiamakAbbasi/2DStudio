import { memo, useEffect, useMemo, useRef, useState } from "react";
import { drawStick } from "./CanvasView";
import { orientedPose, poseCatalog, poseOrientations, type PoseEntry, type PoseOrientation } from "./poses";
import { danceStyles } from "./danceData";
const Thumb = memo(function Thumb({
  entry,
  selected,
  onSelect,
  onApply,
  onPreview,
}: {
  entry: PoseEntry;
  selected: boolean;
  onSelect: (id: string) => void;
  onApply: (id: string) => void;
  onPreview: (id: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!,
      ctx = c.getContext("2d")!,
      p = entry.pose,
      pts = Object.values(p),
      minX = Math.min(...pts.map((v) => v.x)) - 45,
      maxX = Math.max(...pts.map((v) => v.x)) + 45,
      minY = Math.min(...pts.map((v) => v.y)) - 45,
      maxY = Math.max(...pts.map((v) => v.y)) + 45,
      s = Math.min(82 / (maxX - minX), 82 / (maxY - minY)),
      ox = 48 - ((minX + maxX) / 2) * s,
      oy = 48 - ((minY + maxY) / 2) * s;
    ctx.clearRect(0, 0, 96, 96);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    drawStick(ctx,p,"#55aaff",1,false);
    ctx.restore();
  }, [entry]);
  return (
    <button
      className={`pose-thumb ${selected ? "selected" : ""}`}
      title={`${entry.name} · Double click to apply`}
      onClick={() => onSelect(entry.id)}
      onDoubleClick={() => onApply(entry.id)}
      onMouseEnter={() => onPreview(entry.id)}
      onMouseLeave={() => onPreview(null)}
    >
      <canvas ref={ref} width="96" height="96" />
      <span>{entry.name}</span>
    </button>
  );
});
export function PoseBrowser({
  fighter,
  actors,
  onFighter,
  onApply,
  onAdd,
  onPreview,
  onClose,
  orientation,
  onOrientation,
  danceOnly = false,
  initialStyle = "Techno",
}: {
  fighter: string;
  actors: { id: string; name: string }[];
  onFighter: (id: string) => void;
  onApply: (id: string) => void;
  onAdd: (id: string) => void;
  onPreview: (id: string | null) => void;
  onClose: () => void;
  orientation:PoseOrientation;
  onOrientation:(orientation:PoseOrientation)=>void;
  danceOnly?: boolean;
  initialStyle?: string;
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [style, setStyle] = useState(initialStyle);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase(),
      map = new Map<string, PoseEntry[]>();
    poseCatalog
      .filter(
        (e) =>
          (!danceOnly ||
            (e.category === "Dance" && (!style || e.style === style))) &&
          (!q ||
            e.id.includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.tags.some((t) => t.includes(q))),
      )
      .forEach((e) => map.set(e.category, [...(map.get(e.category) ?? []), e]));
    return map;
  }, [query, danceOnly, style]);
  const finish = (id: string, add = false) => {
    onPreview(null);
    (add ? onAdd : onApply)(id);
    onClose();
  };
  return (
    <div className="help-backdrop pose-backdrop">
      <article className="pose-browser">
        <button
          className="help-close"
          onClick={() => {
            onPreview(null);
            onClose();
          }}
        >
          ×
        </button>
        <div className="pose-browser-head">
          <h2>Pose Browser</h2>
          {danceOnly && (
            <div className="dance-pose-styles">
              {Object.keys(danceStyles).map((item) => (
                <button
                  className={style === item ? "active" : ""}
                  onClick={() => {
                    setStyle(item);
                    setSelected(null);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          <div className="applying-to">
            Applying to:{" "}
            {actors.map((actor) => (
              <button
                key={actor.id}
                className={fighter === actor.id ? "active" : ""}
                onClick={() => onFighter(actor.id)}
              >
                {actor.name}
              </button>
            ))}
          </div>
          <div className="pose-orientation" aria-label="Pose orientation">
            <b>Orientation</b>
            {poseOrientations.map(item=><button key={item} className={orientation===item?"active":""} onClick={()=>onOrientation(item)}>{item==="FRONT"?"Front":item==="THREE_QUARTER_LEFT"?"3/4 L":item==="SIDE_LEFT"?"Side L":item==="THREE_QUARTER_RIGHT"?"3/4 R":"Side R"}</button>)}
          </div>
          <input
            autoFocus
            placeholder="Search pose: kick, stance, block…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <b>{[...groups.values()].flat().length} poses</b>
        </div>
        <div className="pose-groups">
          {[...groups.entries()].map(([category, items]) => (
            <section key={category}>
              <h3>{category}</h3>
              <div>
                {items.map((entry) => (
                  <Thumb
                    key={entry.id}
                    entry={{...entry,pose:orientedPose(entry.pose,orientation),name:`${entry.name} — ${orientation==="FRONT"?"Front":orientation.replace("THREE_QUARTER","3/4").replace("_"," ")}`}}
                    selected={selected === entry.id}
                    onSelect={setSelected}
                    onApply={(id) => finish(id)}
                    onPreview={onPreview}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="pose-actions">
          <span>
            Selected: <b>{selected?.replaceAll("_", " ") || "None"}</b>
          </span>
          <button
            disabled={!selected}
            onClick={() => selected && finish(selected)}
          >
            Apply Pose
          </button>
          <button
            disabled={!selected}
            onClick={() => selected && finish(selected, true)}
          >
            Add Keyframe
          </button>
        </footer>
      </article>
    </div>
  );
}
