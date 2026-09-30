export type ProviderLandmark={x:number;y:number;z:number;visibility?:number};
export interface PoseProvider { readonly id:string; detect(video:HTMLVideoElement,timestampMs:number):ProviderLandmark[]|null; dispose?():void; }
export type PoseProviderFactory=()=>Promise<PoseProvider>;
