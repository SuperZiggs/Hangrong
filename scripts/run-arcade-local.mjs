import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const children=[];let closing=false;
const production=process.argv.includes('--production');
if(production&&!existsSync('dist/server/wrangler.json')){console.error('Chạy npm run build trước khi mở bản production local.');process.exit(1);}
const website=production?['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','5189','--inspector-port','0']:['scripts/run-framework.mjs','dev','--port','5189'];
function stop(code=0){if(closing)return;closing=true;for(const child of children){if(!child.pid)continue;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});else child.kill('SIGTERM');}process.exit(code);}
for(const args of [['scripts/run-arcade-realtime.mjs','--port','5191'],website]){const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true,env:process.env});children.push(child);child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>{if(!closing)stop(code??1);});}
console.log('Cuộc đua giành khách: http://127.0.0.1:5189/arcade · realtime5191 · Ctrl+C để dừng.');
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
