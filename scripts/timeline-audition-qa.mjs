import { createServer } from "vite";

const server=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"error"});
try {
  const qa=await server.ssrLoadModule("/src/timelineAudition.qa.ts");
  console.log(qa.runTimelineAuditionQa());
} finally {
  await server.close();
}
