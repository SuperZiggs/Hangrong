'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {RoomView} from '../shared/game-contracts';
import {gameApi,ApiError} from '../lib/game-api';
import {pollDelay} from '../lib/polling';
export function useRoom(code:string,token:string|null){
 const [snapshot,setSnapshot]=useState<RoomView|null>(null),[connection,setConnection]=useState<'connecting'|'online'|'offline'|'invalid'>('connecting'),[error,setError]=useState('');
 const active=useRef(true),busy=useRef(false);
 const pollState=useRef({phase:snapshot?.phase,invalid:false});pollState.current={phase:snapshot?.phase,invalid:connection==='invalid'};
 const accept=useCallback((next:RoomView)=>setSnapshot(old=>old&&old.runId===next.runId&&(old.roomVersion>next.roomVersion||(old.roomVersion===next.roomVersion&&old.serverNowMs>next.serverNowMs))?old:next),[]);
 const refresh=useCallback(async()=>{
  if(busy.current)return;
  if(!navigator.onLine){setConnection('offline');return;}
  busy.current=true;
  try{const next=await gameApi<RoomView>(`/api/rooms/${code}/state`,token);if(active.current){accept(next);setConnection('online');setError('');}}
  catch(e){if(active.current){if(e instanceof ApiError&&[401,403,404,410].includes(e.status)){setConnection('invalid');setError(e.message);}else{setConnection('offline');setError('Mất kết nối. Tiến độ đã xác nhận vẫn được giữ.');}}}
  finally{busy.current=false;}
 },[code,token,accept]);
 useEffect(()=>{
  active.current=true;let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
  const poll=async()=>{clearTimeout(timer);await refresh();if(stopped)return;const delay=pollDelay(pollState.current.phase,document.hidden,pollState.current.invalid);clearTimeout(timer);if(delay!==null)timer=setTimeout(()=>void poll(),delay);};
  const online=()=>void poll(),visible=()=>{if(!document.hidden)void poll();},offline=()=>setConnection('offline');
  void poll();window.addEventListener('online',online);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;active.current=false;clearTimeout(timer);window.removeEventListener('online',online);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 return {snapshot,accept,connection,error,refresh};
}
