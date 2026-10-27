import type {ArenaMap,Point,Rect,World} from './types';
export function generateMap(playerCount:number,seed:string):ArenaMap{
 const n=Math.max(3,playerCount),band=n<=6?0:n<=14?1:2;
 const width=Math.max([1920,2560,3200][band],(n+1)*100),height=[1280,1600,1920][band],riverY=Math.round(height*.5),riverHeight=128;
 const freeBridge={x:160,y:riverY,w:144,h:riverHeight},gate={x:width/2-24,y:riverY-12,w:48,h:riverHeight+24},sharedRouteRect={x:width-320,y:riverY,w:144,h:riverHeight};
 const gaps=[freeBridge,{...gate,y:riverY,h:riverHeight},sharedRouteRect].sort((a,b)=>a.x-b.x),walls:Rect[]=[];let cursor=0;
 for(const gap of gaps){if(gap.x>cursor)walls.push({x:cursor,y:riverY,w:gap.x-cursor,h:riverHeight});cursor=gap.x+gap.w;}
 if(cursor<width)walls.push({x:cursor,y:riverY,w:width-cursor,h:riverHeight});
 const cols=Math.min(n,Math.floor((width-160)/180)),shops:Point[]=[],spawns:Point[]=[];
 for(let i=0;i<n;i++){const row=Math.floor(i/cols),col=i%cols,x=110+col*(width-220)/Math.max(1,cols-1),y=120+row*220;shops.push({x,y});walls.push({x:x-58,y:y-108,w:116,h:116});}
 let hash=2166136261;for(const char of seed){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const offset=(hash>>>0)%37;
 const count=n,pickups:Point[]=[],deliveries:Point[]=[];
 for(let i=0;i<count;i++){const x=150+i*(width-300)/Math.max(1,count-1),y=riverY-150-offset;pickups.push({x,y});spawns.push({x,y:y-120});deliveries.push({x,y:riverY+riverHeight+180+(i%2)*70});}
 const stations:ArenaMap['stations']=shops.flatMap((home,ownerIndex)=>[{x:home.x-52,y:home.y+30,kind:'promotion' as const,ownerIndex},{x:home.x+52,y:home.y+30,kind:'private-channel' as const,ownerIndex}]);
 stations.push({kind:'contribution',x:width-248,y:riverY-76});
 return {width,height,walls,gate,sharedBarrier:{...sharedRouteRect},sharedRouteRect,freeBridge,shops,spawns,pickups,deliveries,centralDeliveries:[],stations,riverY,riverHeight};
}
export function activateCentralCustomers(world:World){
 if(world.elapsedMs<180000||world.map.centralDeliveries?.length)return false;
 const m=world.map,x=m.width/2,y=m.riverY+m.riverHeight;
 const centralDeliveries=[{x:x-132,y:y+350},{x,y:y+410},{x:x+132,y:y+350}];
 // Replace the map so a prior snapshot retains its pre-arrival map for deltas.
 world.map={...m,centralDeliveries,deliveries:[...m.deliveries,...centralDeliveries]};
 return true;
}
export const inRect=(p:Point,r:Rect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
