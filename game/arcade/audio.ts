import type {PublicSnapshot} from '../../shared/arcade/types';
export type SoundSettings={muted:boolean;master:number;music:number;sfx:number};
export class ArcadeAudio{
 private settings:SoundSettings={muted:true,master:.7,music:.3,sfx:.7};private loop:HTMLAudioElement|null=null;private active=new Set<HTMLAudioElement>();private seen=new Set<string>();private mode='';private run='';private allowed=false;
 configure(settings:SoundSettings,gesture=false){this.settings=settings;this.allowed=this.allowed||gesture;this.volume();if(settings.muted){this.loop?.pause();for(const a of this.active)a.pause();this.active.clear();}else if(this.allowed)this.playLoop();}
 private volume(){if(this.loop)this.loop.volume=this.settings.master*this.settings.music;for(const a of this.active)a.volume=this.settings.master*this.settings.sfx;}
 private source(path:string){const a=new Audio();a.preload='none';a.src=`/arcade/assets/audio/${path}.${a.canPlayType('audio/ogg')?'ogg':'mp3'}`;return a;}
 private playLoop(){if(!this.mode||this.settings.muted||!this.allowed)return;if(!this.loop){this.loop=this.source(`music/${this.mode==='match'?'city':'menu'}-loop`);this.loop.loop=true;}this.volume();void this.loop.play().catch(()=>{});}
 cue(name:string){if(this.settings.muted||!this.allowed||this.settings.sfx===0||this.active.size>=5)return;const a=this.source(`sfx/${name}`);a.volume=this.settings.master*this.settings.sfx;this.active.add(a);const done=()=>{this.active.delete(a);a.onended=null;a.onerror=null;a.removeAttribute('src');};a.onended=done;a.onerror=done;void a.play().catch(done);}
 update(s:PublicSnapshot,self:string|null){const mode=s.phase==='lobby'?'menu':'match';if(mode!==this.mode){this.loop?.pause();this.loop=null;this.mode=mode;this.playLoop();}if(this.run!==s.runId){this.run=s.runId;this.seen.clear();}
  for(const e of s.events){if(this.seen.has(e.id))continue;this.seen.add(e.id);if(e.playerId&&e.playerId!==self)continue;const cues:Record<string,string>={dash:'dash',bump:'bump',pickup:'pickup',delivery:'delivery',promotion:'promo','route-unlock':'gate-open',warning:'event-warning','private-channel':'ui-confirm'};if(cues[e.kind]&&s.elapsedMs-e.at<1500)this.cue(cues[e.kind]);}if(this.seen.size>600)this.seen=new Set(s.events.map(e=>e.id));}
 dispose(){this.loop?.pause();if(this.loop)this.loop.src='';for(const a of this.active){a.pause();a.src='';}this.active.clear();}
}
