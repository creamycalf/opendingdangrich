import {chromium} from '../app/node_modules/playwright/index.mjs';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const [command='state',...args]=process.argv.slice(2),b=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true});
const adb=(...a)=>execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580',...a]);
try{
 const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://game.local'));
 if(command==='tap'){const r=await p.locator('canvas').boundingBox();adb('shell','input','tap',String(Math.round(r.x+Number(args[0])*r.width/640)),String(Math.round(r.y+Number(args[1])*r.height/480)));}
 if(command==='select'){const r=await p.locator(`.doraSelection button[data-seat="${args[0]}"][data-action="${args[1]}"]`).boundingBox();if(!r)throw Error('Missing selection action');adb('shell','input','tap',String(Math.round(r.x+r.width/2)),String(Math.round(r.y+r.height/2)));}
 if(command==='back')adb('shell','input','keyevent','KEYCODE_BACK');
 if(command==='nav'){
  const grid=p.locator('.doraNavGrid');if(!(await grid.isVisible())){const t=await p.locator('.doraNavToggle').boundingBox();adb('shell','input','tap',String(Math.round(t.x+t.width/2)),String(Math.round(t.y+t.height/2)));await p.waitForTimeout(200);}
  const r=await p.locator(`.doraNavGrid button[data-action="${args[0]}"]`).boundingBox();if(!r)throw Error('Missing navigation button');adb('shell','input','tap',String(Math.round(r.x+r.width/2)),String(Math.round(r.y+r.height/2)));
 }
 await p.waitForTimeout(Number(args.at(-1))||1000);
 const state=await p.evaluate(()=>({mini:globalThis.workerMiniState,selection:globalThis.workerSelectionState,record:globalThis.workerRecordState,focus:globalThis.workerFocusState,text:document.body.innerText,consumption:globalThis.lastTapConsumptionMs,viewport:[innerWidth,innerHeight],canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
 const name='test-results/vm-09-android-'+Date.now()+'-'+command;await p.screenshot({path:name+'.png'});await writeFile(name+'.json',JSON.stringify(state,null,2));console.log(JSON.stringify({file:name,state},null,2));
}finally{await b.close();}
