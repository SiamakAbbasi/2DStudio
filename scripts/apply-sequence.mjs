import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

const file=process.argv[2],base=(process.env.STUDIO_URL??"http://127.0.0.1:5173").replace(/\/$/,"");
if(!file){console.error("Usage: npm run sequence -- sequence.json");process.exit(2)}
if(file==="--status"){try{const response=await fetch(`${base}/__codex/project-state`),state=await response.json();console.log(JSON.stringify(state,null,2));process.exit(state?0:1)}catch(error){console.error(`Cannot read open Studio project: ${error.message}`);process.exit(1)}}
let sequence;
try{sequence=JSON.parse(await readFile(resolve(file),"utf8"))}catch(error){console.error(`Cannot read sequence: ${error.message}`);process.exit(2)}
if(!sequence||!Array.isArray(sequence.commands)){console.error("Sequence must contain a commands array.");process.exit(2)}
const requestId=`codex-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
try{
  const queued=await fetch(`${base}/__codex/timeline-sequence`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId,sequence})});
  if(!queued.ok)throw new Error(`Studio rejected request (${queued.status}): ${await queued.text()}`);
  process.stdout.write(`Queued ${sequence.commands.length} commands; waiting for Studio validation`);
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,350));const response=await fetch(`${base}/__codex/timeline-sequence/result/${encodeURIComponent(requestId)}`);if(!response.ok)continue;const result=await response.json();if(!result){process.stdout.write(".");continue}console.log();if(result.ok){console.log(`APPLIED ${result.commands} commands as one Undo transaction.`);process.exit(0)}console.error(result.error??"Sequence failed.");process.exit(1)}
  throw new Error("Timed out. Keep the Studio browser tab open while applying a sequence.");
}catch(error){console.error(`\nSequence not applied: ${error.message}`);process.exit(1)}
