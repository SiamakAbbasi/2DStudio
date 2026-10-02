import assert from "node:assert/strict";
import {duplicateEntries} from "../src/timelineAuthoring";
const pose={root:{x:1,y:2}},source={id:"a",time:1,pose,easing:"linear",source:"AUTO_MOTION",autoMotionGroupId:"g"},path={...source,id:"b",time:1.2,source:"MOTION_PATH",motionPathId:"p"};
let id=0;const first=duplicateEntries([{track:"a",key:source}],1.08,()=>`n${++id}`);assert.equal(first[0].key.time,1.08);assert.notEqual(first[0].key.pose,source.pose);assert.equal(first[0].key.source,undefined);assert.equal(first[0].key.autoMotionGroupId,undefined);
const second=duplicateEntries(first,1.16,()=>`n${++id}`),third=duplicateEntries(second,1.24,()=>`n${++id}`);assert.equal(second[0].key.time,1.16);assert.equal(third[0].key.time,1.24);
const multi=duplicateEntries([{track:"a",key:source},{track:"a",key:path}],2,()=>`n${++id}`);assert.deepEqual(multi.map(x=>x.key.time),[2,2.2]);assert(multi.every(x=>!x.key.source&&!x.key.motionPathId&&!x.key.autoMotionGroupId));
console.log("PASS: 1.000→1.080→1.160→1.240; deep copies; multi-key spacing; Auto Motion/Path ownership detached");
