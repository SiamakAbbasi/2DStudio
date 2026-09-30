import { drawScene } from "./CanvasView";
import { masterDuration, resolveMaster } from "./masterSequence";
import type { MasterSequence } from "./types";

export async function exportMasterVideo(master: MasterSequence, fps = 24) {
  const first = master.clips[0]?.source;
  if (!first) throw new Error("Master is empty");
  const format = master.format ?? first.format,
    output = document.createElement("canvas"),
    source = document.createElement("canvas");
  output.width = format.width;
  output.height = format.height;
  const ctx = output.getContext("2d")!, sourceCtx = source.getContext("2d")!;
  const stream = output.captureStream(fps),
    mime = ["video/webm;codecs=vp9", "video/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
  if (!mime) throw new Error("WebM recording is unavailable");
  const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 12_000_000,
    }),
    chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Master export failed"));
  });
  recorder.start(250);
  const duration = masterDuration(master);
  for (let frame = 0; frame <= duration * fps; frame++) {
    const resolved = resolveMaster(master, frame / fps);
    if (resolved) {
      const sourceFormat = resolved.project.format;
      if (source.width !== sourceFormat.width) source.width = sourceFormat.width;
      if (source.height !== sourceFormat.height) source.height = sourceFormat.height;
      drawScene(
        sourceCtx,
        resolved.project,
        resolved.sourceTime,
        source.width,
        source.height,
        false,
      );
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, output.width, output.height);
      const scale = Math.min(
          output.width / source.width,
          output.height / source.height,
        ),
        width = source.width * scale,
        height = source.height * scale;
      ctx.drawImage(
        source,
        (output.width - width) / 2,
        (output.height - height) / 2,
        width,
        height,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, 1000 / fps)));
  }
  recorder.stop();
  await done;
  const url = URL.createObjectURL(new Blob(chunks, { type: mime })),
    link = document.createElement("a");
  link.href = url;
  link.download = `${master.name}.webm`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return duration;
}
