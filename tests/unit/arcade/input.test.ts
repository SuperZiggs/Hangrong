import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
async function inputClass(){expect(existsSync(resolve('game/arcade/input.ts')),'Missing keyboard input behavior').toBe(true);return (await import('../../../game/arcade/input')).InputState;}
describe('laptop action input',()=>{
 it('emits one action edge while a key is held',async()=>{const InputState=await inputClass(),s=new InputState();s.down('KeyE');s.down('Space');expect(s.frame('run',1)).toMatchObject({interactPressed:true,dashPressed:true});s.down('KeyE',true);expect(s.frame('run',2)).toMatchObject({interactPressed:false,dashPressed:false});s.up('KeyE');s.down('KeyE');expect(s.frame('run',3).interactPressed).toBe(true);});
 it('clears movement when focus leaves',async()=>{const InputState=await inputClass(),s=new InputState();s.down('KeyW');expect(s.frame('r',1).moveY).toBe(-1);s.clear();expect(s.frame('r',2)).toMatchObject({moveX:0,moveY:0,interactPressed:false,dashPressed:false});});
 it('maps arrows to the same intent as WASD',async()=>{const InputState=await inputClass(),a=new InputState(),b=new InputState();a.down('KeyD');a.down('KeyW');b.down('ArrowRight');b.down('ArrowUp');expect(a.frame('r',1)).toEqual(b.frame('r',1));});
});
