// Continue the actual competition result, acknowledge each native record and
// enter initials using visible Android touch controls. Never modify saves/RAM.
import {chromium} from '../app/node_modules/playwright/index.mjs';
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
const out=process.env.VM_COMPETITION_OUT||'test-results/vm-10-android-competition';await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true}),events=[];
try{
 const p=browser.contexts()[0].pages()[0];
 const tap=async(x,y)=>execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580','shell','input','tap',String(Math.round(x)),String(Math.round(y))]);
 const state=()=>p.evaluate(()=>({record:workerRecordState,mini:workerMiniState,menu:globalThis.workerMenuState,error:document.querySelector('output').textContent}));
 async function canvas(x,y){const r=await p.locator('canvas').boundingBox();await tap(r.x+x*r.width/640,r.y+y*r.height/480);}
 async function nav(action){if(!(await p.locator('.doraNavGrid').isVisible())){const t=await p.locator('.doraNavToggle').boundingBox();await tap(t.x+t.width/2,t.y+t.height/2);await p.waitForTimeout(200);}const r=await p.locator(`.doraNavGrid button[data-action=${action}]`).boundingBox();if(!r)throw Error('Record touch navigation missing');await tap(r.x+r.width/2,r.y+r.height/2);await p.waitForTimeout(1100);}
 // Original final Continue=Yes enters the winner/record flow. No exits early.
 // Deliberately select No first, then tap the visible Yes label. This tests
 // selection correction, rather than confirming an already-selected default.
 if(!(await state()).record){
 await nav('right');await p.screenshot({path:out+'/result-no-selected.png'});
 await canvas(280,425);await p.waitForTimeout(4000);await p.screenshot({path:out+'/celebration.png'});
 for(let n=0;n<8&&!(await state()).record;n++){
  if((await state()).mini?.object)throw Error('Unexpected new mini game before the record flow');
  await canvas(320,240);await p.waitForTimeout(2000);
 }
 }
 const deadline=Date.now()+180000,done=new Set();let lastRecord=Date.now();
 while(Date.now()<deadline){
  const s=await state();if(s.error)throw Error(s.error);const r=s.record;
  if(r){
   lastRecord=Date.now();const key=r.context+':'+r.seat;
   if(!done.has(key)){
    events.push({...r,at:new Date().toISOString()});await p.screenshot({path:out+`/${key.replace(':','-')}.png`});
    if(r.context==='record-name'){
     // Use a distinct initial from earlier test candidates so a cold ranking
     // screenshot cannot be mistaken for an older successful registration.
     for(let n=0;n<5+r.seat;n++)await nav('right');
     for(let n=0;n<3;n++)await nav('confirm');
     await p.screenshot({path:out+`/name-${r.seat}-entered.png`});await nav('confirm');
    }else await nav('confirm');
    done.add(key);
   }
  }else if(done.size&&Date.now()-lastRecord>7000)break;
  await p.waitForTimeout(500);
 }
 await p.waitForFunction(()=>globalThis.workerMenuState?.context==='mini-title'&&workerMenuState.ready,{},{timeout:30000});
 await p.waitForTimeout(7000);const final=await state();await p.screenshot({path:out+'/returned-menu.png'});
 await writeFile(out+'/record-flow.json',JSON.stringify({events,final,scope:'ADB touch; original name selection and confirmation; final menu still requires visual review'},null,2));
 if(final.record)throw Error('Record screen did not exit');
 if(final.menu?.context!=='mini-title'||final.mini?.object)throw Error('A stale input left the returned menu');
 if(!events.some(e=>e.context==='record-name'))throw Error('No actual record name screen was exercised');
 console.log(JSON.stringify({recordScreens:events.length,final}));
}finally{await browser.close();}
