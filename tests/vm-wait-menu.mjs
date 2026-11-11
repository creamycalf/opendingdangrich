import {chromium} from '../app/node_modules/playwright/index.mjs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true});
try{const p=b.contexts()[0].pages()[0],start=Date.now(),context=process.argv[2];await p.waitForFunction(c=>globalThis.workerMenuState?.context===c&&workerMenuState.ready,context,{timeout:120000});console.log(JSON.stringify({context,waitedMs:Date.now()-start}));}finally{await b.close();}
