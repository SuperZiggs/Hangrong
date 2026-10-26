import { GameError } from './game/types';
import type { Room, Actor } from './game/types';
export async function digest(s:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function identify(r:Room,hash:string|null):Actor{
 if(!hash)return {role:'public'};
 if(hash===r.hostHash)return {role:'host'};
 const t=r.teams.find(t=>t.tokenHash===hash);
 if(t)return {role:'team',teamId:t.teamId};
 throw new GameError('UNAUTHORIZED','Phiên điều khiển không còn hợp lệ.',403);
}
export function requireHost(a:Actor){if(a.role!=='host')throw new GameError('HOST_ONLY','Chỉ MC được thực hiện thao tác này.',403);}
export function requireTeam(r:Room,a:Actor){if(a.role!=='team')throw new GameError('TEAM_ONLY','Cần phiên điều khiển của bạn.',403);const t=r.teams.find(t=>t.teamId===a.teamId);if(!t)throw new GameError('TEAM_MISSING','Lượt tham gia không còn trong phòng.',403);return t;}
