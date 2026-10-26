import type { Mission } from '../content/types';
import type { Draft } from '../../shared/game-contracts';
export type TeamRound={mission:Mission;draft:Draft;locked:boolean;graded:boolean;score:number;correctCount:number};
export type Team={teamId:string;slot:number;name:string;tokenHash:string;rounds:TeamRound[];recovery?:{hash:string;expiresAtMs:number}};
export type Room={id:string;code:string;hostHash:string;createRequestId:string;createdAtMs:number;expiresAtMs:number;version:number;runId:string|null;seed:string|null;startedAtMs:number|null;pausedAtMs:number|null;pausedMs:number;teams:Team[];receipts:Record<string,{action:string;reply:Record<string,unknown>}>};
export type Actor={role:'public'}|{role:'host'}|{role:'team';teamId:string};
export class GameError extends Error {constructor(public code:string, message:string,public status=409){super(message);}}
