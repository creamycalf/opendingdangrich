import {chromium} from '../app/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const b=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true});
try{const p=b.contexts()[0].pages()[0],data=await p.evaluate(()=>({events:workerMenuInput,mini:workerMiniState,record:workerRecordState,error:document.querySelector('output').textContent}));console.log(JSON.stringify(data,null,2));await writeFile(process.argv[2]||'test-results/vm-13-menu-trace.json',JSON.stringify(data,null,2));}finally{await b.close();}
