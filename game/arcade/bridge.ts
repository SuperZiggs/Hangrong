import type {InputFrame,PublicSnapshot,Player} from '../../shared/arcade/types';
export type ArcadeBridge={read:()=>PublicSnapshot|null;subscribe:(fn:()=>void)=>()=>void;sendInput:(f:InputFrame)=>void;playerId:string|null;projector:boolean;muted:()=>boolean;predict?:()=>Player|null;reducedMotion?:()=>boolean};
