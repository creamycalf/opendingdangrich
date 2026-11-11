import {chromium} from '../app/node_modules/playwright/index.mjs';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const b=await chromium.connectOverCDP('http://127.0.0.1:9332');
try{
 const p=b.contexts()[0].pages()[0],cdp=await p.context().newCDPSession(p); const touch=async(x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}; const hit=async locator=>{const r=await locator.boundingBox();await touch(r.x+r.width/2,r.y+r.height/2);};
 const tap=async(x,y,ms=2000)=>{const r=await p.locator('canvas').boundingBox();await touch(r.x+x*r.width/640,r.y+y*r.height/480);await p.waitForTimeout(ms);};
 await tap(320,240,5000);await tap(320,207);await tap(320,175,6000);
 for(let n=0;n<2;n++)for(let seat=0;seat<4;seat++){await hit(p.locator(`.doraSelection button[data-seat="${seat}"][data-action=confirm]`));await p.waitForTimeout(600);}
 await p.waitForFunction(()=>workerSelectionState.stage===2);const owner=await p.evaluate(()=>workerSelectionState.owner);await hit(p.locator(`.doraSelection button[data-seat="${owner}"][data-action=confirm]`));
 let played=false,last=0;const deadline=Date.now()+360000;
 while(Date.now()<deadline){const m=await p.evaluate(()=>workerMiniState);
  if(m.ready&&Date.now()-last>2500){for(const seat of m.stageId===6?m.humanSeats.slice(0,1):m.humanSeats){await hit(p.locator(`.doraTouchPair button[data-seat="${seat}"][data-action=confirm]`));await p.waitForTimeout(200);}last=Date.now();}
  if(m.active){played=true;await hit(p.locator('.doraTouchPair button[data-seat="0"][data-action=left]'));}
  if(played&&!m.object){await p.waitForTimeout(5000);break;}await p.waitForTimeout(400);
 }
 const read=async()=>{execFileSync(process.execPath,['tests/vm-result-observe.mjs']);return JSON.parse(await readFile('test-results/vm-result-live.json','utf8'));};
 const states=[await read()];await hit(p.locator('.doraNavToggle'));await hit(p.locator('.doraNavGrid button[data-action=right]'));await p.waitForTimeout(1000);states.push(await read());
 await tap(280,425,1000);states.push(await read());await p.screenshot({path:'test-results/vm-result-diagnose.png'});await writeFile('test-results/vm-result-diagnose.json',JSON.stringify(states,null,2));console.log(states);
}finally{await b.close();}


