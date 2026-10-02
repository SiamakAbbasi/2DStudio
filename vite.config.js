import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
function timelineSequenceBridge() {
    let pending = null;
    let projectState = null;
    const results = new Map();
    const body = (req) => new Promise((resolve, reject) => { let value = ""; req.on("data", (chunk) => value += chunk); req.on("end", () => resolve(value)); req.on("error", reject); });
    return { name: "timeline-sequence-bridge", configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url ?? "";
                try {
                    if (req.method === "POST" && url === "/__codex/timeline-sequence") {
                        const input = JSON.parse(await body(req));
                        if (!input?.requestId || !input?.sequence)
                            throw new Error("requestId and sequence are required");
                        pending = input;
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify({ queued: true }));
                        return;
                    }
                    if (req.method === "GET" && url === "/__codex/timeline-sequence") {
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify(pending));
                        return;
                    }
                    if (req.method === "POST" && url === "/__codex/timeline-sequence/result") {
                        const input = JSON.parse(await body(req));
                        results.set(input.requestId, input);
                        if (pending?.requestId === input.requestId)
                            pending = null;
                        res.end(JSON.stringify({ received: true }));
                        return;
                    }
                    if (req.method === "POST" && url === "/__codex/project-state") {
                        projectState = JSON.parse(await body(req));
                        res.end(JSON.stringify({ received: true }));
                        return;
                    }
                    if (req.method === "GET" && url === "/__codex/project-state") {
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify(projectState));
                        return;
                    }
                    if (req.method === "GET" && url.startsWith("/__codex/timeline-sequence/result/")) {
                        const id = decodeURIComponent(url.slice(url.lastIndexOf("/") + 1)), result = results.get(id) ?? null;
                        if (result)
                            results.delete(id);
                        res.setHeader("Content-Type", "application/json");
                        res.end(JSON.stringify(result));
                        return;
                    }
                    next();
                }
                catch (error) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
                }
            });
        } };
}
export default defineConfig({
    plugins: [react(), timelineSequenceBridge()],
    server: { proxy: { "/api": { target: "http://127.0.0.1:5175", changeOrigin: false } } },
});
