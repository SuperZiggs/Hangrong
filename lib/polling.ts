import type {Phase} from '../shared/game-contracts';
export function pollDelay(phase:Phase|undefined,hidden:boolean,invalid:boolean):number|null{
 if(invalid)return null;
 if(phase==='finished')return 15000;
 return hidden||phase==='lobby'?3000:1000;
}
