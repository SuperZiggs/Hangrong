import type {InputFrame} from '../../shared/arcade/types';
const keys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','KeyE','Space']);
export class InputState{
 private held=new Set<string>();private interact=false;private dash=false;
 down(code:string,repeat=false){if(!keys.has(code)||repeat||this.held.has(code))return;this.held.add(code);if(code==='KeyE')this.interact=true;if(code==='Space')this.dash=true;}
 up(code:string){this.held.delete(code);}
 clear(){this.held.clear();this.interact=false;this.dash=false;}
 frame(runId:string,seq:number):InputFrame{const h=(a:string,b:string)=>this.held.has(a)||this.held.has(b);const f:InputFrame={runId,seq,moveX:((h('KeyD','ArrowRight')?1:0)-(h('KeyA','ArrowLeft')?1:0)) as -1|0|1,moveY:((h('KeyS','ArrowDown')?1:0)-(h('KeyW','ArrowUp')?1:0)) as -1|0|1,interactPressed:this.interact,dashPressed:this.dash,abandonHeld:this.held.has('KeyE')};this.interact=false;this.dash=false;return f;}
}
export function bindKeyboard(state:InputState,blocked:()=>boolean,onMenu:(key:string)=>boolean|void){
 const typing=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable="true"]');
 const down=(e:KeyboardEvent)=>{if(e.code==='Escape'){if(!e.repeat&&onMenu(e.code)!==false)e.preventDefault();state.clear();return;}if(typing(e.target)){state.clear();return;}if(e.code==='Tab'){if(!e.repeat&&onMenu(e.code)!==false)e.preventDefault();state.clear();return;}if(blocked()){state.clear();return;}if(keys.has(e.code)){e.preventDefault();state.down(e.code,e.repeat);}};
 const up=(e:KeyboardEvent)=>state.up(e.code),clear=()=>state.clear(),focus=(e:FocusEvent)=>{if(typing(e.target))clear();};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);document.addEventListener('focusin',focus);
 return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);document.removeEventListener('focusin',focus);};
}
