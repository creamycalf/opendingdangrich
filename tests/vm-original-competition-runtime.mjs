// Observe a real competition entered through the original menus; no save or RAM edits.
import {chromium} from '../app/node_modules/playwright/index.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const android=process.argv.includes('--android');
const out=process.env.VM_COMPETITION_OUT||(android?'test-results/vm-09-android-competition':'test-results/vm-original-competition');await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP(android?'http://127.0.0.1:9271':'http://127.0.0.1:9332',{noDefaults:true});
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes(android?'https://game.local':':9358/'));
const cdp=await page.context().newCDPSession(page),events=[],rounds=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>({mini:globalThis.workerMiniState,error:document.querySelector('output').textContent}));
const memory=async()=>android?{scope:'Production APK: UI state only',...await state()}:await(await fetch('http://127.0.0.1:9358/__qa/state')).json();
async function touch(x,y,held=0){
 if(android){const xy=[String(Math.round(x)),String(Math.round(y))];execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580','shell','input',...(held?['swipe',...xy,...xy,String(held)]:['tap',...xy])]);return;}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});try{if(held)await page.waitForTimeout(held);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
}
async function canvasTap(){
 const r=await page.locator('canvas').boundingBox();
 await touch(r.x+r.width*(android?280:220)/640,r.y+r.height*(android?425:240)/480);
}
async function flush(){await writeFile(`${out}/report.json`,JSON.stringify({status:'in-progress',scope:'Real menu competition, native timing, UI touch only; screenshot score review required',rounds,events,errors},null,2));}
let last='',stageSince=Date.now(),lastConfirm=0,finished=false;
try{
 const deadline=Date.now()+20*60*1000;
 while(Date.now()<deadline){
  const s=await state();if(s.error)throw Error(s.error);const m=s.mini||{};
  const id=JSON.stringify([m.context,m.gameId,m.stageId,m.active]);
  if(id!==last){last=id;stageSince=Date.now();events.push({at:new Date().toISOString(),...m});await page.screenshot({path:`${out}/stage-${events.length}-g${m.gameId}-s${m.stageId}.png`});console.log('Native stage',id);await flush();}
  if(m.active&&m.humanSeats?.length){
   const round={gameId:m.gameId,object:m.object,context:m.context,seat:m.humanSeats[0],start:new Date().toISOString(),before:await memory(),actions:0,samples:[]};rounds.push(round);
   await page.screenshot({path:`${out}/game-${m.gameId}-start.png`});
   for(const action of android?[]:['left','right']){
    if(!(await state()).mini?.active)break;
    const b=await page.locator(`.doraTouchPair button[data-seat="${round.seat}"][data-action="${action}"]`).boundingBox();if(!b)throw Error('Missing active touch control');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width/2,y:b.y+b.height/2}]});
    try{await page.waitForTimeout(600);round.samples.push({action,held:await memory()});await page.screenshot({path:`${out}/game-${m.gameId}-${action}-held.png`});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    await page.waitForTimeout(400);round.samples.at(-1).released=await memory();round.actions++;
   }
   while(Date.now()<deadline){
    const now=(await state()).mini;if(!now?.active||now.object!==m.object||now.gameId!==m.gameId)break;
    const action=round.actions%2?'right':'left',b=await page.locator(`.doraTouchPair button[data-seat="${round.seat}"][data-action="${action}"]`).boundingBox();if(!b)break;
    const hold=[0,4,7].includes(m.gameId)?350:30;await touch(b.x+b.width/2,b.y+b.height/2,hold);await page.waitForTimeout([1,5,6].includes(m.gameId)?300:100);round.actions++;
   }
   round.after=await memory();round.end=new Date().toISOString();round.nativeAfter=(await state()).mini;
   await page.screenshot({path:`${out}/game-${m.gameId}-finish.png`});console.log('Native round finished',m.gameId,'touches',round.actions);await flush();continue;
  }
  // Stage 10 is the observed original Push Button ready page. Stage 6 is
  // the observed RESULT page; a normal button press acknowledges that page.
  if(m.ready&&Date.now()-stageSince>1500&&Date.now()-lastConfirm>3000){
   for(const seat of m.stageId===6?m.humanSeats.slice(0,1):m.humanSeats){const b=page.locator(`.doraTouchPair button[data-seat="${seat}"][data-action="confirm"]`);if(await b.count()){const r=await b.boundingBox();if(r)await touch(r.x+r.width/2,r.y+r.height/2);}await page.waitForTimeout(200);}
   lastConfirm=Date.now();events.push({at:new Date().toISOString(),input:'original human ready/result confirmation',stage:m.stageId,gameId:m.gameId});await flush();
  }
  if(rounds.some(r=>r.gameId===Number(process.env.VM_COMPETITION_LAST_GAME??7))&&!m.object&&Date.now()-stageSince>4000){finished=true;break;}
  if(rounds.length&&!m.object&&Date.now()-stageSince>6000&&Date.now()-lastConfirm>4000){
   const resultPage=await page.evaluate(()=>{
    const p=document.querySelector('canvas').getContext('2d').getImageData(140,0,350,100).data;let blue=0,white=0;
    for(let i=0;i<p.length;i+=4){if(p[i+2]>130&&p[i]<90&&p[i+1]<110)blue++;if(p[i]>220&&p[i+1]>220&&p[i+2]>220)white++;}
    return blue>1800&&white>600;
   });
   if(resultPage){await canvasTap();lastConfirm=Date.now();events.push({at:new Date().toISOString(),input:'visible original overall round result confirmation'});await flush();}
  }
  await page.waitForTimeout(250);
 }
 const bs=await browser.newBrowserCDPSession(),targets=await bs.send('Target.getTargets');await bs.detach();
 const urls=[...(await page.evaluate(()=>Array.from(document.scripts,s=>s.src).filter(Boolean))),...targets.targetInfos.filter(t=>t.type==='worker'&&t.url.includes(android?'game.local':':9358/')).map(t=>t.url)];
 const bundles=await Promise.all(urls.map(async url=>({url,sha256:createHash('sha256').update(await readFile((process.env.QA_VM_ASSETS||'vm-app/src/main/assets')+new URL(url).pathname)).digest('hex')})));
 await page.screenshot({path:`${out}/final.png`});
 await writeFile(`${out}/report.json`,JSON.stringify({status:finished?'completed-awaiting-review':'timed-out',platform:android?'Android emulator-5580, ADB touch':'desktop browser, CDP touch',apk:android?JSON.parse(await readFile('test-results/vm-09-apk-validation-final.json','utf8')):null,bundles,rounds,events,errors},null,2));
 if(!finished)throw Error('Native competition did not reach its final menu within 20 minutes');
}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});await browser.close();}
