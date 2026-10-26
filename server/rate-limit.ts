import { database } from './room-store';
import { digest } from './capabilities';
import { GameError } from './game/types';
export async function enforceLimit(request:Request,kind:'create'|'join'|'recover'){
 // The Cloudflare edge supplies this trusted header. The loopback development server does not.
 const ip=request.headers.get('cf-connecting-ip');if(!ip)return;
 const now=Date.now(),window=kind==='create'?3600000:60000,max=kind==='create'?10:kind==='join'?300:30;
 const key=await digest(`${kind}:${ip}`);
 const row=await database().prepare('INSERT INTO request_limits (key,window_start_ms,hits) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN window_start_ms<=? THEN 1 ELSE hits+1 END,window_start_ms=CASE WHEN window_start_ms<=? THEN ? ELSE window_start_ms END WHERE window_start_ms<=? OR hits<? RETURNING hits').bind(key,now,now-window,now-window,now,now-window,max).first();
 if(!row)throw new GameError('RATE_LIMITED','Quá nhiều lần thử. Vui lòng chờ một lát.',429);
}
