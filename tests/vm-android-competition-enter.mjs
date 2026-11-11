import {chromium} from '../app/node_modules/playwright/index.mjs';
import {execFileSync} from 'node:child_process';
const b=await chromium.connectOverCDP('http://127.0.0.1:9271',{noDefaults:true});
try{
 const p=b.contexts()[0].pages()[0],adb=(...args)=>execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580',...args]);
 const touch=async(x,y)=>adb('shell','input','tap',String(Math.round(x)),String(Math.round(y)));
 const canvas=async(x,y,wait)=>{const r=await p.locator('canvas').boundingBox();await touch(r.x+x*r.width/640,r.y+y*r.height/480);await p.waitForTimeout(wait);};
 const tapControl=async(locator)=>{await locator.waitFor({state:'visible'});const r=await locator.boundingBox();await touch(r.x+r.width/2,r.y+r.height/2);};
 const select=async(seat)=>{
  const confirm=p.locator(`.doraSelection button[data-seat="${seat}"][data-action=confirm]`);
  if(!await confirm.isVisible()){
   const seatTab=p.locator(`.doraSelection [data-select-seat="${seat}"]`);
   if(!await seatTab.isVisible())await tapControl(p.locator('.doraSelectionToggle'));
   await tapControl(seatTab);
  }
  await tapControl(confirm);await p.waitForTimeout(1000);
 };
 await canvas(320,240,5000);await canvas(320,207,2500);await canvas(320,175,7000);
 await p.waitForFunction(()=>globalThis.workerSelectionState?.stage===0);
 for(let seat=0;seat<4;seat++)await select(seat);
 for(let seat=0;seat<4;seat++)await select(seat);
 await p.waitForFunction(()=>globalThis.workerSelectionState?.stage===2);
 const owner=await p.evaluate(()=>workerSelectionState.owner);await select(owner);
 console.log('Original competition entered by Android touch with four humans.');
}finally{await b.close();}
