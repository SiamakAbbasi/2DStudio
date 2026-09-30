import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { actions } from "./actions";
import {
  basePose,
  cameraAt,
  clonePose,
  poseAt,
  propTransformAt,
  sourceTimeAt,
  outputDuration,
  transformAt,
  uid,
} from "./animation";
import { CanvasView, drawScene, type TransformMode } from "./CanvasView";
import { blankProject, demoProject, migrateProject } from "./project";
import { mirrored, poses } from "./poses";
import { Timeline, type TimelineKeyRef } from "./Timeline";
import { PoseBrowser } from "./PoseBrowser";
import { insertSpecialMove, specialMoves } from "./specialMoves";
import { compileScenarioV2 } from "./scenarioV2";
import { danceStyles } from "./danceData";
import type { Ease, EffectType, Pose, Project } from "./types";
import type {MotionFrame} from "./motionCapture";
import {commitMasterClipSource} from "./masterSequence";
import {restoreSceneDoc,sceneDoc} from "./sceneState";
import "./style.css";
import "./guide.css";
const actionGlyph: Record<string, string> = {
  Idle: "●",
  "Fight Stance": "⚔",
  "Step Forward": "→",
  "Step Back": "←",
  "Dash Forward": "➜",
  "Straight Punch": "✊",
  Hook: "↪",
  Uppercut: "↥",
  "Low Kick": "◒",
  "High Kick": "◓",
  Jump: "↑",
  "Dodge Back": "↙",
  "Dodge Down": "↓",
  "Block High": "⬒",
  "Block Low": "⬓",
  Knockback: "⇠",
  Fall: "↘",
  Recover: "↟",
};
const SESSION_KEY = "flip-studio-autosave-v1";
const LIBRARY_KEY = "flip-studio-project-library-v1";
const MotionCapture = lazy(() => import("./MotionCapturePanel").then(m => ({default:m.MotionCapture})));
const AutoDirectorPanel=lazy(()=>import("./AutoDirectorPanel").then(m=>({default:m.AutoDirectorPanel})));
const FightDirectorPanel=lazy(()=>import("./FightDirectorPanel").then(m=>({default:m.FightDirectorPanel})));
const CinematicPanel=lazy(()=>import("./CinematicPanel").then(m=>({default:m.CinematicPanel})));
const ProductionLibraryPanel=lazy(()=>import("./ProductionLibraryPanel").then(m=>({default:m.ProductionLibraryPanel})));
const CombatFxPanel=lazy(()=>import("./CombatFxPanel").then(m=>({default:m.CombatFxPanel})));
function MotionIssueReference({source,time,onClose}:{source:{url:string;fileName:string;inTime:number;frames:MotionFrame[]};time:number;onClose:()=>void}){const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);useEffect(()=>{const v=video.current,c=canvas.current;if(!v||!c)return;v.currentTime=time;const frame=source.frames.reduce((best,next)=>Math.abs(next.time-(time-source.inTime))<Math.abs(best.time-(time-source.inTime))?next:best,source.frames[0]);const ctx=c.getContext("2d")!;ctx.clearRect(0,0,c.width,c.height);if(!frame)return;const pairs=[["leftShoulder","rightShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftWrist"],["rightShoulder","rightElbow"],["rightElbow","rightWrist"],["leftHip","rightHip"],["leftHip","leftKnee"],["leftKnee","leftAnkle"],["rightHip","rightKnee"],["rightKnee","rightAnkle"]] as const;ctx.strokeStyle="#69d7ff";ctx.lineWidth=4;for(const[a,b]of pairs){const x=frame.joints[a],y=frame.joints[b];if(!x||!y)continue;ctx.beginPath();ctx.moveTo(x.x*c.width,x.y*c.height);ctx.lineTo(y.x*c.width,y.y*c.height);ctx.stroke();}},[source,time]);return <aside className="motion-issue-reference"><header><b>Source + Skeleton</b><button onClick={onClose}>×</button></header><div><video ref={video} src={source.url} controls/><canvas ref={canvas} width={426} height={240}/></div><small>{source.fileName} · {time.toFixed(2)}s</small></aside>}
function MasterPreviewCanvas({project,time,format}:{project:Project;time:number;format:Project["format"]}){const output=useRef<HTMLCanvasElement>(null),source=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=output.current,s=source.current;if(!c||!s)return;c.width=format.width;c.height=format.height;s.width=project.format.width;s.height=project.format.height;const sc=s.getContext("2d")!,ctx=c.getContext("2d")!;drawScene(sc,project,time,s.width,s.height,false);ctx.fillStyle="#000";ctx.fillRect(0,0,c.width,c.height);const scale=Math.min(c.width/s.width,c.height/s.height),w=s.width*scale,h=s.height*scale;ctx.drawImage(s,(c.width-w)/2,(c.height-h)/2,w,h)},[project,time,format]);return <><canvas ref={output} style={{aspectRatio:`${format.width} / ${format.height}`}}/><canvas ref={source} hidden/></>}
const FORMATS = [
  {
    id: "vertical",
    description: "Vertical",
    short: "9:16",
    width: 1080,
    height: 1920,
  },
  {
    id: "landscape",
    description: "Landscape",
    short: "16:9",
    width: 1920,
    height: 1080,
  },
  {
    id: "square",
    description: "Square",
    short: "1:1",
    width: 1080,
    height: 1080,
  },
  {
    id: "portrait",
    description: "Portrait",
    short: "4:5",
    width: 1080,
    height: 1350,
  },
];
const restoredSession = (() => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as {
      project?: Project;
      time?: number;
      selected?: string;
    };
    return value.project?.version === 1
      ? { ...value, project: migrateProject(value.project) }
      : null;
  } catch {
    return null;
  }
})();
export default function App() {
  const [p, setP] = useState<Project>(
      () => restoredSession?.project ?? demoProject(),
    ),
    [time, setTime] = useState(() =>
      Math.min(
        restoredSession?.time ?? 0,
        restoredSession?.project?.duration ?? 5,
      ),
    ),
    [playing, setPlaying] = useState(false),
    [sel, setSel] = useState<string>(() => restoredSession?.selected ?? "a"),
    [selectedActors, setSelectedActors] = useState<string[]>(() => [
      restoredSession?.selected ?? "a",
    ]),
    [selectedProp, setSelectedProp] = useState<string | null>(null),
    [clip, setClip] = useState<Pose | null>(null),
    [ease, setEase] = useState<Ease>("ease-in-out"),
    [help, setHelp] = useState(false),
    [newProjectOpen, setNewProjectOpen] = useState(false),
    [newTemplate, setNewTemplate] = useState("Blank"),
    [managerOpen, setManagerOpen] = useState(false),
    [scenarioOpen, setScenarioOpen] = useState(false),
    [autoDirectorOpen,setAutoDirectorOpen]=useState(false),
    [fightDirectorOpen,setFightDirectorOpen]=useState(false),
    [cinematicOpen,setCinematicOpen]=useState(false),
    [productionOpen,setProductionOpen]=useState(false),
    [masterPreview,setMasterPreview]=useState<{project:Project;time:number;masterTime:number;format:Project["format"]}|null>(null),
    [masterEdit,setMasterEdit]=useState<{clipId:string;host:Project}|null>(null),
    [combatFxOpen,setCombatFxOpen]=useState(false),
    [motionCaptureOpen, setMotionCaptureOpen] = useState(false),
    [activeMotionIssue,setActiveMotionIssue]=useState<string|null>(null),
    [motionReviewSource,setMotionReviewSource]=useState<{url:string;fileName:string;inTime:number;frames:MotionFrame[]}|null>(null),
    [scenarioText, setScenarioText] = useState(`{
  "duration": 10,
  "actors": [{"id":"anna","preset":"female"},{"id":"john","preset":"male"},{"id":"child","preset":"child"}],
  "props": [{"id":"chair","type":"chair"},{"id":"cup","type":"cup"}],
  "events": [{"time":1,"actor":"anna","action":"walk"},{"time":4,"action":"hug","participants":["anna","john"]},{"time":7,"actor":"child","action":"wave"}]
}`),
    [poseBrowserOpen, setPoseBrowserOpen] = useState(false),
    [posePreview, setPosePreview] = useState<{
      id: string;
      pose: Pose;
    } | null>(null),
    [transformMode, setTransformMode] = useState<TransformMode>("move"),
    [groundLock, setGroundLock] = useState(false),
    [autoFace, setAutoFace] = useState(false),
    [actionCategory, setActionCategory] = useState("Fight"),
    [actionSearch, setActionSearch] = useState(""),
    [favorites, setFavorites] = useState<string[]>([]),
    [recent, setRecent] = useState<string[]>([]),
    [interactionAction, setInteractionAction] = useState<string | null>(null),
    [interactionActors, setInteractionActors] = useState<string[]>([]),
    [danceStyle, setDanceStyle] = useState("Techno"),
    [danceCombination, setDanceCombination] = useState<string[]>([]),
    [danceLoops, setDanceLoops] = useState(4),
    [groupOffset, setGroupOffset] = useState(0),
    [dancePoseMode, setDancePoseMode] = useState(false),
    [freestyleDuration, setFreestyleDuration] = useState(10),
    [freestyleIntensity, setFreestyleIntensity] = useState("Medium"),
    [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
      null,
    ),
    [canvasEditing, setCanvasEditing] = useState(false),
    [cameraPreview, setCameraPreview] = useState(false),
    [cameraSafeArea, setCameraSafeArea] = useState(false),
    [timelineHeight, setTimelineHeight] = useState(() => +(localStorage.getItem("flip-ui-timeline-height") || 246)),
    [timelineCollapsed, setTimelineCollapsed] = useState(() => localStorage.getItem("flip-ui-timeline-collapsed") === "1"),
    [timelineSelection, setTimelineSelection] = useState<TimelineKeyRef[]>([]),
    [leftWidth, setLeftWidth] = useState(() => Math.max(320, +(localStorage.getItem("flip-ui-left-width") || 360))),
    [leftDrawer, setLeftDrawer] = useState<"scene" | "actions" | null>(null),
    [rightWidth, setRightWidth] = useState(() => +(localStorage.getItem("flip-ui-right-width") || 280)),
    [inspectorHidden, setInspectorHidden] = useState(false),
    [library, setLibrary] = useState<Record<string, Project>>(() => {
      try {
        return JSON.parse(localStorage.getItem(LIBRARY_KEY) || "{}");
      } catch {
        return {};
      }
    }),
    last = useRef(0),
    rt = useRef(restoredSession?.time ?? 0),
    gestureSnapshot = useRef<Project | null>(null),
    undoStack = useRef<Project[]>([]),
    redoStack = useRef<Project[]>([]);
  const timelineClipboard = useRef<{ track: string; key: any; offset: number }[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ project: p, time, selected: sel }),
        );
      } catch {
        // Saving a project file still works if browser storage is unavailable.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [p, time, sel]);
  useEffect(() => () => {
    if (motionReviewSource) URL.revokeObjectURL(motionReviewSource.url);
  }, [motionReviewSource]);
  useEffect(() => {
    localStorage.setItem("flip-ui-timeline-height", String(timelineHeight));
    localStorage.setItem("flip-ui-timeline-collapsed", timelineCollapsed ? "1" : "0");
    localStorage.setItem("flip-ui-left-width", String(leftWidth));
    localStorage.setItem("flip-ui-right-width", String(rightWidth));
  }, [timelineHeight, timelineCollapsed, leftWidth, rightWidth]);
  const update = (f: (x: Project) => void) =>
    setP((o) => {
      undoStack.current.push(structuredClone(o));
      if (undoStack.current.length > 80) undoStack.current.shift();
      redoStack.current = [];
      const n = structuredClone(o);
      f(n);
      return n;
    });
  const replaceProject = (next: Project) => {
    undoStack.current.push(structuredClone(p));
    redoStack.current = [];
    setP(next);
    const first = next.characters[0]?.id ?? "";
    setSel(first);
    setSelectedActors(first ? [first] : []);
    setSelectedProp(null);
    setTimelineSelection([]);
    seek(0);
  };
  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(structuredClone(p));
    setP(previous);
    setTimelineSelection([]);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(structuredClone(p));
    setP(next);
    setTimelineSelection([]);
  };
  const addFighter = (
    id: string,
    preset: import("./types").Character["preset"] = "standard",
    name?: string,
  ) =>
    update((n) => {
      if (n.characters.some((c) => c.id === id)) return;
      const format = n.format ?? { width: 1080, height: 1920 };
      const ground = Math.min(910, format.height * 0.8);
      const index = n.characters.length,
        size =
          preset === "child" || preset === "small"
            ? 0.72
            : preset === "large"
              ? 1.25
              : 1;
      const pose = basePose(
        format.width * (0.25 + (index % 4) * 0.17),
        ground - 190,
        index % 2 === 1,
      );
      n.characters.push({
        id,
        name: name ?? `Character ${index + 1}`,
        type: "stick_character",
        preset,
        color: [
          "#45a3ff",
          "#ff4d64",
          "#65d690",
          "#b277ff",
          "#ffb347",
          "#57d6d6",
        ][index % 6],
        pose,
        flip: index % 2 === 1,
        scale: size,
        rotation: 0,
        visible: true,
      });
      n.tracks[id] = [
        {
          id: uid(),
          time: 0,
          pose,
          easing: "ease-in-out",
          scaleX: size,
          scaleY: size,
        },
      ];
    });
  const addActor = (
    preset: import("./types").Character["preset"] = "standard",
  ) => {
    const id = `actor_${uid().slice(-8)}`,
      name = prompt(
        "Character name",
        `Character ${p.characters.length + 1}`,
      )?.trim();
    if (!name) return;
    const choice = prompt(
      "Preset: standard, male, female, child, large, small",
      preset,
    )
      ?.trim()
      .toLowerCase();
    if (
      ["standard", "male", "female", "child", "large", "small"].includes(
        choice ?? "",
      )
    )
      preset = choice as typeof preset;
    addFighter(id, preset, name);
    setSel(id);
    setSelectedActors([id]);
    setSelectedProp(null);
  };
  const addProp = (type: import("./types").PropType) => {
    const id = `prop_${uid().slice(-8)}`;
    update((n) => {
      n.props ??= [];
      n.propTracks ??= {};
      n.props.push({
        id,
        name: type[0].toUpperCase() + type.slice(1),
        type,
        color:
          type === "sword"
            ? "#b8c6d8"
            : type === "flower"
              ? "#ff6b9d"
              : "#b98b5f",
        visible: true,
        locked: false,
        layer: 5,
      });
      n.propTracks[id] = [
        {
          id: uid(),
          time,
          x: n.format.width / 2,
          y: Math.min(910, n.format.height * 0.8),
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          flipH: false,
          opacity: 1,
          attachment: null,
          easing: "ease-in-out",
        },
      ];
    });
    setSelectedProp(id);
  };
  const updatePropTransform = (
    id: string,
    partial: Partial<import("./types").PropTransform>,
  ) =>
    update((n) => {
      n.propTracks ??= {};
      const track = n.propTracks[id] ?? [];
      let key = track.find((item) => Math.abs(item.time - time) < 0.025);
      if (!key) {
        key = {
          id: uid(),
          time,
          easing: ease,
          ...propTransformAt(track, time),
        };
        track.push(key);
        n.propTracks[id] = track;
      }
      Object.assign(key, partial);
    });
  const duplicateProp = (id: string) =>
    update((n) => {
      const source = n.props?.find((x) => x.id === id);
      if (!source) return;
      const nextId = `prop_${uid().slice(-8)}`;
      n.props!.push({ ...source, id: nextId, name: source.name + " Copy" });
      n.propTracks![nextId] = (n.propTracks![id] ?? []).map((k) => ({
        ...k,
        id: uid(),
        x: k.x + 40,
        y: k.y + 40,
      }));
      setSelectedProp(nextId);
    });
  const deleteSelectedEntity = () => {
    if (selectedProp)
      update((n) => {
        n.props = n.props!.filter((x) => x.id !== selectedProp);
        delete n.propTracks![selectedProp];
        setSelectedProp(null);
      });
    else
      update((n) => {
        n.characters = n.characters.filter((c) => c.id !== sel);
        delete n.tracks[sel];
        for (const track of Object.values(n.propTracks ?? {}))
          for (const k of track)
            if (k.attachment?.actorId === sel) k.attachment = null;
        n.effects = n.effects.filter(
          (e) => e.sourceFighter !== sel && e.targetFighter !== sel,
        );
        const next = n.characters[0]?.id ?? "";
        setSel(next);
        setSelectedActors(next ? [next] : []);
      });
  };
  const livePropTransform = (id: string, tf: import("./types").PropTransform) =>
    setP((old) => {
      const n = structuredClone(old);
      n.propTracks ??= {};
      const track = (n.propTracks[id] ??= []);
      let key = track.find((item) => Math.abs(item.time - time) < 0.025);
      if (!key) {
        key = {
          id: uid(),
          time,
          easing: ease,
          ...propTransformAt(track, time),
        };
        track.push(key);
        n.propTracks[id] = track;
      }
      Object.assign(key, tf);
      return n;
    });
  const saveToLibrary = () => {
    const name = prompt("Project name", p.name)?.trim();
    if (!name) return;
    const saved = { ...structuredClone(p), name };
    const next = { ...library, [name]: saved };
    setLibrary(next);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    setP(saved);
  };
  const deleteLibraryProject = (name: string) => {
    const next = { ...library };
    delete next[name];
    setLibrary(next);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  };
  const startNewProject = (format: (typeof FORMATS)[number]) => {
    const next = blankProject({
      label: format.short,
      width: format.width,
      height: format.height,
    });
    next.name = `New ${format.description} ${newTemplate} Scene`;
    if (newTemplate === "Blank") {
      next.characters = [];
      next.tracks = {};
    } else if (newTemplate === "Lifestyle") {
      next.characters = next.characters.slice(0, 1);
      delete next.tracks.b;
    } else if (newTemplate === "Family") {
      const ground = Math.min(910, format.height * 0.8),
        pose = basePose(format.width * 0.5, ground - 190, false),
        id = "actor_3";
      next.characters.push({
        id,
        name: "Child",
        type: "stick_character",
        preset: "child",
        color: "#65d690",
        pose,
        flip: false,
        scale: 0.72,
        rotation: 0,
        visible: true,
        locked: false,
        layer: 30,
      });
      next.tracks[id] = [
        {
          id: uid(),
          time: 0,
          pose,
          easing: "ease-in-out",
          scaleX: 0.72,
          scaleY: 0.72,
        },
      ];
    }
    setActionCategory(
      newTemplate === "Sword / Melee"
        ? "Sword / Melee"
        : newTemplate === "Cinematic"
          ? "Cinematic Action"
          : newTemplate,
    );
    setTime(0);
    rt.current = 0;
    setPlaying(false);
    setTransformMode("move");
    setCameraPreview(false);
    setSelectedProp(null);
    setSel(next.characters[0]?.id ?? "");
    setSelectedActors(next.characters[0] ? [next.characters[0].id] : []);
    replaceProject(next);
    setNewProjectOpen(false);
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      if (!last.current) last.current = now;
      rt.current += Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const t = sourceTimeAt(p.speed, rt.current);
      setTime(t);
      if (t >= p.duration) {
        setPlaying(false);
        rt.current = 0;
        last.current = 0;
        setTime(0);
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, p]);
  const seek = (t: number) => {
    setTime(t);
    rt.current = t;
    last.current = 0;
  };
  const addKey = (pose?: Pose) =>
    update((n) => {
      const tf = transformAt(n.tracks[sel], time);
      n.tracks[sel].push({
        id: uid(),
        time,
        pose: clonePose(pose ?? poseAt(n.tracks[sel], time)),
        easing: ease,
        ...tf,
      });
    });
  const current = poseAt(p.tracks[sel], time);
  const alignedBuiltInPose = (name: string, fighter: string) => {
    if (!poses[name]) return;
    let next = clonePose(poses[name]);
    if (p.characters.find((c) => c.id === fighter)?.flip) next = mirrored(next);
    const actual = poseAt(p.tracks[fighter], time);
    const dx = actual.root.x - next.root.x;
    const dy = actual.root.y - next.root.y;
    for (const joint in next) {
      next[joint as keyof Pose].x += dx;
      next[joint as keyof Pose].y += dy;
    }
    return next;
  };
  const applyBuiltInPose = (
    name: string,
    fighter: string = sel,
    forceNew = false,
  ) => {
    const next = alignedBuiltInPose(name, fighter);
    if (!next) return;
    setSel(fighter);
    update((n) => {
      const tf = transformAt(n.tracks[fighter], time);
      const k = forceNew
        ? undefined
        : n.tracks[fighter].find((x) => Math.abs(x.time - time) < 0.025);
      if (k) k.pose = next;
      else
        n.tracks[fighter].push({
          id: uid(),
          time,
          pose: next,
          easing: ease,
          ...tf,
        });
    });
  };
  const changePose = (pose: Pose) =>
    update((n) => {
      let k = n.tracks[sel].find((x) => Math.abs(x.time - time) < 0.025);
      if (!k) {
        k = { id: uid(), time, pose, easing: ease };
        n.tracks[sel].push(k);
      }
      k.pose = pose;
    });
  const mutateCurrentKey = (
    n: Project,
    fighter: string,
    pose?: Pose,
    transform?: ReturnType<typeof transformAt>,
  ) => {
    const track = n.tracks[fighter];
    if (!track) return;
    let k = track.find((x) => Math.abs(x.time - time) < 0.025);
    if (!k) {
      const tf = transformAt(n.tracks[fighter], time);
      k = {
        id: uid(),
        time,
        pose: clonePose(pose ?? poseAt(n.tracks[fighter], time)),
        easing: ease,
        ...tf,
      };
      track.push(k);
    }
    if (pose) k.pose = clonePose(pose);
    if (transform) Object.assign(k, transform);
  };
  const beginCanvasGesture = () => {
    setCanvasEditing(true);
    if (!gestureSnapshot.current) gestureSnapshot.current = structuredClone(p);
  };
  const livePoseChange = (fighter: string, pose: Pose) =>
    setP((old) => {
      const next = structuredClone(old);
      const prior = poseAt(next.tracks[fighter], time),
        dx = pose.root.x - prior.root.x,
        dy = pose.root.y - prior.root.y;
      mutateCurrentKey(next, fighter, pose);
      if (
        selectedActors.includes(fighter) &&
        selectedActors.length > 1 &&
        (dx || dy)
      )
        for (const id of selectedActors.filter((x) => x !== fighter)) {
          const other = clonePose(poseAt(next.tracks[id], time));
          Object.values(other).forEach((j) => {
            j.x += dx;
            j.y += dy;
          });
          mutateCurrentKey(next, id, other);
        }
      return next;
    });
  const liveTransformChange = (
    fighter: string,
    transform: ReturnType<typeof transformAt>,
  ) =>
    setP((old) => {
      const next = structuredClone(old);
      mutateCurrentKey(next, fighter, undefined, transform);
      return next;
    });
  const mutateCameraAtPlayhead = (
    n: Project,
    camera: ReturnType<typeof cameraAt>,
  ) => {
    let key = n.camera.find((item) => Math.abs(item.time - time) < 0.025);
    if (!key) {
      key = { id: uid(), time, easing: ease, ...cameraAt(n.camera, time) };
      n.camera.push(key);
    }
    Object.assign(key, camera);
  };
  const liveCameraChange = (camera: ReturnType<typeof cameraAt>) =>
    setP((old) => {
      const next = structuredClone(old);
      mutateCameraAtPlayhead(next, camera);
      return next;
    });
  const frameActors = (ids = selectedActors, preset: "wide" | "full" | "medium" | "close" = "full") =>
    update((n) => {
      const actors = ids.filter((id) => n.tracks[id]);
      if (!actors.length) return;
      const points = actors.flatMap((id) => Object.values(poseAt(n.tracks[id], time)));
      const left = Math.min(...points.map((q) => q.x)), right = Math.max(...points.map((q) => q.x));
      const top = Math.min(...points.map((q) => q.y)), bottom = Math.max(...points.map((q) => q.y));
      const format = n.format ?? { width: 1080, height: 1920 };
      const multiplier = preset === "wide" ? 2 : preset === "medium" ? .9 : preset === "close" ? .55 : 1.3;
      const targetW = Math.max(220, (right - left + 140) * multiplier);
      const targetH = Math.max(260, (bottom - top + 140) * multiplier);
      const zoom = Math.min(format.width / targetW, format.height / targetH);
      mutateCameraAtPlayhead(n, {
        x: (left + right) / 2,
        y: preset === "close" ? top + (bottom - top) * .24 : (top + bottom) / 2,
        zoom: Math.max(.1, Math.min(8, zoom)),
        rotation: cameraAt(n.camera, time).rotation,
      });
    });
  const faceOpponentIn = (n: Project, fighter: string) => {
    if (!n.tracks[fighter]) return;
    const me = poseAt(n.tracks[fighter], time).root.x,
      other = n.characters
        .filter((c) => c.id !== fighter && c.visible && n.tracks[c.id])
        .map((c) => ({ id: c.id, distance: Math.abs(poseAt(n.tracks[c.id], time).root.x - me) }))
        .sort((a, b) => a.distance - b.distance)[0]?.id;
    if (!other) return;
    const them = poseAt(n.tracks[other], time).root.x;
    const tf = transformAt(n.tracks[fighter], time);
    mutateCurrentKey(n, fighter, undefined, {
      ...tf,
      // Authored poses face right. A fighter standing to the opponent's right
      // must therefore be mirrored to face left.
      flipH: me > them,
    });
  };
  const faceAllOpponentsIn = (n: Project) =>
    n.characters.filter((c) => c.visible).forEach((c) => faceOpponentIn(n, c.id));
  const swapSelectedWithOpponent = () => {
    const selectedTrack = p.tracks[sel];
    if (!selectedTrack) {
      alert("Select a character before using Swap Sides.");
      return;
    }
    const selectedX = poseAt(selectedTrack, time).root.x;
    const opponent = p.characters
      .filter((character) => character.id !== sel && character.visible && p.tracks[character.id])
      .map((character) => ({
        id: character.id,
        distance: Math.abs(poseAt(p.tracks[character.id], time).root.x - selectedX),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!opponent) {
      alert("Swap Sides needs a second visible character.");
      return;
    }
    update((n) => {
      const first = poseAt(n.tracks[sel], time),
        second = poseAt(n.tracks[opponent.id], time),
        firstX = first.root.x,
        secondX = second.root.x,
        movedFirst = clonePose(first),
        movedSecond = clonePose(second);
      Object.values(movedFirst).forEach((joint) => (joint.x += secondX - firstX));
      Object.values(movedSecond).forEach((joint) => (joint.x += firstX - secondX));
      mutateCurrentKey(n, sel, movedFirst);
      mutateCurrentKey(n, opponent.id, movedSecond);
      if (autoFace) {
        faceOpponentIn(n, sel);
        faceOpponentIn(n, opponent.id);
      }
    });
  };
  const endCanvasGesture = () => {
    setCanvasEditing(false);
    const before = gestureSnapshot.current;
    gestureSnapshot.current = null;
    if (before) {
      undoStack.current.push(before);
      redoStack.current = [];
    }
    if (autoFace)
      setP((old) => {
        const next = structuredClone(old);
        faceAllOpponentsIn(next);
        return next;
      });
  };
  const setTransform = (partial: Partial<ReturnType<typeof transformAt>>) =>
    update((n) => {
      const tf = transformAt(n.tracks[sel], time);
      mutateCurrentKey(n, sel, undefined, { ...tf, ...partial });
    });
  const flipHorizontal = () =>
    setTransform({ flipH: !transformAt(p.tracks[sel], time).flipH });
  const duplicateFighter = () => {
    const target = `actor_${uid().slice(-8)}`;
    update((n) => {
      const source = n.characters.find((c) => c.id === sel)!;
      if (!source) return;
      const pose = clonePose(poseAt(n.tracks[sel], time));
      Object.values(pose).forEach((joint) => (joint.x += 55));
      n.characters.push({
        ...source,
        id: target,
        name: `${source.name} Copy`,
        color: source.color,
      });
      n.tracks[target] = [
        {
          id: uid(),
          time,
          pose,
          easing: ease,
          ...transformAt(n.tracks[sel], time),
        },
      ];
      setSel(target);
    });
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const commandKey = e.ctrlKey || e.metaKey;
      const shortcut = e.key.toLowerCase();
      // History shortcuts are application-level commands. Handle them before
      // the input/editor guard so they remain available everywhere in the UI,
      // including while a field or popup control has focus.
      if (commandKey && !e.altKey && shortcut === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (commandKey && !e.altKey && shortcut === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (timelineSelection.length && commandKey && !e.altKey && shortcut === "c") {
        e.preventDefault();
        copyTimelineKeys();
        return;
      }
      if (commandKey && !e.altKey && shortcut === "v" && timelineClipboard.current.length) {
        e.preventDefault();
        pasteTimelineKeys();
        return;
      }
      if (timelineSelection.length && commandKey && !e.altKey && shortcut === "d") {
        e.preventDefault();
        pasteTimelineKeys(true);
        return;
      }
      if (timelineSelection.length && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        deleteTimelineKeys();
        return;
      }
      if (
        poseBrowserOpen ||
        /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement)?.tagName)
      )
        return;
      if (e.key.toLowerCase() === "v") setTransformMode("move");
      if (e.key.toLowerCase() === "r") setTransformMode("rotate");
      if (e.key.toLowerCase() === "s") setTransformMode("scale");
      if (e.key.toLowerCase() === "c") setTransformMode("camera");
      if (e.key.toLowerCase() === "f") frameActors();
      if (e.key === "Escape") setLeftDrawer(null);
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        flipHorizontal();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedProp) duplicateProp(selectedProp);
        else duplicateFighter();
      }
      if (e.key === "Delete") deleteSelectedEntity();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const insert = (
    name: string,
    repetitions = 1,
    actorIds = [sel],
    stagger = 0,
  ) => {
    if (!p.characters.some((c) => c.id === actorIds[0])) {
      alert("First add and select a character.");
      return;
    }
    const ac = actions.find((a) => a.name === name)!;
    setRecent((old) => [name, ...old.filter((x) => x !== name)].slice(0, 8));
    update((n) => {
      const beatDuration = 60 / (n.dance?.bpm ?? 120),
        iterationDuration = ac.beats ? ac.beats * beatDuration : ac.duration,
        scale = iterationDuration / ac.duration;
      actorIds.forEach((actorId, actorIndex) => {
        const origin = poseAt(n.tracks[actorId], time).root,
          startTf = transformAt(n.tracks[actorId], time);
        for (let repeat = 0; repeat < Math.max(1, repetitions); repeat++)
          for (const q of ac.keyframes) {
            let po = clonePose(poses[q.pose] ?? poses.idle);
            // Snapshot the authored pelvis before translating the pose.  Keeping
            // a reference to `po.root` makes the first loop iteration mutate the
            // anchor, so the root moves while every other joint keeps the old
            // offset (visually splitting the character at the waist).
            const base = { ...po.root };
            for (const j in po) {
              po[j as keyof Pose].x +=
                origin.x -
                base.x +
                (q.dx ?? 0) *
                  (n.characters.find((c) => c.id === actorId)?.flip ? -1 : 1);
              po[j as keyof Pose].y += origin.y - base.y + (q.dy ?? 0);
            }
            const keyTime =
                time +
                repeat * iterationDuration +
                q.time * scale +
                actorIndex * stagger,
              tf = transformAt(n.tracks[actorId], keyTime);
            n.tracks[actorId].push({
              id: uid(),
              time: keyTime,
              pose: po,
              easing: q.easing,
              ...tf,
              rotation:
                q.rootRotation !== undefined
                  ? startTf.rotation + q.rootRotation * (repeat + 1)
                  : tf.rotation,
            });
          }
      });
      n.duration = Math.max(
        n.duration,
        time +
          repetitions * iterationDuration +
          (actorIds.length - 1) * stagger,
      );
    });
  };
  const requestAction = (name: string) => {
    const action = actions.find((x) => x.name === name)!;
    const count = action.participants?.filter((x) => x === "actor").length ?? 1;
    if (count > 1) {
      setInteractionAction(name);
      setInteractionActors([
        sel,
        ...p.characters
          .filter((x) => x.id !== sel)
          .slice(0, count - 1)
          .map((x) => x.id),
      ]);
      return;
    }
    insert(name);
  };
  const insertDanceSequence = (
    names: string[],
    actorIds = [sel],
    stagger = 0,
  ) => {
    if (!names.length || !actorIds.length) return;
    update((n) => {
      const beat = 60 / (n.dance?.bpm ?? 120);
      actorIds.forEach((actorId, actorIndex) => {
        let cursor = time + actorIndex * stagger;
        for (const name of names) {
          const action = actions.find((a) => a.name === name);
          if (!action) continue;
          const duration = action.beats ? action.beats * beat : action.duration,
            scale = duration / action.duration,
            origin = poseAt(n.tracks[actorId], cursor).root,
            startTf = transformAt(n.tracks[actorId], cursor);
          for (const key of action.keyframes) {
            const po = clonePose(poses[key.pose] ?? poses.idle),
              ox = po.root.x,
              oy = po.root.y;
            Object.values(po).forEach((j) => {
              j.x += origin.x - ox + (key.dx ?? 0);
              j.y += origin.y - oy + (key.dy ?? 0);
            });
            n.tracks[actorId].push({
              id: uid(),
              time: cursor + key.time * scale,
              pose: po,
              easing: key.easing,
              ...startTf,
              rotation:
                key.rootRotation !== undefined
                  ? startTf.rotation + key.rootRotation
                  : startTf.rotation,
            });
          }
          cursor += duration;
        }
        n.duration = Math.max(n.duration, cursor);
      });
    });
  };
  const generateFreestyle = () => {
    const pool = actions.filter(
      (a) =>
        a.categories?.includes("Dance") &&
        a.style === danceStyle &&
        (freestyleIntensity === "High" ||
          a.intensity === freestyleIntensity ||
          a.intensity === "Low"),
    );
    if (!pool.length) return;
    const beat = 60 / (p.dance?.bpm ?? 120);
    let total = 0,
      index = 0;
    const sequence: string[] = [];
    while (total < freestyleDuration) {
      const action = pool[(index * 7 + sequence.length * 3) % pool.length];
      sequence.push(action.name);
      total += (action.beats ?? 4) * beat;
      index++;
    }
    insertDanceSequence(sequence);
    setDanceCombination(sequence);
  };
  const applyFormation = (kind: string) =>
    update((n) => {
      const actors = n.characters,
        w = n.format.width,
        cx = w / 2,
        ground = Math.min(910, n.format.height * 0.8);
      actors.forEach((actor, i) => {
        let x = cx + (i - (actors.length - 1) / 2) * 150,
          y = ground - 190;
        if (kind === "V") {
          x = cx + (i - (actors.length - 1) / 2) * 170;
          y += Math.abs(i - (actors.length - 1) / 2) * 65;
        } else if (kind === "Circle") {
          const angle = (i / actors.length) * Math.PI * 2;
          x = cx + Math.cos(angle) * 260;
          y = ground - 190 + Math.sin(angle) * 130;
        } else if (kind === "Two Rows") {
          x =
            cx +
            ((i % Math.ceil(actors.length / 2)) -
              (Math.ceil(actors.length / 2) - 1) / 2) *
              180;
          y += Math.floor(i / Math.ceil(actors.length / 2)) * 130;
        } else if (kind === "Staggered") y += (i % 2) * 100;
        const current = poseAt(n.tracks[actor.id], time),
          dx = x - current.root.x,
          dy = y - current.root.y,
          pose = clonePose(current);
        Object.values(pose).forEach((j) => {
          j.x += dx;
          j.y += dy;
        });
        mutateCurrentKey(n, actor.id, pose);
      });
    });
  const insertInteraction = () => {
    const action = actions.find((x) => x.name === interactionAction);
    if (!action) return;
    update((n) => {
      const duration = action.beats
          ? (action.beats * 60) / (n.dance?.bpm ?? 120)
          : action.duration,
        scale = duration / action.duration;
      const lead = interactionActors[0],
        leadRoot = poseAt(n.tracks[lead], time).root;
      interactionActors.forEach((actorId, index) => {
        const current = poseAt(n.tracks[actorId], time),
          desiredX = leadRoot.x + (index === 0 ? 0 : index * 115),
          approach = clonePose(current);
        Object.values(approach).forEach(
          (j) => (j.x += desiredX - current.root.x),
        );
        if (index > 0)
          n.tracks[actorId].push(
            {
              id: uid(),
              time: Math.max(0, time - 0.7),
              pose: current,
              easing: "ease-in-out",
            },
            { id: uid(), time, pose: approach, easing: "ease-out" },
          );
        const origin = index ? approach.root : leadRoot;
        for (const key of action.keyframes) {
          let po = clonePose(poses[key.pose] ?? poses.neutral_stand);
          const ox = po.root.x,
            oy = po.root.y;
          Object.values(po).forEach((j) => {
            j.x += origin.x - ox + (key.dx ?? 0);
            j.y += origin.y - oy + (key.dy ?? 0);
          });
          n.tracks[actorId].push({
            id: uid(),
            time: time + key.time * scale,
            pose: po,
            easing: key.easing,
          });
        }
      });
      n.duration = Math.max(n.duration, time + duration);
    });
    setRecent((old) =>
      [action.name, ...old.filter((x) => x !== action.name)].slice(0, 8),
    );
    setInteractionAction(null);
  };
  const insertSpecial = (id: string) => {
    const move = specialMoves.find((item) => item.id === id);
    if (
      !move ||
      !p.characters.some((c) => c.id === sel) ||
      p.characters.length < 2
    )
      return alert("Special Moves require Fighter A and Fighter B.");
    undoStack.current.push(structuredClone(p));
    redoStack.current = [];
    setP(insertSpecialMove(p, move, sel, time));
  };
  const save = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
    );
    a.download = (p.name || "project") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const load = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        replaceProject(migrateProject(JSON.parse(String(r.result))));
      } catch {
        alert("Invalid project JSON");
      }
    };
    r.readAsText(file);
  };
  const exportVideo = async () => {
    const fps = [24, 30, 60].includes(p.fps) ? p.fps : 24;
    const c = document.createElement("canvas");
    const format = p.format ?? { label: "9:16", width: 1080, height: 1920 };
    c.width = format.width;
    c.height = format.height;
    if (!("MediaRecorder" in window) || !c.captureStream)
      return alert("Video recording is unavailable here. Use Chrome or Edge.");
    const ctx = c.getContext("2d")!,
      stream = c.captureStream(fps),
      chunks: Blob[] = [];
    const mime = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((x) => MediaRecorder.isTypeSupported(x));
    if (!mime) return alert("This browser does not support WebM recording.");
    const rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 12_000_000,
    });
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const finished = new Promise<void>((resolve, reject) => {
      rec.onstop = () => resolve();
      rec.onerror = () => reject(new Error("Video recorder failed"));
    });
    rec.start(250);
    const outputSeconds=outputDuration(p.speed,p.duration);
    for (let i = 0; i <= outputSeconds * fps; i++) {
      const realTime = i / fps;
      drawScene(
        ctx,
        p,
        sourceTimeAt(p.speed, realTime),
        format.width,
        format.height,
        false,
      );
      await new Promise((r) => setTimeout(r, Math.max(1, 1000 / fps)));
    }
    rec.stop();
    await finished;
    if (!chunks.length)
      return alert("No video data was produced. Try Chrome or Edge.");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob(chunks, { type: mime }));
    a.href = url;
    a.download = p.name + ".webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    alert(
      `Exported WebM at ${format.width}×${format.height}. Convert to MP4 with: ffmpeg -i "` +
        p.name +
        '.webm" -c:v libx264 -pix_fmt yuv420p demo.mp4',
    );
  };
  const timelineTrack = (project: Project, track: string): any[] =>
    track.startsWith("prop:")
      ? (project.propTracks?.[track.slice(5)] ?? [])
      : project.tracks[track]
        ? project.tracks[track]
        : track === "camera"
          ? project.camera
          : track === "effects"
            ? project.effects
            : project.speed;
  const selectTimelineKeys = (keys: TimelineKeyRef[], mode: "replace" | "toggle" | "add") =>
    setTimelineSelection((old) => {
      const token = (key: TimelineKeyRef) => `${key.track}:${key.id}`;
      if (mode === "replace") return keys;
      const map = new Map(old.map((key) => [token(key), key]));
      keys.forEach((key) => {
        const id = token(key);
        if (mode === "toggle" && map.has(id)) map.delete(id);
        else map.set(id, key);
      });
      return [...map.values()];
    });
  const moveTimelineKeys = (keys: TimelineKeyRef[], requestedDelta: number) => {
    const source = keys.map((ref) => timelineTrack(p, ref.track).find((key) => key.id === ref.id)).filter(Boolean);
    if (!source.length) return;
    const min = Math.min(...source.map((key) => key.time)), max = Math.max(...source.map((key) => key.time));
    const delta = Math.max(-min, Math.min(p.duration - max, requestedDelta));
    if (Math.abs(delta) < 0.0001) return;
    update((n) => keys.forEach((ref) => { const key = timelineTrack(n, ref.track).find((item) => item.id === ref.id); if (key) key.time += delta; }));
  };
  const deleteTimelineKeys = () => {
    if (!timelineSelection.length) return;
    update((n) => timelineSelection.forEach((ref) => { const track = timelineTrack(n, ref.track), index = track.findIndex((key) => key.id === ref.id); if (index >= 0) track.splice(index, 1); }));
    setTimelineSelection([]);
  };
  const copyTimelineKeys = () => {
    const entries = timelineSelection.map((ref) => ({ ref, key: timelineTrack(p, ref.track).find((key) => key.id === ref.id) })).filter((entry) => entry.key);
    if (!entries.length) return;
    const base = Math.min(...entries.map((entry) => entry.key.time));
    timelineClipboard.current = entries.map((entry) => ({ track: entry.ref.track, key: structuredClone(entry.key), offset: entry.key.time - base }));
  };
  const pasteTimelineKeys = (duplicate = false) => {
    if (duplicate) copyTimelineKeys();
    if (!timelineClipboard.current.length) return;
    const base = duplicate ? Math.min(p.duration, Math.max(...timelineClipboard.current.map((x) => x.key.time)) + 0.1) : time;
    const created = timelineClipboard.current.map((entry) => ({ ...entry, id: uid(), time: Math.min(p.duration, base + entry.offset) }));
    update((n) => created.forEach((entry) => timelineTrack(n, entry.track).push({ ...structuredClone(entry.key), id: entry.id, time: entry.time })));
    setTimelineSelection(created.map((entry) => ({ track: entry.track, id: entry.id })));
  };
  const activateDirectorScene=(id:string,history=true)=>{const apply=(old:Project)=>{if(!old.director||old.director.activeSceneId===id||!old.director.sceneDocuments[id])return old;const director=structuredClone(old.director);director.sceneDocuments[director.activeSceneId]=sceneDoc(old);const restored=restoreSceneDoc(old,director.sceneDocuments[id]);director.activeSceneId=id;restored.director=director;return restored;};if(history){undoStack.current.push(structuredClone(p));redoStack.current=[];}setP(apply);seek(0);};
  const editMasterClip=(clipId:string)=>{const clip=p.master?.clips.find(item=>item.id===clipId);if(!clip)return;setMasterEdit({clipId,host:structuredClone(p)});setMasterPreview(null);setProductionOpen(false);setP({...structuredClone(clip.source),master:structuredClone(p.master)});seek(Math.min(clip.in,clip.source.duration));};
  const commitMasterClip=()=>{if(!masterEdit)return;let next:Project;try{next=commitMasterClipSource(masterEdit.host,masterEdit.clipId,p)}catch{setMasterEdit(null);return;}undoStack.current.push(structuredClone(masterEdit.host));if(undoStack.current.length>80)undoStack.current.shift();redoStack.current=[];setP(next);setMasterEdit(null);setProductionOpen(true);seek(0);};
  const playDirectorSequence=async()=>{const scenes=p.director?.plan.scenes;if(!scenes)return;for(const scene of scenes){activateDirectorScene(scene.id,false);await new Promise(r=>setTimeout(r,50));setTime(0);rt.current=0;setPlaying(true);await new Promise(r=>setTimeout(r,scene.duration*1000));setPlaying(false);} };
  return (
    <main style={{ gridTemplateRows: `48px minmax(220px, 1fr) 6px ${timelineCollapsed ? 36 : timelineHeight}px` }}>
      <header>
        <b>2D FLIP STUDIO</b>
        {masterEdit&&<button className="production-button" onClick={commitMasterClip}>↩ RETURN TO MASTER</button>}
        <button className="create-animation" onClick={()=>setAutoDirectorOpen(true)}>✦ CREATE ANIMATION</button>
        <button className="fight-director-button" onClick={()=>setFightDirectorOpen(true)}>⚔ FIGHT</button>
        <button className="cinematic-button" onClick={()=>setCinematicOpen(true)}>◒ CINEMATIC</button>
        <button className="production-button" onClick={()=>setProductionOpen(true)}>▦ LIBRARY / MASTER</button>
        <button className="combat-button" onClick={()=>setCombatFxOpen(true)}>✦ COMBAT FX</button>
        <button
          className="top-icon tip"
          data-tip="Scenario V2 · multi-actor JSON"
          aria-label="Scenario V2"
          onClick={() => setScenarioOpen(true)}
        >
          ✦
        </button>
        <button
          className="top-icon tip"
          data-tip="Import body motion from a local video"
          aria-label="Video Motion Capture"
          onClick={() => setMotionCaptureOpen(true)}
        >
          ◉
        </button>
        <button
          className="top-icon tip"
          data-tip="Undo · Ctrl+Z"
          aria-label="Undo"
          onClick={undo}
        >
          ↶
        </button>
        <button
          className="top-icon tip"
          data-tip="Redo · Ctrl+Y"
          aria-label="Redo"
          onClick={redo}
        >
          ↷
        </button>
        <button
          className="top-icon tip"
          data-tip="New Project"
          aria-label="New Project"
          onClick={() => setNewProjectOpen(true)}
        >
          ＋
        </button>
        <button
          className="top-icon tip"
          data-tip="Save to project library"
          aria-label="Save to Library"
          onClick={saveToLibrary}
        >
          ★
        </button>
        <button
          className="top-icon tip"
          data-tip="Project Manager"
          aria-label="Projects"
          onClick={() => setManagerOpen(true)}
        >
          ▦
        </button>
        <span className="toolbar-separator" />
        <button
          className="top-icon tip"
          data-tip={playing ? "Pause" : "Play"}
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? "Ⅱ" : "▶"}
        </button>
        <button
          className="top-icon tip"
          data-tip="Stop and rewind"
          aria-label="Stop"
          onClick={() => seek(0)}
        >
          ■
        </button>
        <button
          className="top-icon tip"
          data-tip="Add keyframe"
          aria-label="Add Keyframe"
          onClick={() => addKey()}
        >
          ◆＋
        </button>
        <button
          className="top-icon tip"
          data-tip="Delete keyframe at playhead"
          aria-label="Delete Keyframe"
          onClick={() =>
            update(
              (n) =>
                (n.tracks[sel] = n.tracks[sel].filter(
                  (k) => Math.abs(k.time - time) > 0.04,
                )),
            )
          }
        >
          ◆×
        </button>
        <span className="toolbar-separator" />
        <button
          className="top-icon tip"
          data-tip="Download project JSON"
          aria-label="Save Project"
          onClick={save}
        >
          ⇩
        </button>
        <label
          className="button top-icon tip"
          data-tip="Load project JSON"
          aria-label="Load Project"
        >
          ⇧
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
          />
        </label>
        <button
          className="top-icon tip"
          data-tip="Export video"
          aria-label="Export Video"
          onClick={exportVideo}
        >
          🎬
        </button>
        <button
          className="top-icon tip"
          data-tip="Open demo project"
          aria-label="Open Demo"
          onClick={() => replaceProject(demoProject())}
        >
          ◉
        </button>
        <button
          className="top-icon tip"
          data-tip="Open guide"
          aria-label="Guide"
          onClick={() => setHelp(true)}
        >
          ?
        </button>
      </header>
      {p.director&&<nav className="master-sequence" aria-label="Master sequence"><b>MASTER</b>{p.director.plan.scenes.map((scene,index)=><button key={scene.id} className={p.director?.activeSceneId===scene.id?"active":""} onClick={()=>activateDirectorScene(scene.id)}><span>{index+1}. {scene.title}</span><small>{scene.duration.toFixed(1)}s</small></button>)}<button onClick={()=>{setTime(0);rt.current=0;setPlaying(true)}}>▶ Scene</button><button onClick={playDirectorSequence}>▶ Sequence</button></nav>}
      <section
        className={`work ${inspectorHidden ? "inspector-hidden" : ""} ${leftDrawer ? "drawer-open" : ""}`}
        style={{ gridTemplateColumns: `56px ${leftDrawer ? `${leftWidth}px 6px` : "0px 0px"} minmax(280px, 1fr) ${inspectorHidden ? "0px 0px" : `6px ${rightWidth}px`}` }}
      >
        <nav className="tool-rail" aria-label="Content browsers">
          <button className={leftDrawer === "scene" ? "active" : ""} data-tip="Scene & Characters" onClick={() => setLeftDrawer((v) => v === "scene" ? null : "scene")}>♙<small>Scene</small></button>
          <button data-tip="Visual Pose Browser" onClick={() => setPoseBrowserOpen(true)}>◫<small>Poses</small></button>
          <button className={leftDrawer === "actions" && actionCategory !== "Dance" ? "active" : ""} data-tip="Action Browser" onClick={() => {setLeftDrawer("actions"); if(actionCategory === "Dance") setActionCategory("Fight");}}>◆<small>Actions</small></button>
          <button className={leftDrawer === "scene" ? "" : ""} data-tip="Prop Browser" onClick={() => setLeftDrawer("scene")}>⬡<small>Props</small></button>
          <button className={leftDrawer === "actions" && actionCategory === "Dance" ? "active" : ""} data-tip="Dance Browser" onClick={() => {setActionCategory("Dance"); setLeftDrawer("actions");}}>♫<small>Dance</small></button>
          <span />
          <button data-tip="Camera Mode" onClick={() => {setTransformMode("camera"); setSelectedProp(null);}}>▣<small>Camera</small></button>
          <button data-tip="Video Motion Capture" onClick={() => setMotionCaptureOpen(true)}>◉<small>Motion</small></button>
        </nav>
        <aside className="library-drawer">
          <div className="drawer-heading"><div><small>LIBRARY</small><b>{leftDrawer === "scene" ? "Scene" : "Actions"}</b></div><button onClick={() => setLeftDrawer(null)} title="Close Library">×</button></div>
          <div className={leftDrawer === "scene" ? "drawer-section active" : "drawer-section"}>
          <h3 className="actions-title">Scene</h3>
          <details open className="scene-outliner">
            <summary>Characters ({p.characters.length})</summary>
            <button className="add-entity" onClick={() => addActor()}>
              ＋ Add Character
            </button>
            {p.characters.map((actor) => (
              <div
                className={`entity-row ${sel === actor.id && !selectedProp ? "selected" : ""}`}
                key={actor.id}
              >
                <button
                  className="entity-main"
                  onClick={() => {
                    setSel(actor.id);
                    setSelectedActors([actor.id]);
                    setSelectedProp(null);
                  }}
                  onDoubleClick={() => {
                    const name = prompt("Rename character", actor.name)?.trim();
                    if (name)
                      update((n) => {
                        n.characters.find((c) => c.id === actor.id)!.name =
                          name;
                      });
                  }}
                >
                  👤 {actor.name}
                </button>
                <button
                  title="Show / hide"
                  onClick={() =>
                    update((n) => {
                      const a = n.characters.find((c) => c.id === actor.id)!;
                      a.visible = !a.visible;
                    })
                  }
                >
                  {actor.visible ? "●" : "○"}
                </button>
                <button
                  title="Lock"
                  onClick={() =>
                    update((n) => {
                      const a = n.characters.find((c) => c.id === actor.id)!;
                      a.locked = !a.locked;
                    })
                  }
                >
                  {actor.locked ? "🔒" : "◇"}
                </button>
              </div>
            ))}
          </details>
          <details open className="scene-outliner">
            <summary>Props ({p.props?.length ?? 0})</summary>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value)
                  addProp(e.target.value as import("./types").PropType);
              }}
            >
              <option value="">＋ Add Prop…</option>
              {[
                "chair",
                "table",
                "cup",
                "phone",
                "book",
                "flower",
                "gift",
                "sword",
                "staff",
                "shield",
                "ball",
                "rectangle",
                "circle",
              ].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <label className="custom-prop-file">
              ＋ Custom Image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const id = `prop_${uid().slice(-8)}`;
                    update((n) => {
                      n.props ??= [];
                      n.propTracks ??= {};
                      n.props.push({
                        id,
                        name: file.name,
                        type: "image",
                        image: String(reader.result),
                        color: "#fff",
                        visible: true,
                        locked: false,
                        layer: 5,
                      });
                      n.propTracks[id] = [
                        {
                          id: uid(),
                          time,
                          x: n.format.width / 2,
                          y: n.format.height / 2,
                          rotation: 0,
                          scaleX: 1,
                          scaleY: 1,
                          flipH: false,
                          opacity: 1,
                          attachment: null,
                          easing: "ease-in-out",
                        },
                      ];
                    });
                    setSelectedProp(id);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {(p.props ?? []).map((prop) => (
              <div
                className={`entity-row ${selectedProp === prop.id ? "selected" : ""}`}
                key={prop.id}
              >
                <button
                  className="entity-main"
                  onClick={() => {
                    setSelectedProp(prop.id);
                    setSelectedActors([]);
                  }}
                  onDoubleClick={() => {
                    const name = prompt("Rename prop", prop.name)?.trim();
                    if (name)
                      update((n) => {
                        n.props!.find((x) => x.id === prop.id)!.name = name;
                      });
                  }}
                >
                  ◆ {prop.name}
                </button>
                <button
                  onClick={() =>
                    update((n) => {
                      const x = n.props!.find((x) => x.id === prop.id)!;
                      x.visible = !x.visible;
                    })
                  }
                >
                  {prop.visible ? "●" : "○"}
                </button>
              </div>
            ))}
          </details>
          </div>
          <div className={leftDrawer === "actions" ? "drawer-section active" : "drawer-section"}>
          <h3 className="actions-title">Actions</h3>
          <input
            className="action-search"
            placeholder="Search actions…"
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
          />
          <div className="action-categories">
            {[
              "Favorites",
              "Recent",
              "Fight",
              "Lifestyle",
              "Movement",
              "Social",
              "Romance",
              "Family",
              "Dance",
              "Sword / Melee",
              "Cinematic Action",
              "Reactions",
              "Prop Interaction",
            ].map((cat) => (
              <button
                key={cat}
                className={actionCategory === cat ? "on" : ""}
                onClick={() => setActionCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {actionCategory === "Dance" && (
            <div className="dance-panel">
              <div className="dance-style-cards">
                {Object.keys(danceStyles).map((style) => (
                  <button
                    key={style}
                    className={danceStyle === style ? "on" : ""}
                    onClick={() => setDanceStyle(style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <div className="dance-settings">
                <label>
                  BPM{" "}
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={p.dance?.bpm ?? 120}
                    onChange={(e) =>
                      update((n) => {
                        n.dance ??= {
                          bpm: 120,
                          beatGrid: false,
                          snapToBeat: false,
                        };
                        n.dance.bpm = Math.max(
                          40,
                          Math.min(240, +e.target.value),
                        );
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={p.dance?.beatGrid ?? false}
                    onChange={(e) =>
                      update((n) => {
                        n.dance ??= {
                          bpm: 120,
                          beatGrid: false,
                          snapToBeat: false,
                        };
                        n.dance.beatGrid = e.target.checked;
                      })
                    }
                  />{" "}
                  Beat Grid
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={p.dance?.snapToBeat ?? false}
                    onChange={(e) =>
                      update((n) => {
                        n.dance ??= {
                          bpm: 120,
                          beatGrid: false,
                          snapToBeat: false,
                        };
                        n.dance.snapToBeat = e.target.checked;
                      })
                    }
                  />{" "}
                  Snap
                </label>
              </div>
              <button
                className="dance-pose-button"
                onClick={() => {
                  setDancePoseMode(true);
                  setPoseBrowserOpen(true);
                }}
              >
                ▦ {danceStyle} Pose Browser
              </button>
              <div className="dance-combination">
                <b>Combination ({danceCombination.length})</b>
                <div>
                  {danceCombination.map((name, i) => (
                    <span>
                      {i + 1}. {name}
                      <button
                        onClick={() =>
                          setDanceCombination((old) =>
                            old.filter((_, x) => x !== i),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <label>
                  Loops{" "}
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={danceLoops}
                    onChange={(e) => setDanceLoops(+e.target.value)}
                  />
                </label>
                <label>
                  Wave offset{" "}
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step=".05"
                    value={groupOffset}
                    onChange={(e) => setGroupOffset(+e.target.value)}
                  />
                  s
                </label>
                <button
                  disabled={!danceCombination.length}
                  onClick={() =>
                    insertDanceSequence(
                      Array.from(
                        { length: danceLoops },
                        () => danceCombination,
                      ).flat(),
                    )
                  }
                >
                  Create Combination
                </button>
                <button
                  disabled={!danceCombination.length}
                  onClick={() =>
                    insertDanceSequence(
                      Array.from(
                        { length: danceLoops },
                        () => danceCombination,
                      ).flat(),
                      selectedActors.length > 1
                        ? selectedActors
                        : p.characters.map((a) => a.id),
                      groupOffset,
                    )
                  }
                >
                  Synchronize Group
                </button>
                <div className="freestyle-options">
                  <label>
                    Duration{" "}
                    <input
                      type="number"
                      min="2"
                      max="120"
                      value={freestyleDuration}
                      onChange={(e) => setFreestyleDuration(+e.target.value)}
                    />
                  </label>
                  <label>
                    Intensity{" "}
                    <select
                      value={freestyleIntensity}
                      onChange={(e) => setFreestyleIntensity(e.target.value)}
                    >
                      {["Low", "Medium", "High", "Acrobatic"].map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button onClick={generateFreestyle}>Generate Freestyle</button>
              </div>
              <label>
                Formation{" "}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) applyFormation(e.target.value);
                  }}
                >
                  <option value="">Choose…</option>
                  {["Line", "V", "Circle", "Two Rows", "Staggered"].map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </label>
              <details>
                <summary>Dance Camera</summary>
                <div className="grid">
                  {[
                    { n: "Full Body", z: 0.82 },
                    { n: "Centered", z: 0.9 },
                    { n: "Follow Dancer", z: 1.05 },
                    { n: "Partner Wide", z: 0.72 },
                    { n: "Group Wide", z: 0.6 },
                    { n: "Push In", z: 1.2 },
                  ].map((cam) => (
                    <button
                      key={cam.n}
                      onClick={() =>
                        update((n) => {
                          const roots = n.characters.map(
                              (a) => poseAt(n.tracks[a.id], time).root,
                            ),
                            chosen =
                              cam.n === "Follow Dancer"
                                ? [poseAt(n.tracks[sel], time).root]
                                : roots,
                            x =
                              chosen.reduce((s, r) => s + r.x, 0) /
                              Math.max(1, chosen.length),
                            y =
                              chosen.reduce((s, r) => s + r.y, 0) /
                                Math.max(1, chosen.length) -
                              100;
                          n.camera.push({
                            id: uid(),
                            time,
                            x,
                            y,
                            zoom: cam.z,
                            rotation: 0,
                            easing:
                              cam.n === "Push In" ? "ease-in-out" : "ease-out",
                          });
                        })
                      }
                    >
                      {cam.n}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
          <div className="character-tools">
            <button
              className="tip"
              data-tip="Add Character"
              aria-label="Add Character"
              onClick={() => addActor()}
            >
              <span>＋👤</span><small>Add</small>
            </button>
            <button
              className="tip"
              data-tip="Duplicate selected character"
              aria-label="Duplicate Character"
              onClick={duplicateFighter}
            >
              <span>⧉</span><small>Duplicate</small>
            </button>
            <button
              className="tip"
              data-tip="Remove selected fighter"
              aria-label="Remove selected fighter"
              onClick={() =>
                update((n) => {
                  n.characters = n.characters.filter((c) => c.id !== sel);
                  delete n.tracks[sel];
                  setSel(n.characters[0]?.id ?? "");
                })
              }
            >
              <span>⌫</span><small>Remove</small>
            </button>
            <button
              className="tip"
              data-tip="Clear animation; keep fighters"
              aria-label="Clear animation"
              onClick={() =>
                update((n) => {
                  n.tracks = Object.fromEntries(
                    n.characters.map((actor) => {
                      const tf=transformAt(n.tracks[actor.id],time);
                      return [actor.id,[{
                        id:uid(),
                        time:0,
                        pose:poseAt(n.tracks[actor.id],time),
                        easing:"ease-in-out",
                        ...tf,
                      }]];
                    }),
                  );
                  n.camera = [
                    {
                      id: uid(),
                      time: 0,
                      x: (n.format?.width ?? 1080) / 2,
                      y: (n.format?.height ?? 1920) / 2,
                      zoom: 1,
                      rotation: 0,
                      easing: "linear",
                    },
                  ];
                  n.speed = [{ id: uid(), time: 0, speed: 100 }];
                  n.effects = [];
                })
              }
            >
              <span>◇</span><small>Clear</small>
            </button>
          </div>
          <div className="action-grid">
            {actions
              .filter((a) => {
                const q = actionSearch.toLowerCase();
                if (q)
                  return (
                    a.name.toLowerCase().includes(q) ||
                    a.categories?.some((c) => c.toLowerCase().includes(q))
                  );
                if (actionCategory === "Favorites")
                  return favorites.includes(a.name);
                if (actionCategory === "Recent") return recent.includes(a.name);
                return (
                  a.categories?.includes(actionCategory) &&
                  (actionCategory !== "Dance" || a.style === danceStyle)
                );
              })
              .map((a) => (
                <div className="action-item" key={a.name}>
                  <button
                    className="action-icon tip"
                    data-tip={`${a.name} · ${a.beats ? `${a.beats} beats` : `${a.duration}s`}${a.intensity ? ` · ${a.intensity}` : ""}${a.loopable ? " · Loop" : ""}`}
                    aria-label={a.name}
                    onClick={() => requestAction(a.name)}
                  >
                    <span>{actionGlyph[a.name] ?? "◆"}</span>
                    <small>{a.name}</small>
                  </button>
                  {a.categories?.includes("Dance") && (
                    <button
                      className="queue"
                      title="Add to combination"
                      onClick={() =>
                        setDanceCombination((old) => [...old, a.name])
                      }
                    >
                      ＋
                    </button>
                  )}
                  <button
                    className={favorites.includes(a.name) ? "star on" : "star"}
                    onClick={() =>
                      setFavorites((old) =>
                        old.includes(a.name)
                          ? old.filter((x) => x !== a.name)
                          : [...old, a.name],
                      )
                    }
                  >
                    ★
                  </button>
                </div>
              ))}
          </div>
          <details className="special-library">
            <summary>★ SPECIAL</summary>
            <div>
              {specialMoves.map((move) => (
                <button
                  className="special-button tip"
                  data-tip={`${move.name} · ${move.duration}s · ${move.description}`}
                  aria-label={move.name}
                  key={move.id}
                  onClick={() => insertSpecial(move.id)}
                >
                  ★<small>{move.name}</small>
                </button>
              ))}
            </div>
          </details>
          </div>
        </aside>
        <div
          className="panel-resizer left"
          title="Drag to resize Library"
          onPointerDown={(event) => {
            const startX = event.clientX, startWidth = leftWidth;
            const move = (e: PointerEvent) => setLeftWidth(Math.max(300, Math.min(720, startWidth + e.clientX - startX)));
            const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
            addEventListener("pointermove", move); addEventListener("pointerup", up);
          }}
        />
        <div className="stage">
          {inspectorHidden && (
            <button className="restore-inspector" onClick={() => setInspectorHidden(false)} title="Show Inspector">◀ Inspector</button>
          )}
          {masterPreview?<MasterPreviewCanvas project={masterPreview.project} time={masterPreview.time} format={masterPreview.format}/>:<CanvasView
            project={p}
            time={time}
            selected={sel}
            selectedProp={selectedProp}
            mode={transformMode}
            groundLock={groundLock}
            onSelect={(id, additive) => {
              setSel(id);
              setSelectedProp(null);
              setSelectedActors((old) =>
                additive
                  ? old.includes(id)
                    ? old.filter((x) => x !== id)
                    : [...old, id]
                  : [id],
              );
            }}
            onSelectProp={setSelectedProp}
            onPoseChange={livePoseChange}
            onTransformChange={liveTransformChange}
            onPropTransformChange={livePropTransform}
            onGestureStart={beginCanvasGesture}
            onGestureEnd={endCanvasGesture}
            onCameraChange={liveCameraChange}
            onContextMenu={(x, y) => setContextMenu({ x, y })}
            preview={posePreview}
            previewCamera={cameraPreview}
            safeArea={cameraSafeArea}
            reviewJoints={p.motionReviews?.find(issue=>issue.id===activeMotionIssue)?.joints}
          />}
          <div
            className="transform-toolbar"
            aria-label="Character transform tools"
          >
            <button
              className={transformMode === "move" ? "active" : ""}
              onClick={() => setTransformMode("move")}
              title="Select / Move (V)"
            >
              ✥ Move
            </button>
            <button
              className={transformMode === "rotate" ? "active" : ""}
              onClick={() => setTransformMode("rotate")}
              title="Rotate (R); hold Shift for 15° snap"
            >
              ↻ Rotate
            </button>
            <button
              className={transformMode === "scale" ? "active" : ""}
              onClick={() => setTransformMode("scale")}
              title="Uniform Scale (S)"
            >
              ⤢ Scale
            </button>
            <button onClick={flipHorizontal} title="Flip Horizontal (H)">
              ⇆ Flip
            </button>
            <button
              className={transformMode === "pose" ? "active" : ""}
              onClick={() => setTransformMode("pose")}
              title="Edit individual joints"
            >
              Pose Edit
            </button>
            <button
              className={transformMode === "camera" ? "active" : ""}
              onClick={() => setTransformMode("camera")}
              title="Camera Mode (C)"
            >
              ▣ Camera
            </button>
            <button
              className={cameraPreview ? "active" : ""}
              onClick={() => setCameraPreview((value) => !value)}
              title="Preview final camera output"
            >
              ◉ Preview
            </button>
          </div>
          <div className="time">
            {time.toFixed(2)}s · {Math.round(time * p.fps)}f
          </div>
          {canvasEditing && (
            <div className="transform-feedback">
              {transformMode === "rotate"
                ? `Angle: ${Math.round(transformAt(p.tracks[sel], time).rotation)}°`
                : transformMode === "camera"
                  ? `Camera: ${Math.round(cameraAt(p.camera, time).rotation)}° · Zoom ${Math.round(cameraAt(p.camera, time).zoom * 100)}%`
                : transformMode === "scale"
                  ? `Scale: ${Math.round(transformAt(p.tracks[sel], time).scaleX * 100)}%`
                  : `X: ${Math.round(current.root.x)}  Y: ${Math.round(current.root.y)}`}
            </div>
          )}
          {contextMenu && createPortal((
            <div
              className="fighter-context"
              style={{
                left: Math.max(8, Math.min(contextMenu.x + 6, window.innerWidth - 190)),
                top: Math.max(8, Math.min(contextMenu.y + 6, window.innerHeight - (selectedProp ? 185 : 390))),
              }}
              onMouseLeave={() => setContextMenu(null)}
            >
              <div className="context-title">{selectedProp ? p.props?.find((item)=>item.id===selectedProp)?.name ?? "Prop" : p.characters.find((item)=>item.id===sel)?.name ?? "Character"}</div>
              {selectedProp ? <>
                <button onClick={()=>{duplicateProp(selectedProp);setContextMenu(null)}}>⧉ Duplicate Prop</button>
                <button onClick={()=>{updatePropTransform(selectedProp,{rotation:0,scaleX:1,scaleY:1,flipH:false});setContextMenu(null)}}>↺ Reset Transform</button>
                <div className="context-divider" />
                <button className="danger" onClick={()=>{deleteSelectedEntity();setContextMenu(null)}}>⌫ Delete Prop</button>
              </> : <>
              <button
                onClick={() => {
                  setClip(clonePose(current));
                  setContextMenu(null);
                }}
              >
                Copy Pose
              </button>
              <button
                disabled={!clip}
                onClick={() => {
                  if (clip) changePose(clip);
                  setContextMenu(null);
                }}
              >
                Paste Pose
              </button>
              <button
                onClick={() => {
                  changePose(mirrored(current));
                  setContextMenu(null);
                }}
              >
                Mirror Pose
              </button>
              <button
                onClick={() => {
                  flipHorizontal();
                  setContextMenu(null);
                }}
              >
                Flip Character
              </button>
              <button
                onClick={() => {
                  duplicateFighter();
                  setContextMenu(null);
                }}
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  setTransform({
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipV: false,
                  });
                  setContextMenu(null);
                }}
              >
                Reset Transform
              </button>
              <button
                onClick={() => {
                  addKey(current);
                  setContextMenu(null);
                }}
              >
                Add Keyframe
              </button>
              <div className="context-divider" />
              <button className="danger" onClick={()=>{deleteSelectedEntity();setContextMenu(null)}}>⌫ Delete Character</button>
              </>}
            </div>
          ), document.body)}
        </div>
        <div
          className="panel-resizer right"
          title="Drag to resize Inspector"
          onPointerDown={(event) => {
            const startX = event.clientX, startWidth = rightWidth;
            const move = (e: PointerEvent) => setRightWidth(Math.max(240, Math.min(450, startWidth + startX - e.clientX)));
            const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
            addEventListener("pointermove", move); addEventListener("pointerup", up);
          }}
        />
        <aside className={`props inspector-${selectedProp ? "prop" : transformMode === "camera" ? "camera" : "character"}`}>
          <button className="hide-inspector" onClick={() => setInspectorHidden(true)} title="Hide Inspector">×</button>
          <div className="inspector-heading"><small>INSPECTOR</small><b>{selectedProp ? "Prop" : transformMode === "camera" ? "Camera" : p.characters.find((c) => c.id === sel)?.name ?? "Scene"}</b></div>
          {selectedProp &&
            (() => {
              const prop = p.props?.find((x) => x.id === selectedProp),
                tf = propTransformAt(p.propTracks?.[selectedProp], time);
              if (!prop) return null;
              return (
                <details open>
                  <summary>{prop.name} · Prop</summary>
                  <div className="grid">
                    <label>
                      X
                      <input
                        type="number"
                        value={Math.round(tf.x)}
                        onChange={(e) =>
                          updatePropTransform(prop.id, { x: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Y
                      <input
                        type="number"
                        value={Math.round(tf.y)}
                        onChange={(e) =>
                          updatePropTransform(prop.id, { y: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Rotation
                      <input
                        type="number"
                        value={Math.round(tf.rotation)}
                        onChange={(e) =>
                          updatePropTransform(prop.id, {
                            rotation: +e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Scale %
                      <input
                        type="number"
                        value={Math.round(tf.scaleX * 100)}
                        onChange={(e) => {
                          const s = +e.target.value / 100;
                          updatePropTransform(prop.id, {
                            scaleX: s,
                            scaleY: s,
                          });
                        }}
                      />
                    </label>
                  </div>
                  <label>
                    Attach to Actor
                    <select
                      value={tf.attachment?.actorId ?? ""}
                      onChange={(e) =>
                        updatePropTransform(prop.id, {
                          attachment: e.target.value
                            ? {
                                actorId: e.target.value,
                                joint: "rightWrist",
                                offsetX: 0,
                                offsetY: 0,
                                rotation: 0,
                              }
                            : null,
                        })
                      }
                    >
                      <option value="">None</option>
                      {p.characters.map((a) => (
                        <option value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </label>
                  {tf.attachment && (
                    <>
                      <label>
                        Joint
                        <select
                          value={tf.attachment.joint}
                          onChange={(e) =>
                            updatePropTransform(prop.id, {
                              attachment: {
                                ...tf.attachment!,
                                joint: e.target
                                  .value as import("./types").JointName,
                              },
                            })
                          }
                        >
                          {[
                            "rightWrist",
                            "leftWrist",
                            "head",
                            "root",
                            "rightAnkle",
                            "leftAnkle",
                          ].map((j) => (
                            <option value={j}>{j}</option>
                          ))}
                        </select>
                      </label>
                      <div className="grid">
                        <label>
                          Offset X
                          <input
                            type="number"
                            value={tf.attachment.offsetX}
                            onChange={(e) =>
                              updatePropTransform(prop.id, {
                                attachment: {
                                  ...tf.attachment!,
                                  offsetX: +e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                        <label>
                          Offset Y
                          <input
                            type="number"
                            value={tf.attachment.offsetY}
                            onChange={(e) =>
                              updatePropTransform(prop.id, {
                                attachment: {
                                  ...tf.attachment!,
                                  offsetY: +e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                        <label>
                          Attach rotation
                          <input
                            type="number"
                            value={tf.attachment.rotation}
                            onChange={(e) =>
                              updatePropTransform(prop.id, {
                                attachment: {
                                  ...tf.attachment!,
                                  rotation: +e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}
                  <label>
                    Opacity{" "}
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={tf.opacity}
                      onChange={(e) =>
                        updatePropTransform(prop.id, {
                          opacity: +e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="grid">
                    <button
                      onClick={() =>
                        updatePropTransform(prop.id, { flipH: !tf.flipH })
                      }
                    >
                      ⇆ Flip
                    </button>
                    <button
                      onClick={() =>
                        update((n) => {
                          const source = n.props!.find(
                            (x) => x.id === prop.id,
                          )!;
                          const id = `prop_${uid().slice(-8)}`;
                          n.props!.push({
                            ...source,
                            id,
                            name: source.name + " Copy",
                          });
                          n.propTracks![id] = (
                            n.propTracks![prop.id] ?? []
                          ).map((k) => ({
                            ...k,
                            id: uid(),
                            x: k.x + 40,
                            y: k.y + 40,
                          }));
                          setSelectedProp(id);
                        })
                      }
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() =>
                        update((n) => {
                          n.props = n.props!.filter((x) => x.id !== prop.id);
                          delete n.propTracks![prop.id];
                          setSelectedProp(null);
                        })
                      }
                    >
                      Delete
                    </button>
                    <button
                      onClick={() =>
                        update((n) => {
                          n.props!.find((x) => x.id === prop.id)!.layer++;
                        })
                      }
                    >
                      Bring Forward
                    </button>
                    <button
                      onClick={() =>
                        update((n) => {
                          n.props!.find((x) => x.id === prop.id)!.layer--;
                        })
                      }
                    >
                      Send Backward
                    </button>
                  </div>
                </details>
              );
            })()}
          <details open className="character-details">
            <summary>
              {p.characters.find((c) => c.id === sel)?.name ||
                `Fighter ${sel.toUpperCase()}`}
            </summary>
            <div className="format-readout">
              Canvas: {p.format?.label ?? "9:16"} · {p.format?.width ?? 1080}×
              {p.format?.height ?? 1920}
            </div>
            <label>
              Easing
              <select
                value={ease}
                onChange={(e) => setEase(e.target.value as Ease)}
              >
                {[
                  "linear",
                  "ease-in",
                  "ease-out",
                  "ease-in-out",
                  "snap",
                  "hold",
                ].map((x) => (
                  <option>{x}</option>
                ))}
              </select>
            </label>
            <label>
              FPS
              <select
                value={p.fps}
                onChange={(e) => update((n) => (n.fps = +e.target.value))}
              >
                {[6, 12, 24, 30, 60].map((x) => (
                  <option>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Duration
              <input
                className="duration-input"
                type="number"
                min="1"
                max="300"
                step="1"
                value={p.duration}
                onChange={(e) =>
                  update(
                    (n) =>
                      (n.duration = Math.max(
                        1,
                        Math.min(300, +e.target.value || 1),
                      )),
                  )
                }
              />
            </label>
            <label>
              Trails
              <select
                value={p.trail}
                onChange={(e) =>
                  update((n) => (n.trail = +e.target.value as any))
                }
              >
                <option value="0">Off</option>
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
              </select>
            </label>
          </details>
          <details open className="character-details">
            <summary>Character Transform</summary>
            <div className="transform-values">
              <label>
                Rotation °
                <input
                  aria-label="Character rotation degrees"
                  type="number"
                  step="15"
                  value={Math.round(transformAt(p.tracks[sel], time).rotation)}
                  onChange={(e) =>
                    setTransform({ rotation: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Scale %
                <input
                  aria-label="Character scale percent"
                  type="number"
                  min="10"
                  max="500"
                  value={Math.round(
                    transformAt(p.tracks[sel], time).scaleX * 100,
                  )}
                  onChange={(e) => {
                    const scale = Math.max(0.1, Number(e.target.value) / 100);
                    setTransform({ scaleX: scale, scaleY: scale });
                  }}
                />
              </label>
            </div>
            <div className="grid">
              <button onClick={flipHorizontal}>⇆ Flip H</button>
              <button
                onClick={() =>
                  setTransform({
                    flipV: !transformAt(p.tracks[sel], time).flipV,
                  })
                }
              >
                ⇅ Flip V
              </button>
              <button
                onClick={() =>
                  setTransform({
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipV: false,
                  })
                }
              >
                Reset Transform
              </button>
              <button
                onClick={() =>
                  setTransform({
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    flipH: false,
                    flipV: false,
                  })
                }
              >
                Reset All
              </button>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={groundLock}
                onChange={(e) => setGroundLock(e.target.checked)}
              />{" "}
              Ground Lock
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoFace}
                onChange={(e) => {
                  const enabled=e.target.checked;
                  setAutoFace(enabled);
                  if(enabled) update((n) => faceAllOpponentsIn(n));
                }}
              />{" "}
              Auto Face Opponent
            </label>
            <div className="grid">
              <button
                onClick={() =>
                  update((n) => {
                    const po = poseAt(n.tracks[sel], time),
                      dx = n.format.width / 2 - po.root.x;
                    const next = clonePose(po);
                    Object.values(next).forEach((j) => (j.x += dx));
                    mutateCurrentKey(n, sel, next);
                  })
                }
              >
                Center
              </button>
              <button onClick={() => update((n) => faceOpponentIn(n, sel))}>
                Face Opponent
              </button>
              <button onClick={swapSelectedWithOpponent}>
                Swap Sides
              </button>
              <button onClick={() => addKey(current)}>Add Keyframe</button>
            </div>
          </details>
          <details className="character-details">
            <summary>Pose</summary>
            <button
              className="open-pose-browser"
              onClick={() => {
                setDancePoseMode(false);
                setPoseBrowserOpen(true);
              }}
            >
              ▦ Open Visual Pose Browser
            </button>
            <select onChange={(e) => applyBuiltInPose(e.target.value)}>
              <option>Load built-in…</option>
              {Object.keys(poses).map((x) => (
                <option>{x}</option>
              ))}
            </select>
            <div className="grid">
              <button onClick={() => setClip(clonePose(current))}>Copy</button>
              <button onClick={() => clip && changePose(clip)}>Paste</button>
              <button onClick={() => changePose(mirrored(current))}>
                Mirror
              </button>
              <button onClick={() => addKey(current)}>Duplicate</button>
            </div>
            <button
              onClick={() => {
                const name = prompt("Pose name");
                if (name) update((n) => (n.savedPoses[name] = current));
              }}
            >
              Save Pose
            </button>
          </details>
          <details open={transformMode === "camera"} className="camera-details">
            <summary>Camera</summary>
            <button
              className={transformMode === "camera" ? "active" : ""}
              onClick={() => setTransformMode("camera")}
            >
              ▣ Camera Mode (C)
            </button>
            {transformMode === "camera" && <div className="camera-mode-help"><b>Camera editing is active</b><span>Drag inside frame: Pan</span><span>Drag a corner: Zoom</span><span>Drag top circle: Rotate</span></div>}
            <div className="grid">
              <button onClick={() => frameActors()}>Frame Selection (F)</button>
              <button onClick={() => setCameraPreview((v) => !v)}>
                {cameraPreview ? "Exit Preview" : "Preview Camera"}
              </button>
              <button onClick={() => frameActors([sel], "wide")}>Wide Shot</button>
              <button onClick={() => frameActors([sel], "full")}>Full Shot</button>
              <button onClick={() => frameActors([sel], "medium")}>Medium</button>
              <button onClick={() => frameActors([sel], "close")}>Close-Up</button>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={cameraSafeArea} onChange={(e) => setCameraSafeArea(e.target.checked)} /> Safe Area
            </label>
            <label className="inspector-field">
              <span>Rotation °</span>
              <input
                type="number"
                value={Math.round(cameraAt(p.camera, time).rotation * 100) / 100}
                onChange={(e) => update((n) => mutateCameraAtPlayhead(n, { ...cameraAt(n.camera, time), rotation: +e.target.value }))}
              />
            </label>
            <div className="camera-presets">
              {[ ["Level",0], ["Dutch L",-10], ["Dutch R",10], ["Strong L",-20], ["Strong R",20] ].map(([label, rotation]) => (
                <button key={String(label)} onClick={() => update((n) => mutateCameraAtPlayhead(n, { ...cameraAt(n.camera, time), rotation: Number(rotation) }))}>
                  {label} {Number(rotation) > 0 ? "+" : ""}{rotation}°
                </button>
              ))}
            </div>
            <div className="grid">
              <button
                onClick={() =>
                  update((n) =>
                    n.camera.push({
                      id: uid(),
                      time,
                      x: current.root.x,
                      y: current.root.y - 100,
                      zoom: 1,
                      rotation: 0,
                      easing: ease,
                    }),
                  )
                }
              >
                Follow {sel.toUpperCase()}
              </button>
              <button
                onClick={() =>
                  update((n) => {
                    const format=n.format??{width:1080,height:1920};
                    mutateCameraAtPlayhead(n,{
                      x:format.width/2,
                      y:format.height/2,
                      zoom:1,
                      rotation:0,
                    });
                  })
                }
                title="Create or update a default Camera keyframe at the current playhead"
              >
                ↺ Reset Camera Here
              </button>
              <button
                onClick={() =>
                  update((n) => {
                    n.camera.push(
                      {
                        id: uid(),
                        time,
                        x: (n.format?.width ?? 1080) / 2,
                        y: (n.format?.height ?? 1920) / 2 - 50,
                        zoom: 1.15,
                        rotation: 0,
                        easing: "snap",
                      },
                      {
                        id: uid(),
                        time: time + 0.25,
                        x: (n.format?.width ?? 1080) / 2,
                        y: (n.format?.height ?? 1920) / 2,
                        zoom: 0.8,
                        rotation: 0,
                        easing: "ease-out",
                      },
                    );
                  })
                }
              >
                Impact Zoom
              </button>
            </div>
          </details>
          <details>
            <summary>Effects</summary>
            <select
              defaultValue=""
              onChange={(e) => {
                const type = e.target.value;
                if (!type) return;
                update((n) =>
                  n.effects.push({
                    id: uid(),
                    time,
                    duration: type === "shake" ? 0.18 : 0.35,
                    type: type as EffectType,
                    x: current.head.x,
                    y: current.head.y,
                    strength: 16,
                  }),
                );
                e.currentTarget.value = "";
              }}
            >
              <option value="">Add effect…</option>
              {["flash", "shockwave", "lines", "dust", "shake"].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <button
              className="remove-near-effect"
              onClick={() =>
                update((n) => {
                  n.effects = n.effects.filter(
                    (effect) => Math.abs(effect.time - time) > 0.12,
                  );
                })
              }
            >
              Remove Effect at Playhead
            </button>
            <div className="effect-list">
              {[...p.effects]
                .sort((a, b) => a.time - b.time)
                .map((effect) => (
                  <div
                    className={
                      Math.abs(effect.time - time) < 0.12 ? "near" : ""
                    }
                    key={effect.id}
                  >
                    <button
                      className="effect-jump"
                      onClick={() => seek(effect.time)}
                      title="Go to effect time"
                    >
                      <span>{effect.type}</span>
                      <small>{effect.time.toFixed(2)}s</small>
                    </button>
                    <button
                      className="effect-delete"
                      title="Delete this effect"
                      onClick={() =>
                        update((n) => {
                          n.effects = n.effects.filter(
                            (item) => item.id !== effect.id,
                          );
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              {!p.effects.length && (
                <small className="empty-effects">No effects</small>
              )}
            </div>
          </details>
          <details>
            <summary>Speed</summary>
            <label>
              <input
                type="range"
                min="10"
                max="400"
                defaultValue="100"
                onChange={(e) =>
                  update((n) => {
                    const k = n.speed.find(
                      (k) => Math.abs(k.time - time) < 0.03,
                    );
                    if (k) k.speed = +e.target.value;
                    else
                      n.speed.push({ id: uid(), time, speed: +e.target.value });
                  })
                }
              />
              10–400%
            </label>
          </details>
          <details>
            <summary>Background</summary>
            <label>
              Top{" "}
              <input
                type="color"
                value={p.background.top}
                onChange={(e) =>
                  update((n) => (n.background.top = e.target.value))
                }
              />
            </label>
            <label>
              Bottom{" "}
              <input
                type="color"
                value={p.background.bottom}
                onChange={(e) =>
                  update((n) => (n.background.bottom = e.target.value))
                }
              />
            </label>
            <button
              onClick={() =>
                update((n) => (n.background.grid = !n.background.grid))
              }
            >
              Toggle Grid
            </button>
          </details>
        </aside>
      </section>
      <div
        className="timeline-resizer"
        title="Drag to resize Timeline"
        onPointerDown={(event) => {
          const startY = event.clientY, startHeight = timelineHeight;
          const move = (e: PointerEvent) =>
            setTimelineHeight(Math.max(140, Math.min(window.innerHeight - 280, startHeight + startY - e.clientY)));
          const up = () => {
            removeEventListener("pointermove", move);
            removeEventListener("pointerup", up);
          };
          addEventListener("pointermove", move);
          addEventListener("pointerup", up);
        }}
      />
      <Timeline
        p={p}
        time={time}
        setTime={seek}
        selected={sel}
        selectedKeys={timelineSelection}
        onSelectionChange={selectTimelineKeys}
        onMoveKeys={moveTimelineKeys}
        collapsed={timelineCollapsed}
        onToggleCollapsed={() => setTimelineCollapsed((value) => !value)}
        onIssue={(id)=>{const issue=p.motionReviews?.find(x=>x.id===id);if(!issue)return;setActiveMotionIssue(id);setSel(issue.actorId);setSelectedActors([issue.actorId]);setTransformMode("pose");seek(issue.time);}}
      />
      {activeMotionIssue&&(()=>{const issues=(p.motionReviews??[]).filter(issue=>issue.status==="review"),index=issues.findIndex(issue=>issue.id===activeMotionIssue),issue=p.motionReviews?.find(issue=>issue.id===activeMotionIssue);if(!issue)return null;const go=(next:number)=>{const target=issues[(next+issues.length)%issues.length];if(!target)return;setActiveMotionIssue(target.id);setSel(target.actorId);setSelectedActors([target.actorId]);setTransformMode("pose");seek(target.time);};const limb=issue.joints.some(j=>j.includes("left"))?"Left ":issue.joints.some(j=>j.includes("right"))?"Right ":"";const part=issue.joints.some(j=>/Wrist|Elbow|Shoulder/.test(j))?"Arm":issue.joints.some(j=>/Ankle|Knee|Hip/.test(j))?"Leg":issue.joints.join(", ");return <div className="motion-review-bar"><button onClick={()=>go(index-1)}>‹ Previous Issue</button><div><b>{(issue.sourceTime??issue.time).toFixed(2)}s · {limb}{part}</b><span>{issue.status==="review"?"Manual Review Required":"Reconstructed"}</span><small>Issue {Math.max(1,index+1)} of {issues.length}</small></div><button onClick={()=>{update(n=>{const found=n.motionReviews?.find(x=>x.id===issue.id);if(found)found.status="resolved";});setActiveMotionIssue(null);}}>Mark Resolved</button><button onClick={()=>go(index+1)}>Next Issue ›</button><button onClick={()=>setActiveMotionIssue(null)}>×</button></div>;})()}
      {newProjectOpen && (
        <div className="help-backdrop" onClick={() => setNewProjectOpen(false)}>
          <article
            className="project-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="help-close"
              onClick={() => setNewProjectOpen(false)}
            >
              ×
            </button>
            <h2>New Project</h2>
            <p>Choose the final canvas and export format.</p>
            <h3>What are you creating?</h3>
            <div className="template-picker">
              {[
                "Blank",
                "Fight",
                "Lifestyle",
                "Romance",
                "Family",
                "Dance",
                "Sword / Melee",
                "Cinematic",
              ].map((x) => (
                <button
                  className={newTemplate === x ? "active" : ""}
                  onClick={() => setNewTemplate(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="format-grid">
              {FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => startNewProject(format)}
                  aria-label={`Create ${format.short} ${format.description} project`}
                >
                  <span className="aspect-preview">
                    <i
                      style={{
                        aspectRatio: `${format.width} / ${format.height}`,
                      }}
                    />
                  </span>
                  <b>{format.short}</b>
                  <span>{format.description}</span>
                  <small>
                    {format.width} × {format.height}
                  </small>
                </button>
              ))}
            </div>
          </article>
        </div>
      )}
      {scenarioOpen && (
        <div className="help-backdrop" onClick={() => setScenarioOpen(false)}>
          <article
            className="project-dialog scenario-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="help-close"
              onClick={() => setScenarioOpen(false)}
            >
              ×
            </button>
            <h2>Scenario V2</h2>
            <p>
              Actors, Props and generic actor/action/participant events.
              Compiles locally and deterministically.
            </p>
            <textarea
              value={scenarioText}
              onChange={(e) => setScenarioText(e.target.value)}
            />
            <button
              className="save-library-main"
              onClick={() => {
                try {
                  replaceProject(
                    compileScenarioV2(JSON.parse(scenarioText), p.format),
                  );
                  setScenarioOpen(false);
                } catch (error) {
                  alert(`Invalid Scenario JSON: ${error}`);
                }
              }}
            >
              Compile Scenario
            </button>
          </article>
        </div>
      )}
      {interactionAction && (
        <div
          className="help-backdrop"
          onClick={() => setInteractionAction(null)}
        >
          <article
            className="project-dialog interaction-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="help-close"
              onClick={() => setInteractionAction(null)}
            >
              ×
            </button>
            <h2>{interactionAction}</h2>
            <p>
              Choose participants. Characters approach into readable spacing
              before the interaction.
            </p>
            {interactionActors.map((id, index) => (
              <label key={index}>
                Actor {index + 1}
                <select
                  value={id}
                  onChange={(e) =>
                    setInteractionActors((old) =>
                      old.map((x, i) => (i === index ? e.target.value : x)),
                    )
                  }
                >
                  {p.characters.map((actor) => (
                    <option value={actor.id}>{actor.name}</option>
                  ))}
                </select>
              </label>
            ))}
            <button
              className="save-library-main"
              disabled={
                new Set(interactionActors).size !== interactionActors.length ||
                interactionActors.some((x) => !x)
              }
              onClick={insertInteraction}
            >
              Insert at {time.toFixed(2)}s
            </button>
          </article>
        </div>
      )}
      {poseBrowserOpen && (
        <PoseBrowser
          fighter={sel}
          actors={p.characters}
          danceOnly={dancePoseMode}
          initialStyle={danceStyle}
          onFighter={setSel}
          onApply={(id) => applyBuiltInPose(id, sel)}
          onAdd={(id) => applyBuiltInPose(id, sel, true)}
          onPreview={(id) =>
            setPosePreview(
              id ? { id: sel, pose: alignedBuiltInPose(id, sel)! } : null,
            )
          }
          onClose={() => {
            setPosePreview(null);
            setPoseBrowserOpen(false);
          }}
        />
      )}
      {managerOpen && (
        <div className="help-backdrop" onClick={() => setManagerOpen(false)}>
          <article
            className="project-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="help-close"
              onClick={() => setManagerOpen(false)}
            >
              ×
            </button>
            <h2>Project Manager</h2>
            <p>Projects are stored locally in this browser.</p>
            <button className="save-library-main" onClick={saveToLibrary}>
              Save current project
            </button>
            <div className="project-list">
              {Object.entries(library).map(([name, project]) => (
                <div key={name}>
                  <button
                    className="project-open"
                    onClick={() => {
                      replaceProject(migrateProject(structuredClone(project)));
                      setManagerOpen(false);
                    }}
                  >
                    <b>{name}</b>
                    <span>
                      {project.format?.label ?? "9:16"} · {project.duration}s ·{" "}
                      {project.characters.length} fighters
                    </span>
                  </button>
                  <button
                    className="project-remove"
                    onClick={() => {
                      if (confirm(`Delete ${name} from local library?`))
                        deleteLibraryProject(name);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {!Object.keys(library).length && (
                <p className="empty-effects">No saved projects yet.</p>
              )}
            </div>
          </article>
        </div>
      )}
      {motionCaptureOpen && (<Suspense fallback={<div className="motion-backdrop"><div className="motion-loading">Loading local motion tools…</div></div>}>
        <MotionCapture
          project={p}
          playhead={time}
          selected={sel}
          easing={ease}
          onClose={() => setMotionCaptureOpen(false)}
          onImport={(actor, keys, issues, conflict, source) => {
            update((n) => {
              n.tracks[actor] ??= [];
              const end = keys.at(-1)?.time ?? time;
              if(conflict==="insert"){const length=Math.max(0,end-time);n.tracks[actor].forEach(k=>{if(k.time>=time-.001)k.time+=length;});n.tracks[actor].push(...keys);}
              else if(conflict==="merge"){for(const key of keys){const at=n.tracks[actor].findIndex(k=>Math.abs(k.time-key.time)<.001);if(at>=0)n.tracks[actor][at]=key;else n.tracks[actor].push(key);}}
              else n.tracks[actor]=[...n.tracks[actor].filter(key=>key.time<time-.001||key.time>end+.001),...keys];
              n.tracks[actor].sort((a,b)=>a.time-b.time);
              n.motionReviews=[...(n.motionReviews??[]).filter(issue=>issue.actorId!==actor||issue.time<time-.001||issue.time>end+.001),...issues];
              n.duration = Math.max(n.duration, end);
            });
            setMotionReviewSource(source);
          }}
        />
      </Suspense>)}
      {autoDirectorOpen&&<Suspense fallback={<div className="director-backdrop"><div className="motion-loading">Loading Auto Director…</div></div>}><AutoDirectorPanel onClose={()=>setAutoDirectorOpen(false)} onBuild={project=>replaceProject(project)}/></Suspense>}
      {fightDirectorOpen&&<Suspense fallback={<div className="fight-backdrop"/>}><FightDirectorPanel project={p} playhead={time} onClose={()=>setFightDirectorOpen(false)} onApply={project=>replaceProject(project)}/></Suspense>}
      {cinematicOpen&&<Suspense fallback={<div className="cinematic-backdrop"/>}><CinematicPanel project={p} time={time} onClose={()=>setCinematicOpen(false)} onApply={project=>replaceProject(project)}/></Suspense>}
      {productionOpen&&<Suspense fallback={<div className="production-backdrop"/>}><ProductionLibraryPanel project={p} time={time} onClose={()=>{setMasterPreview(null);setProductionOpen(false)}} onApply={project=>{setMasterPreview(null);replaceProject(project)}} onPreview={(project,sourceTime,masterTime)=>setMasterPreview({project,time:sourceTime,masterTime,format:p.master?.format??project.format})} onEditClip={editMasterClip}/></Suspense>}
      {combatFxOpen&&<Suspense fallback={<div className="combat-backdrop"/>}><CombatFxPanel project={p} actor={sel} time={time} onClose={()=>setCombatFxOpen(false)} onApply={project=>replaceProject(project)}/></Suspense>}
      {activeMotionIssue&&motionReviewSource&&(()=>{const issue=p.motionReviews?.find(x=>x.id===activeMotionIssue);return issue?<MotionIssueReference source={motionReviewSource} time={issue.sourceTime??issue.time} onClose={()=>setMotionReviewSource(null)}/>:null;})()}
      {help && (
        <div className="help-backdrop" onClick={() => setHelp(false)}>
          <article
            className="help"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <button className="help-close" onClick={() => setHelp(false)}>
              ×
            </button>
            <h2>راهنمای 2D Flip Studio</h2>
            <h3>شروع پروژه از صفر</h3>
            <ol>
              <li>
                <b>New Project</b> را بزن؛ صفحه، کاراکترها و انیمیشن پاک
                می‌شوند.
              </li>
              <li>
                <b>+ Fighter A</b> را بزن. اگر مبارز دوم لازم داری{" "}
                <b>+ Fighter B</b> را هم بزن.
              </li>
              <li>از دکمه‌های A و B کاراکتر فعال را انتخاب کن.</li>
              <li>
                روی Timeline زمان موردنظر را انتخاب کن و مفاصل سفید را بکش.
              </li>
              <li>لوزی زرد مرکز لگن، کل بدن را جابه‌جا می‌کند.</li>
              <li>
                <b>+ Keyframe</b> وضعیت فعلی را ثبت می‌کند.
              </li>
            </ol>
            <h3>ساخت یک سناریوی ساده</h3>
            <ol>
              <li>
                در زمان صفر Pose نوع Fight Stance را انتخاب و Keyframe ثبت کن.
              </li>
              <li>Playhead را مثلاً روی ۱ ثانیه ببر.</li>
              <li>
                از Action Library یک حرکت مثل Dash Forward یا Straight Punch
                بزن؛ کل Keyframeهای آن حرکت اضافه می‌شوند.
              </li>
              <li>برای Fighter B همین مراحل را جداگانه انجام بده.</li>
              <li>
                Keyframeهای لوزی‌شکل Timeline را با ماوس به چپ و راست بکش تا
                زمان‌بندی اصلاح شود.
              </li>
            </ol>
            <h3>پاک‌کردن و برگشت</h3>
            <ul>
              <li>
                <b>Clear Animation:</b> کاراکترها می‌مانند، ولی تمام حرکات،
                افکت‌ها، دوربین و Speed Track پاک می‌شوند.
              </li>
              <li>
                <b>Remove Selected:</b> مبارز انتخاب‌شده را حذف می‌کند.
              </li>
              <li>
                <b>New Project:</b> همه‌چیز را برای شروع سناریوی جدید خالی
                می‌کند.
              </li>
              <li>
                <b>Undo / Redo:</b> تغییر قبلی را برمی‌گرداند یا دوباره اعمال
                می‌کند.
              </li>
            </ul>
            <h3>Timing و حرکت</h3>
            <p>
              Linear یکنواخت است. Ease In آرام شروع می‌شود. Ease Out آرام تمام
              می‌شود. Ease In-Out هر دو را دارد. Snap برای ضربه سریع است. Hold
              حالت را تا Keyframe بعدی ثابت نگه می‌دارد.
            </p>
            <h3>دوربین، اسلوموشن و افکت</h3>
            <p>
              Follow دوربین را روی مبارز می‌برد. Impact Zoom زوم ضربه می‌سازد.
              Speed مقدار ۱۰٪ تا ۴۰۰٪ را روی زمان فعلی ثبت می‌کند. از Effects
              می‌توان Flash، Shockwave، Lines، Dust و Shake اضافه کرد.
            </p>
            <h3>ذخیره و خروجی</h3>
            <p>
              Save Project فایل JSON قابل ویرایش می‌سازد. Load Project همان فایل
              را باز می‌کند. Export Video ویدیوی عمودی 1080×1920 می‌سازد.
            </p>
          </article>
        </div>
      )}
    </main>
  );
}
