import {FilesetResolver,PoseLandmarker} from "@mediapipe/tasks-vision";
import type {PoseProvider} from "./poseProvider";
let providerPromise:Promise<PoseProvider>|null=null;
export function loadMediaPipePoseProvider(){
  providerPromise??=(async()=>{const vision=await FilesetResolver.forVisionTasks("/mediapipe/wasm");const landmarker=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"/mediapipe/models/pose_landmarker_lite.task",delegate:"CPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.45,minPosePresenceConfidence:.45,minTrackingConfidence:.45});return{id:"mediapipe-pose-lite",detect:(video,timestamp)=>landmarker.detectForVideo(video,timestamp).landmarks[0]??null,dispose:()=>landmarker.close()} satisfies PoseProvider;})();return providerPromise;
}
