import {spawn,spawnSync} from 'node:child_process';
const children=[];let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children){if(!child.pid)continue;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}process.exit(code);}
for(const args of [['scripts/run-arcade-realtime.mjs','--port','5191'],['scripts/run-framework.mjs','dev','--port','5189']]){const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true,env:process.env});children.push(child);child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>{if(!closing)stop(code??1);});}
console.log('Cuộc đua giành khách: http://127.0.0.1:5189/arcade · realtime5191 · Ctrl+C để dừng.');
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
