import {chromium} from '../app/node_modules/playwright/index.mjs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true});
try{for(const p of b.contexts().flatMap(c=>c.pages()))console.log(await p.evaluate(()=>({url:location.href,hidden:document.hidden,nativePaused:globalThis.__doraNativePaused,focus:globalThis.workerFocusState,audioPaused:globalThis.workerAudioPaused,inputs:globalThis.workerInputCount,mini:globalThis.workerMiniState,text:document.body.innerText})));}finally{await b.close();}
