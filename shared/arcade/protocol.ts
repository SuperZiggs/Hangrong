import type {InputFrame,PublicSnapshot} from './types';
export type ClientMessage={type:'auth';token?:string}|{type:'input';input:InputFrame}|{type:'ping';id:string|number};
export type ServerMessage={type:'snapshot';snapshot:PublicSnapshot}|{type:'error';error:{code:string;message:string}}|{type:'pong';id:string|number};
