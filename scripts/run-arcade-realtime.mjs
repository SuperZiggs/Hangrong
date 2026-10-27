import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const args=process.argv.slice(2),value=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const port=value('--port','5191'),ip=value('--ip','127.0.0.1');
if(!/^\d+$/.test(port)||Number(port)<1024||Number(port)>65535)throw new Error('Invalid port');
const env={...process.env,WRANGLER_LOG_PATH:resolve('.wrangler/arcade-realtime.log')};
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'dev','--local','--config','realtime/wrangler.jsonc','--persist-to','.wrangler/arcade-state','--port',port,'--ip',ip,'--inspector-port','0'],{cwd:fileURLToPath(new URL('..',import.meta.url)),env,stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??1));
